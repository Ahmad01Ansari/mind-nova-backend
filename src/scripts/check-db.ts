import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const assessments = await prisma.assessment.findMany();
  console.log(`Total assessments in DB: ${assessments.length}`);
  assessments.forEach(a => console.log(`- ${a.id}: ${a.title}`));
  await prisma.$disconnect();
}

main();
