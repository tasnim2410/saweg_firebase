const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteUserByEmailOrPhone(identifier) {
  try {
    // Find user by email or phone
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { phone: identifier },
        ],
      },
      select: {
        id: true,
        email: true,
        phone: true,
        fullName: true,
        type: true,
      },
    });

    if (!user) {
      console.log('User not found:', identifier);
      return;
    }

    console.log('Found user:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Name: ${user.fullName}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Phone: ${user.phone}`);
    console.log(`  Type: ${user.type}`);

    // Delete user - cascade will remove all related data
    await prisma.user.delete({
      where: { id: user.id },
    });

    console.log('✓ User deleted successfully');
    console.log('All related data (providers, posts, subscriptions) has been removed.');
  } catch (error) {
    console.error('Error deleting user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get identifier from command line argument
const identifier = process.argv[2];

if (!identifier) {
  console.log('Usage: node delete-user.js <email-or-phone>');
  console.log('Example: node delete-user.js admin@example.com');
  console.log('Example: node delete-user.js +218123456789');
  process.exit(1);
}

deleteUserByEmailOrPhone(identifier);
