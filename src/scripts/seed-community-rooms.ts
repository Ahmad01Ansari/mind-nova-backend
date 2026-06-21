import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Community Rooms data...');

  // Clean existing rooms and participants
  await prisma.roomParticipant.deleteMany({});
  await prisma.communityRoom.deleteMany({});

  // Create 50 fake users for participant counts
  console.log('Creating fake users for participant counts...');
  const fakeUsers: string[] = [];
  for (let i = 0; i < 50; i++) {
    const user = await prisma.user.create({
      data: {
        email: `fakeuser_${i}_${Date.now()}@mindnova.com`,
        passwordHash: 'mock',
        role: 'USER',
      }
    });
    fakeUsers.push(user.id);
  }

  const now = new Date();
  
  // Create a room every 3 hours starting from -6 hours to +48 hours
  const categories = ['Burnout', 'Anxiety', 'Sleep', 'Stress', 'Focus', 'Meditation'];
  const hostImages = [
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=faces', // Dr. Sarah Jenkins (Therapist)
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces', // Peer
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=faces', // Peer
    'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=faces', // Therapist
  ];
  
  const rooms: any[] = [];
  
  for (let i = -2; i <= 48; i++) {
    const startTime = new Date(now.getTime() + i * 3 * 3600000);
    // Align to the nearest hour for neatness
    startTime.setMinutes(0, 0, 0);
    
    // Check if this room should be currently live
    // A room is live if current time is between startsAt and endsAt
    const endsAt = new Date(startTime.getTime() + 60 * 60000); // 1 hour duration
    const isLive = now >= startTime && now <= endsAt;
    
    const isTherapist = i % 3 === 0;
    
    rooms.push({
      title: isTherapist ? `Guided ${categories[Math.abs(i) % categories.length]} Healing` : `${categories[Math.abs(i) % categories.length]} Support Circle`,
      category: categories[Math.abs(i) % categories.length],
      hostType: isTherapist ? 'THERAPIST' : 'PEER',
      hostName: isTherapist ? 'Dr. Sarah Jenkins' : `Peer Host ${i}`,
      hostImageUrl: isTherapist ? hostImages[0] : hostImages[Math.abs(i) % 3 + 1],
      startsAt: startTime,
      endsAt: endsAt,
      isLive: isLive,
      maxParticipants: isTherapist ? 100 : 50,
    });
  }

  for (const r of rooms) {
    const room = await prisma.communityRoom.create({ data: r });
    
    // Add random number of participants (15 to 48)
    const pCount = Math.floor(Math.random() * 34) + 15;
    const participantsData: any[] = [];
    for (let j = 0; j < pCount; j++) {
      participantsData.push({
        roomId: room.id,
        userId: fakeUsers[j],
        role: 'LISTENER',
        joinedAt: new Date(room.startsAt.getTime() + Math.random() * 600000)
      });
    }
    
    if (participantsData.length > 0) {
      await prisma.roomParticipant.createMany({ data: participantsData });
    }
    
    if (r.isLive) {
      console.log(`✅ Seeded LIVE room: ${r.title} with ${pCount} participants`);
    }
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
