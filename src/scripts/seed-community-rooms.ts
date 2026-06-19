import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Community Rooms data...');

  // Clean existing first
  await prisma.communityRoom.deleteMany({});

  const now = new Date();

  const rooms = [
    {
      title: 'Managing Burnout at Work',
      category: 'Burnout',
      hostType: 'THERAPIST',
      hostName: 'Dr. Sarah Jenkins',
      startsAt: new Date(now.getTime() - 15 * 60000), // Started 15 mins ago
      endsAt: new Date(now.getTime() + 45 * 60000),
      isLive: true,
      maxParticipants: 100,
    },
    {
      title: 'Dealing with Evening Anxiety',
      category: 'Anxiety',
      hostType: 'PEER',
      hostName: 'Alex M.',
      startsAt: new Date(now.getTime() - 30 * 60000), // Started 30 mins ago
      endsAt: new Date(now.getTime() + 30 * 60000),
      isLive: true,
      maxParticipants: 50,
    },
    {
      title: 'Deep Sleep Sound Bath',
      category: 'Sleep',
      hostType: 'THERAPIST',
      hostName: 'Luna Waves',
      startsAt: new Date(now.getTime() + 3 * 3600000), // Starts in 3 hours
      endsAt: new Date(now.getTime() + 4 * 3600000),
      isLive: false,
      maxParticipants: 200,
    },
    {
      title: 'Student Stress Check-in',
      category: 'Stress',
      hostType: 'PEER',
      hostName: 'Jordan K.',
      startsAt: new Date(now.getTime() + 24 * 3600000), // Starts tomorrow
      endsAt: new Date(now.getTime() + 25 * 3600000),
      isLive: false,
      maxParticipants: 30,
    }
  ];

  for (const r of rooms) {
    await prisma.communityRoom.create({ data: r });
    console.log(`✅ Seeded room: ${r.title}`);
  }

  console.log('\n🎉 Community Rooms seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
