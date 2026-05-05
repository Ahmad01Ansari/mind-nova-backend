import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing live circles...');
  await prisma.roomParticipant.deleteMany();
  await prisma.roomReminder.deleteMany();
  await prisma.roomFeedback.deleteMany();
  await prisma.roomHostControl.deleteMany();
  await prisma.roomAttendanceAnalytics.deleteMany();
  await prisma.communityRoom.deleteMany();
  await prisma.roomSeries.deleteMany();

  console.log('Seeding Live Circles...');

  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowEvening = new Date(tomorrow.getTime() + 10 * 60 * 60 * 1000);

  const rooms = [
    {
      title: 'Healing After Burnout',
      category: 'Burnout',
      hostType: 'THERAPIST',
      hostName: 'Dr. Sarah Wilson',
      startsAt: now,
      endsAt: oneHourLater,
      isLive: true,
      maxParticipants: 100,
      isRecurring: false,
    },
    {
      title: 'Student Stress Support',
      category: 'Students',
      hostType: 'MODERATOR',
      hostName: 'Alex Johnson',
      startsAt: new Date(now.getTime() + 30 * 60 * 1000), // In 30 mins
      isLive: false,
      maxParticipants: 50,
      isRecurring: true,
    },
    {
      title: 'Deep Sleep Rituals',
      category: 'Sleep',
      hostType: 'AI',
      hostName: 'Nova Guide',
      startsAt: tomorrowEvening,
      isLive: false,
      maxParticipants: 500,
      isRecurring: true,
    },
    {
      title: 'Daily Morning Calm',
      category: 'Stress',
      hostType: 'PEER',
      hostName: 'Community Lead',
      startsAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // Started 2 hours ago
      isLive: false,
      maxParticipants: 200,
      isRecurring: true,
    }
  ];

  for (const room of rooms) {
    await prisma.communityRoom.create({
      data: room
    });
  }

  // Seed some series
  await prisma.roomSeries.create({
    data: {
      title: 'Daily Rituals',
      frequency: 'DAILY',
      timeOfDay: '08:00 AM',
    }
  });

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
