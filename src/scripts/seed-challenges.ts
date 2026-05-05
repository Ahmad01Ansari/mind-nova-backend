import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing challenges...');
  await prisma.challengeTask.deleteMany();
  await prisma.challengeDay.deleteMany();
  await prisma.userChallenge.deleteMany();
  await prisma.challenge.deleteMany();

  console.log('Seeding Challenges...');

  const challenges = [
    {
      title: '7 Days of Digital Detox',
      description: 'Reclaim your focus by reducing screen time and mindful device usage.',
      category: 'FOCUS',
      durationDays: 7,
      difficultyLevel: 2,
      icon: '📱',
      coverGradient: ['#4F46E5', '#06B6D4'],
      days: {
        create: [
          { 
            dayNumber: 1, 
            title: 'Build Awareness', 
            motivation: 'Awareness is the first step to freedom.',
            tasks: {
              create: [
                { title: 'No Screens After 9PM', description: 'Turn off all screens at least 1 hour before bed.', type: 'HABIT', orderIndex: 0, duration: 60 }
              ]
            }
          },
          { 
            dayNumber: 2, 
            title: 'Control Your Space', 
            motivation: 'Your environment dictates your behavior.',
            tasks: {
              create: [
                { title: 'Notification Audit', description: 'Disable all non-essential notifications.', type: 'HABIT', orderIndex: 0, duration: 30 }
              ]
            }
          },
          { 
            dayNumber: 3, 
            title: 'Mindful Morning', 
            motivation: 'Win the morning, win the day.',
            tasks: {
              create: [
                { title: 'No Phone First 30m', description: 'Avoid your phone for the first 30 minutes.', type: 'HABIT', orderIndex: 0, duration: 30 }
              ]
            }
          }
        ]
      }
    },
    {
      title: '3-Day Panic Reset',
      description: 'Quick somatic techniques to regain control during high anxiety.',
      category: 'RECOVERY',
      durationDays: 3,
      difficultyLevel: 3,
      icon: '🌪️',
      coverGradient: ['#F43F5E', '#FB923C'],
      days: {
        create: [
          { 
            dayNumber: 1, 
            title: 'Somatic Cooling', 
            motivation: 'Calm the body, calm the mind.',
            tasks: {
              create: [
                { title: 'Cold Exposure', description: 'Splash cold water on your face.', type: 'HABIT', orderIndex: 0, duration: 5 }
              ]
            }
          },
          { 
            dayNumber: 2, 
            title: 'Breath Anchor', 
            motivation: 'Your breath is always with you.',
            tasks: {
              create: [
                { title: 'Box Breathing', description: 'Complete 3 rounds of 4-4-4-4 breathing.', type: 'BREATHING', orderIndex: 0, duration: 10 }
              ]
            }
          },
          { 
            dayNumber: 3, 
            title: 'Grounding Root', 
            motivation: 'You are safe and grounded.',
            tasks: {
              create: [
                { title: '5-4-3-2-1 Technique', description: 'Identify things around you.', type: 'REFLECTION', orderIndex: 0, duration: 15 }
              ]
            }
          }
        ]
      }
    },
    {
      title: '5 Days of Gratitude',
      description: 'Rewire your brain for positivity with daily gratitude practice.',
      category: 'MENTAL_HEALTH',
      durationDays: 5,
      difficultyLevel: 1,
      icon: '✨',
      coverGradient: ['#8B5CF6', '#EC4899'],
      days: {
        create: [
          { 
            dayNumber: 1, 
            title: 'Small Joys', 
            motivation: 'Happiness is found in the details.',
            tasks: {
              create: [
                { title: '3 Grateful Moments', description: 'Write down 3 things you are grateful for.', type: 'REFLECTION', orderIndex: 0, duration: 10 }
              ]
            }
          },
          { 
            dayNumber: 2, 
            title: 'Connection', 
            motivation: 'Gratitude is better when shared.',
            tasks: {
              create: [
                { title: 'Thank Someone', description: 'Send a message of appreciation to a friend.', type: 'HABIT', orderIndex: 0, duration: 5 }
              ]
            }
          }
        ]
      }
    },
    {
      title: '14 Days of Discipline',
      description: 'The ultimate path to self-mastery through consistent habits.',
      category: 'DISCIPLINE',
      durationDays: 14,
      difficultyLevel: 3,
      icon: '⚡',
      coverGradient: ['#1E1B4B', '#312E81'],
      days: {
        create: [
          { 
            dayNumber: 1, 
            title: 'The Foundation', 
            motivation: 'Discipline is doing what needs to be done.',
            tasks: {
              create: [
                { title: 'Early Rise', description: 'Wake up at your target time.', type: 'HABIT', orderIndex: 0, duration: 0 }
              ]
            }
          }
        ]
      }
    }
  ];

  for (const challenge of challenges) {
    await prisma.challenge.create({
      data: challenge
    });
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
