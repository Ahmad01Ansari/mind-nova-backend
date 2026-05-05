const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.recoverySession.count();
  console.log('RecoverySession count:', count);
  const sessions = await prisma.recoverySession.findMany();
  console.log('Sessions:', JSON.stringify(sessions, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
