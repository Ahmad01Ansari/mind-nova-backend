import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const sessions = [
    {
      title: '2 Min Quick Reset',
      description: 'Instant relief for high-stress moments.',
      duration: 2,
      type: 'QUICK',
      category: 'Stress Relief',
      audioUrl: 'https://pdbhmgcxzbihcfcybhzm.supabase.co/storage/v1/object/public/meditation-audio/focus/Meditation_Music_Pure_Waves.mp3',
      stages: {
        create: [
          { order: 1, type: 'BREATHING', duration: 60, title: 'Deep Breathing', description: 'Focus on your breath.', isSkippable: false },
          { order: 2, type: 'GROUNDING', duration: 60, title: 'Grounding', description: 'Notice your surroundings.', content: { prompt: 'Find 3 blue things in the room.' } },
        ]
      }
    },
    {
      title: 'Deep Calm Down',
      description: 'Slow your heart rate and settle your mind.',
      duration: 5,
      type: 'QUICK',
      category: 'Mental Fatigue',
      audioUrl: 'https://pdbhmgcxzbihcfcybhzm.supabase.co/storage/v1/object/public/meditation-audio/meditation/Meditation_Music_Deep_Relaxation_Inner_Peace.mp3',
      stages: {
        create: [
          { order: 1, type: 'BREATHING', duration: 120, title: 'Calm Breathing', description: 'Slow, steady breaths.' },
          { order: 2, type: 'GROUNDING', duration: 120, title: 'Sensory Check', description: 'Connect with your body.', content: { prompt: 'Focus on the feeling of your feet on the floor.' } },
          { order: 3, type: 'REFLECTION', duration: 60, title: 'Gentle Reflection', description: 'Acknowledge your progress.', content: { prompt: 'You are doing great.' } },
        ]
      }
    },
    {
      title: 'Panic Cooldown',
      description: 'A guided grounding for acute anxiety.',
      duration: 5,
      type: 'QUICK',
      category: 'Emotional Pain',
      audioUrl: 'https://pdbhmgcxzbihcfcybhzm.supabase.co/storage/v1/object/public/meditation-audio/anxiety-relief/Peaceful_Forest_Sounds_For_Meditation.mp3',
      stages: {
        create: [
          { order: 1, type: 'BREATHING', duration: 60, title: 'Emergency Breath', description: 'Follow the rhythm.', isSkippable: false },
          { order: 2, type: 'GROUNDING', duration: 180, title: '5-4-3-2-1 Grounding', description: 'Engage your senses.', content: { type: '54321' } },
          { order: 3, type: 'REFLECTION', duration: 60, title: 'Safe Space', description: 'Visualize calm.', content: { prompt: 'You are safe. This will pass.' } },
        ]
      }
    },
    {
      title: 'Thought Release',
      description: 'Let go of repetitive overthinking.',
      duration: 10,
      type: 'EMOTIONAL',
      category: 'Overthinking',
      audioUrl: 'https://pdbhmgcxzbihcfcybhzm.supabase.co/storage/v1/object/public/meditation-audio/meditation/Connect_with_Your_Spiritual_Guide_Deep_Healing.mp3',
      stages: {
        create: [
          { order: 1, type: 'BREATHING', duration: 120, title: 'Mindful Breathing', description: 'Settle into the moment.' },
          { order: 2, type: 'JOURNAL', duration: 300, title: 'Thought Release', description: 'Write it out, let it go.', content: { prompt: 'What is looping in your mind right now?' } },
          { order: 3, type: 'REFLECTION', duration: 180, title: 'Final Calm', description: 'Enjoy the space you created.' },
        ]
      }
    },
    {
      title: 'Posture & Muscle Reset',
      description: 'Release physical tension from stress.',
      duration: 8,
      type: 'BODY',
      category: 'Mental Fatigue',
      audioUrl: 'https://pdbhmgcxzbihcfcybhzm.supabase.co/storage/v1/object/public/meditation-audio/healing/Meditation_Music_Deep_Relaxation_Inner_Peace.mp3',
      stages: {
        create: [
          { order: 1, type: 'BODY', duration: 240, title: 'Muscle Relaxation', description: 'Tense and release.', content: { focus: 'Shoulders and Jaw' } },
          { order: 2, type: 'BODY', duration: 120, title: 'Posture Reset', description: 'Align your spine.', content: { focus: 'Neutral spine' } },
          { order: 3, type: 'BREATHING', duration: 120, title: 'Cool Down', description: 'Breath into the relaxation.' },
        ]
      }
    }

  ];

  for (const session of sessions) {
    await prisma.recoverySession.upsert({
      where: { id: session.title }, // Note: In a real app, use a unique slug or ID
      update: {
        description: session.description,
        duration: session.duration,
        type: session.type,
        category: session.category,
        audioUrl: session.audioUrl,
        stages: {
          deleteMany: {},
          create: session.stages.create
        }
      },
      create: {
        title: session.title,
        description: session.description,
        duration: session.duration,
        type: session.type,
        category: session.category,
        audioUrl: session.audioUrl,
        stages: session.stages
      },
    });
  }

  console.log('Recovery sessions seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
