const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const userCount = await prisma.user.count()
  const moodCount = await prisma.moodLog.count()
  const assessmentCount = await prisma.assessmentScore.count()
  
  console.log("--- Data Status Report ---")
  console.log(`Users: ${userCount}`)
  console.log(`Mood Logs: ${moodCount}`)
  console.log(`Assessment Scores: ${assessmentCount}`)
  
  if (moodCount > 0) {
    const latestMood = await prisma.moodLog.findFirst({ orderBy: { createdAt: 'desc' } })
    console.log(`Latest Mood Log: ${latestMood.createdAt} by UserID: ${latestMood.userId}`)
  }
}

main().finally(() => prisma.$disconnect())
