import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing groups...');
  await prisma.groupMember.deleteMany();
  await prisma.groupPost.deleteMany();
  await prisma.groupChatMessage.deleteMany();
  await prisma.groupCheckIn.deleteMany();
  await prisma.groupReflection.deleteMany();
  await prisma.groupChallenge.deleteMany();
  await prisma.groupExitFeedback.deleteMany();
  await prisma.groupInsight.deleteMany();
  await prisma.group.deleteMany();

  console.log('Seeding Healing Circles (Groups)...');

  const groups = [
    {
      title: 'Anxiety Warriors',
      description: 'A safe space to share techniques and support each other through anxiety and panic attacks.',
      category: 'ANXIETY',
      type: 'PEER',
      maxMembers: 50,
      imageUrl: 'https://images.unsplash.com/photo-1474418397713-7ded61d46e18',
    },
    {
      title: 'The Focus Lab',
      description: 'Master deep work and discipline. We share study techniques and accountability goals.',
      category: 'DISCIPLINE',
      type: 'AI_GUIDED',
      maxMembers: 100,
      imageUrl: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b',
    },
    {
      title: 'Mindful Students',
      description: 'Navigating academic pressure together. Student-led discussions on balance and growth.',
      category: 'STUDENT',
      type: 'PEER',
      maxMembers: 75,
      imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644',
    },
    {
      title: 'Breakup & Beyond',
      description: 'Healing from emotional loss. Professional guidance and peer support for moving forward.',
      category: 'BREAKUP',
      type: 'THERAPIST_LED',
      maxMembers: 30,
      imageUrl: 'https://images.unsplash.com/photo-1516589174184-c68526614fd5',
    },
    {
      title: 'Career Clarity',
      description: 'Combat professional burnout and find your path. Networking and emotional support for professionals.',
      category: 'CAREER',
      type: 'PEER',
      maxMembers: 60,
      imageUrl: 'https://images.unsplash.com/photo-1454165833767-027ffea9e77b',
    }
  ];

  for (const group of groups) {
    await prisma.group.create({
      data: group
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
