import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function main() {
  console.log('Seeding 20 Community Rooms...');

  // Clean existing rooms to avoid duplicates if re-running
  await prisma.communityRoom.deleteMany();

  const roomsData = [
    // Live Now (Exactly 2 for balance)
    { title: 'Anxiety Reset Circle', category: 'Anxiety', hostType: 'THERAPIST', hostName: 'Dr. Sarah', isLive: true, startsAt: new Date(), maxParticipants: 50 },
    { title: 'Breakup Healing Circle', category: 'Relationships', hostType: 'MODERATOR', hostName: 'MindNova Guide', isLive: true, startsAt: new Date(), maxParticipants: 100 },

    // Upcoming Today
    { title: 'Loneliness Lounge', category: 'Loneliness', hostType: 'MODERATOR', hostName: 'Community Hug', isLive: false, startsAt: new Date(Date.now() + 30 * 60000), maxParticipants: 100 },
    { title: 'Morning Calm Ritual', category: 'Mindfulness', hostType: 'PEER', hostName: 'QuietSoul31', isLive: false, startsAt: new Date(Date.now() + 60 * 60000), maxParticipants: 200, isRecurring: true },
    { title: 'Student Pressure Support', category: 'Students', hostType: 'PEER', hostName: 'StudyBuddy99', isLive: false, startsAt: new Date(Date.now() + 15 * 60000), maxParticipants: 50 },
    { title: 'Burnout Recovery', category: 'Burnout', hostType: 'THERAPIST', hostName: 'Dr. Emily', isLive: false, startsAt: new Date(new Date().setHours(new Date().getHours() + 2, 0, 0, 0)), maxParticipants: 500 },
    { title: 'Sleep Wind Down', category: 'Sleep', hostType: 'AI', hostName: 'Nova AI', isLive: false, startsAt: new Date(new Date().setHours(22, 0, 0, 0)), maxParticipants: 1000, isRecurring: true },
    { title: 'Job Stress Circle', category: 'Career', hostType: 'PEER', hostName: 'HopeWalker19', isLive: false, startsAt: new Date(Date.now() + 120 * 60000), maxParticipants: 50 },
    { title: 'Confidence Boost', category: 'Confidence', hostType: 'THERAPIST', hostName: 'Dr. Mike', isLive: false, startsAt: new Date(Date.now() + 240 * 60000), maxParticipants: 200 },
    { title: 'Social Anxiety Group', category: 'Anxiety', hostType: 'MODERATOR', hostName: 'SafeSpace', isLive: false, startsAt: new Date(Date.now() + 180 * 60000), maxParticipants: 30 },

    // Future / Recurring
    { title: 'Sunday Reflection', category: 'Mindfulness', hostType: 'PEER', hostName: 'QuietSoul31', isLive: false, startsAt: new Date(new Date().setDate(new Date().getDate() + (7 - new Date().getDay()))), maxParticipants: 50, isRecurring: true },
    { title: 'Parenting Support', category: 'Relationships', hostType: 'PEER', hostName: 'MomOfTwo', isLive: false, startsAt: new Date(Date.now() + 86400000), maxParticipants: 40 },
    { title: 'Grief & Loss Circle', category: 'Grief', hostType: 'THERAPIST', hostName: 'Dr. Anna', isLive: false, startsAt: new Date(Date.now() + 86400000 * 2), maxParticipants: 150 },
    { title: 'Digital Detox Lounge', category: 'Focus', hostType: 'AI', hostName: 'Nova AI', isLive: false, startsAt: new Date(Date.now() + 3600000 * 5), maxParticipants: 500, isRecurring: true },
    { title: 'Body Positivity', category: 'Confidence', hostType: 'PEER', hostName: 'RealSelf', isLive: false, startsAt: new Date(Date.now() + 3600000 * 8), maxParticipants: 100 },
    { title: 'Creative Block Reset', category: 'Focus', hostType: 'MODERATOR', hostName: 'ArtistMind', isLive: false, startsAt: new Date(Date.now() + 3600000 * 12), maxParticipants: 60 },
    { title: 'New Graduate Path', category: 'Career', hostType: 'PEER', hostName: 'CareerGuide', isLive: false, startsAt: new Date(Date.now() + 86400000 * 3), maxParticipants: 75 },
    { title: 'Daily Gratitude', category: 'Mindfulness', hostType: 'AI', hostName: 'Nova AI', isLive: false, startsAt: new Date(new Date().setHours(21, 0, 0, 0)), maxParticipants: 2000, isRecurring: true },
    { title: 'Mid-Week De-stress', category: 'Stress', hostType: 'MODERATOR', hostName: 'ZenMaster', isLive: false, startsAt: new Date(Date.now() + 86400000 * 1.5), maxParticipants: 300 },
    { title: 'Financial Stress Relief', category: 'Stress', hostType: 'PEER', hostName: 'WealthMind', isLive: false, startsAt: new Date(Date.now() + 86400000 * 4), maxParticipants: 50 },
  ];

  for (const data of roomsData) {
    await prisma.communityRoom.create({
      data: {
        ...data,
      }
    });
  }

  console.log('✅ 20 Community Rooms seeded successfully.');
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
