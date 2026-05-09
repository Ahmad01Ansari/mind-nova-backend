const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log("No user found.");
    return;
  }
  
  try {
    const entry = await prisma.journalEntry.create({
      data: {
        userId: user.id,
        title: "Test",
        content: "This is a test content.",
        journalType: "FREE_WRITE",
        wordCount: 5,
        isDraft: false,
        tags: { create: [] }
      },
      include: { tags: true }
    });
    console.log("Create OK:", entry.id);
    
    const updated = await prisma.journalEntry.update({
      where: { id: entry.id },
      data: {
        title: "Updated Title",
        content: "Updated content",
        isDraft: false,
        wordCount: 2,
      },
      include: { tags: true, aiInsights: true }
    });
    console.log("Update OK:", updated.id);
  } catch (err) {
    console.error("Prisma Error:", err);
  }
}
main().finally(() => prisma.$disconnect());
