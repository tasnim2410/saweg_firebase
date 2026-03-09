/**
 * One-time migration script: download all Cloudinary images and re-upload to Firebase Storage.
 * Updates the database records to point to the new Firebase Storage URLs.
 *
 * Run AFTER:
 *   1. Cloud SQL has the Railway data imported
 *   2. Firebase Storage bucket exists and storage.rules deployed
 *   3. lib/firebase-admin.ts env vars are configured
 *
 * Usage:
 *   node scripts/migrate-images.js
 *
 * Required environment variables (set in .env.local or export before running):
 *   DATABASE_URL
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY
 *   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
 */

'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const https = require('https');
const http = require('http');
const { initializeApp, cert } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');
const { PrismaClient } = require('@prisma/client');

// ── Init ────────────────────────────────────────────────────────────────────

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
});

const storage = getStorage(app);
const prisma = new PrismaClient();

// ── Helpers ─────────────────────────────────────────────────────────────────

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, res => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        res.resume();
        return;
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function guessContentType(url) {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
  const map = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif' };
  return map[ext] ?? 'image/jpeg';
}

async function migrateField({ model, idField, imageField, folder }) {
  console.log(`\n── ${model}.${imageField} ──`);

  const records = await prisma[model].findMany({
    where: { [imageField]: { startsWith: 'https://res.cloudinary.com' } },
    select: { [idField]: true, [imageField]: true },
  });

  console.log(`  Found ${records.length} Cloudinary images to migrate.`);
  if (records.length === 0) return;

  let ok = 0;
  let fail = 0;

  for (const record of records) {
    const cloudinaryUrl = record[imageField];
    const id = record[idField];

    try {
      const buffer = await downloadBuffer(cloudinaryUrl);
      const contentType = guessContentType(cloudinaryUrl);
      const ext = contentType.split('/')[1] ?? 'jpg';
      const filename = `${folder}/${id}-${Date.now()}.${ext}`;

      const bucket = storage.bucket();
      const file = bucket.file(filename);

      await file.save(buffer, { metadata: { contentType } });
      await file.makePublic();

      const newUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

      await prisma[model].update({
        where: { [idField]: id },
        data: { [imageField]: newUrl },
      });

      console.log(`  [ok] ${id}: ${cloudinaryUrl.slice(0, 60)}... → ${newUrl}`);
      ok++;
    } catch (err) {
      console.error(`  [fail] ${id}: ${err.message}`);
      fail++;
    }
  }

  console.log(`  Done: ${ok} migrated, ${fail} failed.`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log('Starting Cloudinary → Firebase Storage image migration...\n');

  await migrateField({ model: 'user', idField: 'id', imageField: 'profileImage', folder: 'saweg/profiles' });
  await migrateField({ model: 'user', idField: 'id', imageField: 'truckImage', folder: 'saweg/users' });
  await migrateField({ model: 'provider', idField: 'id', imageField: 'image', folder: 'saweg/providers' });
  await migrateField({ model: 'merchantPost', idField: 'id', imageField: 'image', folder: 'saweg/merchant-posts' });
  await migrateField({ model: 'merchantGoodsPost', idField: 'id', imageField: 'image', folder: 'saweg/merchant-goods-posts' });

  console.log('\nImage migration complete.');

  // Summary: count remaining Cloudinary URLs
  const remaining = await prisma.$queryRaw`
    SELECT
      (SELECT COUNT(*) FROM "User" WHERE "profileImage" LIKE '%cloudinary%') AS users_profile,
      (SELECT COUNT(*) FROM "User" WHERE "truckImage" LIKE '%cloudinary%') AS users_truck,
      (SELECT COUNT(*) FROM "Provider" WHERE image LIKE '%cloudinary%') AS providers,
      (SELECT COUNT(*) FROM "MerchantPost" WHERE image LIKE '%cloudinary%') AS merchant_posts,
      (SELECT COUNT(*) FROM "MerchantGoodsPost" WHERE image LIKE '%cloudinary%') AS merchant_goods_posts
  `;
  console.log('\nRemaining Cloudinary URLs:', remaining[0]);

  await prisma.$disconnect();
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
