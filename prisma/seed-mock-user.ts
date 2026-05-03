import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding mock user for testing...');

  const userId = 'mock_user_123';
  
  const user = await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      email: 'mock@mindnova.com',
      role: Role.USER,
    },
  });

  console.log(`Mock user created/verified: ${user.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
