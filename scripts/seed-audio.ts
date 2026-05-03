import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding audio tracks...');
  
  // Create test user if it doesn't exist
  const MOCK_USER_ID = '12345678-1234-1234-1234-123456789012';
  const user = await prisma.user.upsert({
    where: { id: MOCK_USER_ID },
    update: {},
    create: {
      id: MOCK_USER_ID,
      email: 'test@mindnova.com',
      passwordHash: 'dummy',
    },
  });

  const tracks = [
    {
      title: 'Deep Focus Flow',
      description: 'Binaural beats for deep work and concentration.',
      category: 'FOCUS',
      audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/16/audio_946a362544.mp3',
      artworkUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=800&q=80',
      durationSeconds: 1800,
      tags: ['binaural', 'focus', 'work'],
      moodBenefit: 'Enhances focus and clarity',
      isPremium: false,
      isFeatured: true,
    },
    {
      title: 'Midnight Rain',
      description: 'Gentle rain sounds for sleeping and relaxation.',
      category: 'RAIN',
      audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_24a1e944b2.mp3',
      artworkUrl: 'https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=800&q=80',
      durationSeconds: 3600,
      tags: ['rain', 'sleep', 'nature'],
      moodBenefit: 'Promotes deep sleep',
      isPremium: false,
      isFeatured: true,
    },
    {
      title: 'Ocean Waves at Dusk',
      description: 'Calming ocean waves crashing on the shore.',
      category: 'OCEAN',
      audioUrl: 'https://cdn.pixabay.com/download/audio/2022/01/18/audio_d0a13f69d2.mp3',
      artworkUrl: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&q=80',
      durationSeconds: 2400,
      tags: ['ocean', 'waves', 'relax'],
      moodBenefit: 'Reduces anxiety',
      isPremium: false,
      isFeatured: false,
    },
    {
      title: 'Cozy Fireplace',
      description: 'Warm crackling fire sounds.',
      category: 'FIREPLACE',
      audioUrl: 'https://cdn.pixabay.com/download/audio/2022/02/07/audio_0e54366e6b.mp3',
      artworkUrl: 'https://images.unsplash.com/photo-1507676184212-d0330a15183c?w=800&q=80',
      durationSeconds: 1200,
      tags: ['fire', 'cozy', 'warm'],
      moodBenefit: 'Provides comfort',
      isPremium: false,
      isFeatured: false,
    },
    {
      title: 'Tibetan Healing Bowls',
      description: 'Singing bowls for meditation and chakra alignment.',
      category: 'TIBETAN_BOWLS',
      audioUrl: 'https://cdn.pixabay.com/download/audio/2022/10/25/audio_2b5d49f0ec.mp3',
      artworkUrl: 'https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?w=800&q=80',
      durationSeconds: 1800,
      tags: ['meditation', 'bowls', 'healing'],
      moodBenefit: 'Centers the mind',
      isPremium: true,
      isFeatured: true,
    },
  ];

  for (const track of tracks) {
    await prisma.audioTrack.create({
      data: {
        // @ts-ignore
        category: track.category,
        title: track.title,
        description: track.description,
        audioUrl: track.audioUrl,
        artworkUrl: track.artworkUrl,
        durationSeconds: track.durationSeconds,
        tags: track.tags,
        moodBenefit: track.moodBenefit,
        isPremium: track.isPremium,
        isFeatured: track.isFeatured,
      },
    });
  }

  console.log('Seeded', tracks.length, 'tracks.');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
