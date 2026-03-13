'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const r1 = await prisma.user.updateMany({ where: { profileImage: { contains: 'cloudinary' } }, data: { profileImage: null } });
  const r2 = await prisma.user.updateMany({ where: { truckImage: { contains: 'cloudinary' } }, data: { truckImage: null } });
  const r3 = await prisma.provider.updateMany({ where: { image: { contains: 'cloudinary' } }, data: { image: null } });
  const r4 = await prisma.merchantPost.updateMany({ where: { image: { contains: 'cloudinary' } }, data: { image: null } });
  const r5 = await prisma.merchantGoodsPost.updateMany({ where: { image: { contains: 'cloudinary' } }, data: { image: null } });

  console.log('Cleared:');
  console.log(' ', r1.count, 'profile images');
  console.log(' ', r2.count, 'truck images');
  console.log(' ', r3.count, 'provider images');
  console.log(' ', r4.count, 'merchant post images');
  console.log(' ', r5.count, 'merchant goods post images');

  await prisma.$disconnect();
}

run().catch(console.error);
