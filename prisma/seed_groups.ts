import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Groups...');

  // 1. Clean existing groups
  await prisma.groupMember.deleteMany();
  await prisma.groupPost.deleteMany();
  await prisma.groupCheckIn.deleteMany();
  await prisma.groupInsight.deleteMany();
  await prisma.group.deleteMany();

  const groups = [
    {
      title: 'Anxiety Support Circle',
      description: 'A safe space for those dealing with daily anxiety. We support each other through panic and worry.',
      category: 'ANXIETY',
      maxMembers: 50,
      rules: '1. Be kind. 2. No medical advice. 3. Respect privacy.',
      welcomeMessage: 'Welcome to the circle. You are not alone in your journey.',
    },
    {
      title: 'Overthinking Club',
      description: 'Do you analyze every small detail? Join us to learn how to find peace of mind.',
      category: 'OVERTHINKING',
      maxMembers: 30,
      rules: 'Share your thoughts, but don\'t spiral alone.',
      welcomeMessage: 'Take a deep breath. You\'re among friends here.',
    },
    {
      title: 'Burnout Recovery',
      description: 'For professionals and students feeling overwhelmed. Focus on rest and setting boundaries.',
      category: 'BURNOUT',
      maxMembers: 40,
      rules: 'No work talk! Focus on self-care.',
      welcomeMessage: 'It\'s okay to rest. Let\'s heal together.',
    },
    {
      title: 'Mental Fitness 101',
      description: 'A growth-oriented group focused on discipline, focus, and positive habits.',
      category: 'DISCIPLINE',
      maxMembers: 100,
      rules: 'Daily check-ins are encouraged.',
      welcomeMessage: 'Let\'s build a stronger mind, one day at a time.',
    },
    {
      title: 'Loneliness Lounge',
      description: 'Connecting people who feel isolated. A friendly space for casual emotional support.',
      category: 'LONELINESS',
      maxMembers: 50,
      welcomeMessage: 'We\'re glad you\'re here. Someone is always listening.',
    },
  ];

  for (const groupData of groups) {
    await prisma.group.create({
      data: {
        ...groupData,
        insights: {
          create: {
            healthScore: 100.0,
            participationRate: 0.0,
          },
        },
      },
    });
  }

  console.log('✅ Groups seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
