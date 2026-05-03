const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

async function main() {
  const userId = 'mock_user_123';
  const email = 'mockuser@example.com';

  // 1. Upsert the User
  const user = await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      email: email,
      role: 'USER',
      profile: {
        create: {
          firstName: 'Mock',
          lastName: 'User',
        }
      }
    }
  });

  console.log('User synced:', user);

  // 2. Generate a valid JWT matching the .env secret
  const secret = process.env.JWT_SECRET || 'secret';
  console.log('Using secret:', secret);
  
  const token = jwt.sign(
    { sub: userId, email: email, role: 'USER' },
    secret,
    { expiresIn: '365d' } // 1 year mock token
  );

  console.log('\n--- NEW MOCK TOKEN ---');
  console.log(token);
  console.log('----------------------\n');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
