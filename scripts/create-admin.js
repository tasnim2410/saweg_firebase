const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdminAccount(fullName, email, phone, password) {
  try {
    // Check if email or phone already exists
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          email ? { email } : undefined,
          phone ? { phone } : undefined,
        ].filter(Boolean),
      },
    });

    if (existing) {
      console.log('Error: Email or phone already in use');
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create admin user
    const user = await prisma.user.create({
      data: {
        fullName,
        email: email || null,
        phone: phone || null,
        passwordHash,
        type: 'ADMIN',
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        type: true,
        createdAt: true,
      },
    });

    console.log('✓ Admin account created successfully!');
    console.log('  ID:', user.id);
    console.log('  Name:', user.fullName);
    console.log('  Email:', user.email);
    console.log('  Phone:', user.phone);
    console.log('  Type:', user.type);
    console.log('');
    console.log('You can now log in with your email/phone and password.');
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get arguments
const [fullName, email, phone, password] = process.argv.slice(2);

if (!fullName || !password || (!email && !phone)) {
  console.log('Usage: node create-admin.js <full-name> <email> <phone> <password>');
  console.log('       (provide either email or phone, or both)');
  console.log('');
  console.log('Example: node create-admin.js "Admin User" admin@example.com "" mypassword123');
  console.log('Example: node create-admin.js "Admin User" "" +218123456789 mypassword123');
  console.log('Example: node create-admin.js "Admin User" admin@example.com +218123456789 mypassword123');
  process.exit(1);
}

createAdminAccount(fullName, email || null, phone || null, password);
