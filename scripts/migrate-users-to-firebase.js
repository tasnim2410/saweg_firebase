/**
 * One-time migration script: import all existing PostgreSQL users into Firebase Auth,
 * preserving their bcrypt-hashed passwords, then write the Firebase UID back to User.firebaseUid.
 *
 * Run AFTER:
 *   1. Cloud SQL has the Railway data imported
 *   2. Prisma migration (add firebaseUid, nullable passwordHash) has been applied
 *   3. Firebase Auth Email/Password sign-in is enabled
 *
 * Usage:
 *   node scripts/migrate-users-to-firebase.js
 *
 * Required environment variables (set in .env.local or export before running):
 *   DATABASE_URL
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY
 */

'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { PrismaClient } = require('@prisma/client');

// ── Init ────────────────────────────────────────────────────────────────────

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const adminAuth = getAuth(app);
const prisma = new PrismaClient();

// ── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getFirebaseUid(user) {
  // Look up the Firebase user we just imported by email or phone
  try {
    if (user.email) {
      const fb = await adminAuth.getUserByEmail(user.email);
      return fb.uid;
    }
    if (user.phone) {
      const fb = await adminAuth.getUserByPhoneNumber(user.phone);
      return fb.uid;
    }
  } catch (err) {
    console.error(`  Could not look up Firebase UID for user ${user.id}:`, err.message);
  }
  return null;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log('Fetching users without firebaseUid...');

  const users = await prisma.user.findMany({
    where: { firebaseUid: null },
    select: {
      id: true,
      email: true,
      phone: true,
      fullName: true,
      passwordHash: true,
      type: true,
    },
  });

  console.log(`Found ${users.length} users to migrate.\n`);

  if (users.length === 0) {
    console.log('Nothing to do.');
    await prisma.$disconnect();
    return;
  }

  const BATCH_SIZE = 1000;
  let totalSuccess = 0;
  let totalFail = 0;

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (users ${i + 1}–${i + batch.length})...`);

    const importUsers = batch
      .filter(u => u.email || u.phone) // Firebase requires at least one identifier
      .map(u => ({
        uid: u.id, // Use the existing DB id as Firebase UID (CUID, 25 chars)
        ...(u.email ? { email: u.email } : {}),
        ...(u.phone ? { phoneNumber: u.phone } : {}),
        displayName: u.fullName,
        disabled: false,
        // Preserve the existing bcrypt hash so users can log in with their current password
        ...(u.passwordHash
          ? { passwordHash: Buffer.from(u.passwordHash, 'utf8') }
          : {}),
        customClaims: {
          userType: u.type,
          internalId: u.id,
          ...(u.type === 'ADMIN' ? { admin: true } : {}),
        },
      }));

    const skipped = batch.length - importUsers.length;
    if (skipped > 0) {
      console.warn(`  Skipping ${skipped} users with no email or phone.`);
    }

    if (importUsers.length === 0) continue;

    const result = await adminAuth.importUsers(importUsers, {
      hash: {
        algorithm: 'BCRYPT',
      },
    });

    totalSuccess += result.successCount;
    totalFail += result.failureCount;

    console.log(`  Imported: ${result.successCount} ok, ${result.failureCount} failed`);
    if (result.errors.length > 0) {
      for (const e of result.errors) {
        const u = importUsers[e.index];
        console.error(`    [${u?.email ?? u?.phoneNumber}] ${e.error?.message}`);
      }
    }

    // Write Firebase UIDs back to DB (uid === user.id since we set it explicitly)
    for (const user of batch.filter(u => u.email || u.phone)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { firebaseUid: user.id },
      });
    }
    console.log(`  Linked ${batch.filter(u => u.email || u.phone).length} users in DB.`);
  }

  console.log(`\nMigration complete: ${totalSuccess} imported, ${totalFail} failed.`);

  // Verify coverage
  const remaining = await prisma.user.count({ where: { firebaseUid: null } });
  if (remaining > 0) {
    console.warn(`\nWARNING: ${remaining} users still have no firebaseUid. Re-run the script to retry.`);
  } else {
    console.log('All users have been linked to Firebase Auth.');
  }

  await prisma.$disconnect();
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
