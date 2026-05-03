import { PrismaClient } from '@prisma/client';

async function check() {
  const prisma = new PrismaClient();
  const report = await prisma.weeklyReport.findFirst({
    orderBy: { createdAt: 'desc' },
  });
  console.log(JSON.stringify(report, null, 2));
  await prisma.$disconnect();
}
check();
