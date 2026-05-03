const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://ahmad:sk_7VoonaJvfl-SeLXzncT23@127.0.0.1:5432/mindnova?schema=public' });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany({ select: { id: true, email: true }, take: 5 });
  console.log('Users:', JSON.stringify(users, null, 2));

  if (users.length === 0) {
    console.log('No users found. Nothing to seed.');
    return;
  }

  const userId = users[0].id;
  const logCount = await prisma.moodLog.count({ where: { userId } });
  console.log(`User ${userId} has ${logCount} mood logs.`);

  const existing = await prisma.weeklyReport.findFirst({ where: { userId } });
  if (existing) {
    console.log('Report already exists:', existing.id);
  } else {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const report = await prisma.weeklyReport.create({
      data: {
        userId,
        weekStartDate: sevenDaysAgo,
        weekEndDate: new Date(),
        avgMoodScore: 3.4,
        avgSleepHours: 6.5,
        emotionalVolatility: 1.12,
        burnoutRisk: 0.45,
        aiSummary: "This week showed a pattern of improving mood toward the weekend, though Monday and Tuesday were notably lower due to a combination of poor sleep (averaging 5.2 hours) and elevated stress markers. Your journaling entries on Wednesday indicated a conscious effort to re-engage with breathing exercises, which correlated with a measurable uptick in your mood scores from 2 to 4 over the following days.\n\nThe data suggests that your emotional recovery mechanisms are functioning well when activated, but the early-week vulnerability window remains a concern. Prioritizing sleep hygiene on Sunday nights and scheduling brief mindfulness sessions before work on Mondays could help stabilize this pattern.",
        aiRecommendations: [
          "Start a 10-minute guided meditation on Sunday evenings to prepare for the week ahead.",
          "Set a consistent sleep schedule aiming for 7.5 hours — your mood scores jump 40% on days with adequate rest.",
          "Consider journaling for 5 minutes each morning to process overnight stress before it accumulates."
        ],
        crisisRiskLevel: "LOW"
      }
    });
    console.log('Created test report:', report.id);
  }

  await prisma.$disconnect();
  pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
