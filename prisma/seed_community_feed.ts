import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function main() {
  console.log('Seeding Community Feed posts...');

  // Get a user to attach posts to (use the first available user)
  const user = await prisma.user.findFirst();
  if (!user) {
    console.log('No users found. Please seed users first.');
    return;
  }

  // Get or create an alias for this user
  let alias = await prisma.anonymousAlias.findUnique({ where: { userId: user.id } });
  if (!alias) {
    alias = await prisma.anonymousAlias.create({
      data: { userId: user.id, alias: 'CalmSoul21' },
    });
  }

  // Clean existing feed posts
  await prisma.communityPost.deleteMany();

  const posts = [
    // HELP_ME posts (should rank highest due to boosting)
    {
      userId: user.id,
      aliasName: 'HopeWalker19',
      content: 'I feel lost in my career. Every day feels the same and I don\'t know what direction to go. Has anyone else felt this way? How did you find clarity?',
      emotion: 'FRUSTRATED',
      type: 'HELP_ME',
      needType: 'ADVICE',
      tags: ['career', 'burnout'],
      isAnonymous: true,
      visibilityScore: 7.0,
    },
    {
      userId: user.id,
      aliasName: 'QuietMind88',
      content: 'My anxiety before exams is getting worse every year. I can\'t sleep, can\'t focus, and my hands shake during tests. I need help managing this.',
      emotion: 'ANXIOUS',
      type: 'HELP_ME',
      needType: 'SUPPORT',
      tags: ['study', 'anxiety', 'exams'],
      isAnonymous: true,
      visibilityScore: 8.0,
    },
    {
      userId: user.id,
      aliasName: 'GentleBreeze42',
      content: 'I need advice for dealing with anxiety attacks at work. They started last month and I\'m scared of losing my job because of it.',
      emotion: 'ANXIOUS',
      type: 'HELP_ME',
      needType: 'ADVICE',
      tags: ['anxiety', 'career'],
      isAnonymous: true,
      visibilityScore: 6.5,
    },

    // STANDARD posts
    {
      userId: user.id,
      aliasName: 'CalmRiver72',
      content: 'I feel lonely even when I\'m surrounded by friends. Does anyone else experience this weird disconnect? It\'s like being in a room full of people but feeling completely invisible.',
      emotion: 'LONELY',
      type: 'STANDARD',
      needType: 'RELATE',
      tags: ['loneliness', 'relationships'],
      isAnonymous: true,
      visibilityScore: 3.0,
    },
    {
      userId: user.id,
      aliasName: 'SoftLight55',
      content: 'Exams are stressing me out so much. I haven\'t slept properly in 3 days. The pressure from parents makes it even worse.',
      emotion: 'STRESSED',
      type: 'STANDARD',
      needType: 'VENT',
      tags: ['study', 'stress', 'exams'],
      isAnonymous: true,
      visibilityScore: 2.0,
    },
    {
      userId: user.id,
      aliasName: 'WarmHeart33',
      content: 'The breakup is really hurting. We were together for 4 years and now I don\'t even know who I am without them. Everything reminds me of what we had.',
      emotion: 'SAD',
      type: 'STANDARD',
      needType: 'SUPPORT',
      tags: ['breakup', 'relationships'],
      isAnonymous: true,
      visibilityScore: 2.5,
    },
    {
      userId: user.id,
      aliasName: 'KindWave61',
      content: 'I\'ve been having trouble sleeping for weeks. My mind races the moment I lay down. Tried meditation apps but nothing helps. Anyone have similar experiences?',
      emotion: 'TIRED',
      type: 'STANDARD',
      needType: 'RELATE',
      tags: ['sleep', 'health'],
      isAnonymous: true,
      visibilityScore: 1.5,
    },
    {
      userId: user.id,
      aliasName: 'BrightPath29',
      content: 'Starting a new job next week and the imposter syndrome is already kicking in. What if they realize I\'m not good enough?',
      emotion: 'ANXIOUS',
      type: 'STANDARD',
      needType: 'VENT',
      tags: ['career', 'anxiety'],
      isAnonymous: true,
      visibilityScore: 1.0,
    },

    // GRATITUDE posts
    {
      userId: user.id,
      aliasName: 'CalmSoul21',
      content: 'Today I felt better after a long walk in the park. The fresh air and sunlight actually lifted my mood. Small steps matter. 🌿',
      emotion: 'HAPPY',
      type: 'GRATITUDE',
      needType: null,
      tags: ['gratitude', 'health'],
      isAnonymous: true,
      visibilityScore: 4.0,
    },
    {
      userId: user.id,
      aliasName: 'HealingPath47',
      content: 'I finally opened up to a friend about my struggles and they didn\'t judge me. That conversation changed my entire week. If you\'re holding it in, try telling just one person.',
      emotion: 'HAPPY',
      type: 'GRATITUDE',
      needType: null,
      tags: ['relationships', 'gratitude'],
      isAnonymous: true,
      visibilityScore: 5.0,
    },
    {
      userId: user.id,
      aliasName: 'QuietSoul31',
      content: 'Three months ago I couldn\'t get out of bed. Today I completed my first 5K run. Therapy + this community gave me hope. Thank you all. 💛',
      emotion: 'HAPPY',
      type: 'GRATITUDE',
      needType: null,
      tags: ['gratitude', 'health'],
      isAnonymous: true,
      visibilityScore: 6.0,
    },

    // More STANDARD posts for volume
    {
      userId: user.id,
      aliasName: 'GentleMind44',
      content: 'Does anyone else feel like they\'re just going through the motions? Wake up, work, sleep, repeat. I\'m not sad exactly, just... empty.',
      emotion: 'TIRED',
      type: 'STANDARD',
      needType: 'RELATE',
      tags: ['burnout', 'career'],
      isAnonymous: true,
      visibilityScore: 1.0,
    },
    {
      userId: user.id,
      aliasName: 'ClearWave77',
      content: 'My family doesn\'t understand why I need therapy. They keep saying "just be positive." It\'s so frustrating when the people closest to you dismiss your feelings.',
      emotion: 'FRUSTRATED',
      type: 'STANDARD',
      needType: 'VENT',
      tags: ['relationships', 'health'],
      isAnonymous: true,
      visibilityScore: 1.5,
    },
    {
      userId: user.id,
      aliasName: 'SoftBreeze18',
      content: 'Social media makes me feel so inadequate. Everyone seems to have their life together except me. I know it\'s curated but it still hurts.',
      emotion: 'SAD',
      type: 'STANDARD',
      needType: 'RELATE',
      tags: ['loneliness', 'anxiety'],
      isAnonymous: true,
      visibilityScore: 2.0,
    },
  ];

  for (const postData of posts) {
    await prisma.communityPost.create({
      data: {
        ...postData,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 48 * 60 * 60 * 1000)), // Random within last 48h
      },
    });
  }

  console.log(`✅ ${posts.length} Community Feed posts seeded successfully.`);
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
