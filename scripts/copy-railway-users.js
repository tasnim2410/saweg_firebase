'use strict';

/**
 * Copies users (and their related records) that exist in Railway but not in Cloud SQL.
 *
 * Usage:
 *   SOURCE_DATABASE_URL="postgresql://..." node scripts/copy-railway-users.js
 *
 * - DATABASE_URL        → Cloud SQL (target)  — loaded from .env.local
 * - SOURCE_DATABASE_URL → Railway (source)    — passed as env var or added to .env.local temporarily
 *
 * Safe to run multiple times — skips users already present in Cloud SQL.
 * After this script, run: node scripts/migrate-users-to-firebase.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const { PrismaClient } = require('@prisma/client');

const SOURCE_URL = process.env.SOURCE_DATABASE_URL;
const TARGET_URL = process.env.DATABASE_URL;

if (!SOURCE_URL) {
  console.error('ERROR: SOURCE_DATABASE_URL is not set.');
  console.error('  export SOURCE_DATABASE_URL="postgresql://..." before running this script.');
  process.exit(1);
}
if (!TARGET_URL) {
  console.error('ERROR: DATABASE_URL is not set (should be in .env.local).');
  process.exit(1);
}

const source = new PrismaClient({ datasources: { db: { url: SOURCE_URL } } });
const target = new PrismaClient({ datasources: { db: { url: TARGET_URL } } });

async function run() {
  // ── 1. Find which user IDs already exist in Cloud SQL ──────────────────────
  console.log('Fetching existing user IDs from Cloud SQL...');
  const existingRows = await target.user.findMany({ select: { id: true } });
  const existingIds = new Set(existingRows.map((r) => r.id));
  console.log(`  ${existingIds.size} users already in Cloud SQL.\n`);

  // ── 2. Fetch all users from Railway ────────────────────────────────────────
  console.log('Fetching all users from Railway...');
  const railwayUsers = await source.user.findMany();
  const newUsers = railwayUsers.filter((u) => !existingIds.has(u.id));
  console.log(`  ${railwayUsers.length} total in Railway, ${newUsers.length} not yet in Cloud SQL.\n`);

  if (newUsers.length === 0) {
    console.log('Nothing to copy. All Railway users are already in Cloud SQL.');
    return;
  }

  // ── 3. Copy users ──────────────────────────────────────────────────────────
  console.log(`Copying ${newUsers.length} users...`);
  let userOk = 0;
  let userSkip = 0;

  for (const u of newUsers) {
    try {
      await target.user.create({ data: u });
      userOk++;
    } catch (err) {
      // email/phone unique constraint — someone registered on both systems
      console.warn(`  SKIP user ${u.id} (${u.email ?? u.phone}): ${err.message.split('\n')[0]}`);
      userSkip++;
    }
  }
  console.log(`  Users copied: ${userOk}, skipped: ${userSkip}\n`);

  // Collect IDs that were actually inserted
  const copiedIds = newUsers
    .filter((u) => {
      // Re-check: may have been skipped due to conflict
    })
    .map((u) => u.id);

  // More reliable: re-query which of the newUsers now exist
  const nowExist = new Set(
    (await target.user.findMany({
      where: { id: { in: newUsers.map((u) => u.id) } },
      select: { id: true },
    })).map((r) => r.id)
  );

  const insertedIds = newUsers.map((u) => u.id).filter((id) => nowExist.has(id));
  console.log(`${insertedIds.length} user IDs confirmed in Cloud SQL.\n`);

  if (insertedIds.length === 0) return;

  // ── 4. Copy related records ────────────────────────────────────────────────

  // Providers
  const providers = await source.provider.findMany({ where: { userId: { in: insertedIds } } });
  console.log(`Copying ${providers.length} Provider records...`);
  let provOk = 0;
  for (const p of providers) {
    const { id, ...data } = p; // omit integer PK — let target sequence assign new ID
    try {
      await target.provider.create({ data });
      provOk++;
    } catch (err) {
      console.warn(`  SKIP provider (user ${p.userId}): ${err.message.split('\n')[0]}`);
    }
  }
  console.log(`  ${provOk}/${providers.length} copied.\n`);

  // MerchantPosts
  const mPosts = await source.merchantPost.findMany({ where: { userId: { in: insertedIds } } });
  console.log(`Copying ${mPosts.length} MerchantPost records...`);
  let mpOk = 0;
  for (const p of mPosts) {
    const { id, ...data } = p;
    try {
      await target.merchantPost.create({ data });
      mpOk++;
    } catch (err) {
      console.warn(`  SKIP merchantPost (user ${p.userId}): ${err.message.split('\n')[0]}`);
    }
  }
  console.log(`  ${mpOk}/${mPosts.length} copied.\n`);

  // MerchantGoodsPosts
  const gPosts = await source.merchantGoodsPost.findMany({ where: { userId: { in: insertedIds } } });
  console.log(`Copying ${gPosts.length} MerchantGoodsPost records...`);
  let gpOk = 0;
  for (const p of gPosts) {
    const { id, ...data } = p;
    try {
      await target.merchantGoodsPost.create({ data });
      gpOk++;
    } catch (err) {
      console.warn(`  SKIP merchantGoodsPost (user ${p.userId}): ${err.message.split('\n')[0]}`);
    }
  }
  console.log(`  ${gpOk}/${gPosts.length} copied.\n`);

  // PushSubscriptions
  const subs = await source.pushSubscription.findMany({ where: { userId: { in: insertedIds } } });
  console.log(`Copying ${subs.length} PushSubscription records...`);
  let subOk = 0;
  for (const s of subs) {
    try {
      await target.pushSubscription.create({ data: s });
      subOk++;
    } catch (err) {
      console.warn(`  SKIP pushSubscription (user ${s.userId}): ${err.message.split('\n')[0]}`);
    }
  }
  console.log(`  ${subOk}/${subs.length} copied.\n`);

  // Locations
  const locations = await source.location.findMany({ where: { userId: { in: insertedIds } } });
  console.log(`Copying ${locations.length} Location records...`);
  let locOk = 0;
  for (const l of locations) {
    try {
      await target.location.create({ data: l });
      locOk++;
    } catch (err) {
      console.warn(`  SKIP location (user ${l.userId}): ${err.message.split('\n')[0]}`);
    }
  }
  console.log(`  ${locOk}/${locations.length} copied.\n`);

  // ── 5. Summary ─────────────────────────────────────────────────────────────
  console.log('=== Done ===');
  console.log(`Users copied to Cloud SQL: ${userOk}`);
  console.log('');
  console.log('Next step: run the Firebase Auth migration:');
  console.log('  node scripts/migrate-users-to-firebase.js');
}

run()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await source.$disconnect();
    await target.$disconnect();
  });
