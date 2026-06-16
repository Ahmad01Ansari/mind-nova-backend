import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  try {
    await prisma.groundingSession.create({
      data: {
        userId: 'f8eb82f9-c9c1-499d-9dda-4c204c9f9b76',
        exerciseType: 'SENSORY_54321',
        environment: null,
        durationSecs: 60,
        calmBefore: null,
        calmAfter: null,
        wouldRepeat: null,
        completedFull: true,
      },
    });
    console.log("Success");
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
