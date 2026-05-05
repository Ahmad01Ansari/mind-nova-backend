import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing sessions...');
  await prisma.recoveryStage.deleteMany();
  await prisma.recoverySession.deleteMany();
  
  console.log('Seeding Recovery Sessions...');

  const sessions = [
    {
      title: '5-Minute Panic Reset',
      description: 'Quick somatic techniques to lower immediate physical anxiety.',
      type: 'QUICK',
      category: 'Stress Relief',
      duration: 5,
      stages: {
        create: [
          { type: 'BREATHING', title: 'Box Breathing', description: 'Inhale 4s, Hold 4s, Exhale 4s, Hold 4s.', duration: 60, order: 0 },
          { type: 'SOMATIC', title: 'Cold Water Splash', description: 'Splash cold water on your face or hold an ice cube.', duration: 30, order: 1 },
          { type: 'GROUNDING', title: '5-4-3-2-1', description: 'Name 5 things you see, 4 you feel, 3 you hear...', duration: 120, order: 2 },
          { type: 'AFFIRMATION', title: 'Safe Anchor', description: 'Repeat: "I am safe, this will pass."', duration: 90, order: 3 }
        ]
      }
    },
    {
      title: 'Overthinking Loop Breaker',
      description: 'Break the cycle of repetitive thoughts with cognitive grounding.',
      type: 'QUICK',
      category: 'Overthinking',
      duration: 7,
      stages: {
        create: [
          { type: 'GROUNDING', title: 'Reverse Alphabet', description: 'Recite the alphabet backwards from Z to A.', duration: 60, order: 0 },
          { type: 'REFLECTION', title: 'Fact vs Feeling', description: 'Identify one thought and ask: "Is this a proven fact?"', duration: 120, order: 1 },
          { type: 'BREATHING', title: 'Exhale Focus', description: 'Make your exhale twice as long as your inhale.', duration: 180, order: 2 }
        ]
      }
    },
    {
      title: 'Deep Emotional Release',
      description: 'A guided journey to process and release heavy emotions.',
      type: 'EMOTIONAL',
      category: 'Emotional Pain',
      duration: 15,
      stages: {
        create: [
          { type: 'MINDFULNESS', title: 'Naming the Emotion', description: 'Locate where the emotion is in your body.', duration: 180, order: 0 },
          { type: 'EXPRESSION', title: 'Silent Scream', description: 'Tense every muscle, then release with a silent exhale.', duration: 120, order: 1 },
          { type: 'COMPASSION', title: 'Self-Hug', description: 'Wrap your arms around yourself and breathe deeply.', duration: 300, order: 2 }
        ]
      }
    },
    {
      title: 'Morning Energy Boost',
      description: 'Activate your nervous system for a productive day.',
      type: 'BODY',
      category: 'Low Energy',
      duration: 8,
      stages: {
        create: [
          { type: 'MOVEMENT', title: 'Gentle Stretching', description: 'Reach for the sky, then touch your toes.', duration: 120, order: 0 },
          { type: 'BREATHING', title: 'Breath of Fire', description: 'Rapid nasal exhales to boost alertness.', duration: 60, order: 1 },
          { type: 'VISUALIZATION', title: 'Golden Light', description: 'Imagine energy filling your body from head to toe.', duration: 300, order: 2 }
        ]
      }
    },
    {
      title: 'Mental Clarity Reset',
      description: 'Clear the fog and regain focus during mental fatigue.',
      type: 'GUIDED',
      category: 'Mental Fatigue',
      duration: 10,
      stages: {
        create: [
          { type: 'SOMATIC', title: 'Temples Massage', description: 'Gently massage your temples in circular motion.', duration: 60, order: 0 },
          { type: 'BREATHING', title: '4-7-8 Technique', description: 'Inhale 4s, Hold 7s, Exhale 8s.', duration: 180, order: 1 },
          { type: 'MINDFULNESS', title: 'Object Focus', description: 'Pick an object nearby and describe every detail.', duration: 120, order: 2 }
        ]
      }
    }
  ];

  for (const session of sessions) {
    await prisma.recoverySession.create({ data: session });
  }

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
