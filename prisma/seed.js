const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const admins = [
    {
      email: 'tasnim@email.com',
      fullName: 'Tasnim (Admin)',
      password: process.env.ADMIN_TASNIM_PASSWORD || '123456',
    },
    {
      email: 'riath@email.com',
      fullName: 'Riath (Admin)',
      password: process.env.ADMIN_RIATH_PASSWORD || '123456',
    },
  ];

  for (const admin of admins) {
    const passwordHash = await bcrypt.hash(admin.password, 10);

    await prisma.user.upsert({
      where: { email: admin.email },
      update: {
        fullName: admin.fullName,
        passwordHash,
        type: 'ADMIN',
      },
      create: {
        fullName: admin.fullName,
        email: admin.email,
        passwordHash,
        type: 'ADMIN',
      },
    });

    console.log(`Seeded admin user: ${admin.email} (password: ${admin.password})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
