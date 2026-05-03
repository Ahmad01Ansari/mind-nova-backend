import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding challenges...');

  // ─── 1. Calm Mind Reset (3 days) ─────────────────────────────────
  const calmMind = await prisma.challenge.create({
    data: {
      title: 'Calm Mind Reset',
      description:
        'A 3-day micro-journey to quiet your mind and reconnect with inner peace. Each day builds on the last — from simple breathing to a full calming ritual.',
      category: 'MENTAL_HEALTH',
      durationDays: 3,
      difficultyLevel: 1,
      icon: '🧘',
      coverGradient: ['#667eea', '#764ba2'],
      days: {
        create: [
          {
            dayNumber: 1,
            title: 'Find Your Breath',
            motivation:
              'Today is about one thing: breathing. Just 2 minutes of conscious breathing rewires your stress response. You got this.',
            tasks: {
              create: [
                { title: 'Box Breathing', description: '4-4-4-4 breathing pattern', type: 'BREATHING', duration: 2, orderIndex: 0 },
                { title: 'Body Scan Check-in', description: 'Notice where you hold tension', type: 'REFLECTION', duration: 3, orderIndex: 1 },
              ],
            },
          },
          {
            dayNumber: 2,
            title: 'Breathe + Reflect',
            motivation:
              'Yesterday you found your breath. Today add a moment of reflection — feel the momentum building.',
            tasks: {
              create: [
                { title: 'Morning Breathing', description: '4-7-8 calming technique', type: 'BREATHING', duration: 3, orderIndex: 0 },
                { title: 'Gratitude Reflection', description: 'Write 3 things you appreciate', type: 'REFLECTION', duration: 5, orderIndex: 1 },
                { title: 'Evening Wind-Down', description: 'Listen to a calming track', type: 'AUDIO', duration: 5, orderIndex: 2 },
              ],
            },
          },
          {
            dayNumber: 3,
            title: 'Full Calm Ritual',
            motivation:
              'This is your graduation. Breathing + journaling + audio — your own personal calm protocol. You are becoming more calm.',
            tasks: {
              create: [
                { title: 'Deep Breathing Session', description: 'Extended 4-7-8 breathing', type: 'BREATHING', duration: 5, orderIndex: 0 },
                { title: 'Journal: What Calms You', description: 'Free-write about your calm triggers', type: 'REFLECTION', duration: 5, orderIndex: 1 },
                { title: 'Calm Soundscape', description: 'Close your eyes and listen', type: 'AUDIO', duration: 5, orderIndex: 2 },
              ],
            },
          },
        ],
      },
    },
  });
  console.log(`  ✅ ${calmMind.title}`);

  // ─── 2. Anxiety Relief (5 days) ──────────────────────────────────
  const anxietyRelief = await prisma.challenge.create({
    data: {
      title: 'Anxiety Relief',
      description:
        'A 5-day grounding program that progressively builds your anxiety toolkit — from basic grounding to full mindfulness integration.',
      category: 'MENTAL_HEALTH',
      durationDays: 5,
      difficultyLevel: 2,
      icon: '🌿',
      coverGradient: ['#11998e', '#38ef7d'],
      days: {
        create: [
          {
            dayNumber: 1,
            title: 'Ground Yourself',
            motivation: 'Anxiety lives in the future. Grounding brings you back to now. Start with your senses.',
            tasks: {
              create: [
                { title: '5-4-3-2-1 Grounding', description: 'Name 5 things you see, 4 you hear, 3 you touch...', type: 'BREATHING', duration: 3, orderIndex: 0 },
                { title: 'Anxiety Awareness', description: 'Rate your anxiety 1-10 right now', type: 'REFLECTION', duration: 2, orderIndex: 1 },
              ],
            },
          },
          {
            dayNumber: 2,
            title: 'Breathe Through It',
            motivation: 'Your breath is your built-in anti-anxiety tool. Today you learn to use it on demand.',
            tasks: {
              create: [
                { title: 'Anxiety Breathing', description: 'Extended exhale technique (4-2-6)', type: 'BREATHING', duration: 4, orderIndex: 0 },
                { title: 'Worry Download', description: 'Write down everything on your mind', type: 'REFLECTION', duration: 5, orderIndex: 1 },
              ],
            },
          },
          {
            dayNumber: 3,
            title: 'Move the Energy',
            motivation: 'Anxiety is energy stuck in your body. Today we move it out.',
            tasks: {
              create: [
                { title: 'Body Shake', description: '2 min shake-it-out movement', type: 'HABIT', duration: 2, orderIndex: 0 },
                { title: 'Grounding Walk', description: 'Walk slowly for 5 min, feel each step', type: 'HABIT', duration: 5, orderIndex: 1 },
                { title: 'Progress Check', description: 'Rate anxiety now vs Day 1', type: 'REFLECTION', duration: 2, orderIndex: 2 },
              ],
            },
          },
          {
            dayNumber: 4,
            title: 'Build Your Toolkit',
            motivation: 'You now have 3 tools. Today combine them into YOUR anxiety protocol.',
            tasks: {
              create: [
                { title: 'Morning Grounding', description: '5-4-3-2-1 before the day starts', type: 'BREATHING', duration: 3, orderIndex: 0 },
                { title: 'Afternoon Breathe', description: 'Extended exhale when stress peaks', type: 'BREATHING', duration: 3, orderIndex: 1 },
                { title: 'Evening Reflection', description: 'What triggered anxiety today?', type: 'REFLECTION', duration: 5, orderIndex: 2 },
              ],
            },
          },
          {
            dayNumber: 5,
            title: 'Integration Day',
            motivation: 'You have built a real anxiety management system. This is who you are becoming — someone who handles it.',
            tasks: {
              create: [
                { title: 'Full Protocol', description: 'Grounding + Breathing + Movement', type: 'BREATHING', duration: 5, orderIndex: 0 },
                { title: 'Letter to Future Self', description: 'Write advice to yourself for the next anxious moment', type: 'REFLECTION', duration: 5, orderIndex: 1 },
                { title: 'Celebration Listen', description: 'Choose a track that makes you feel safe', type: 'AUDIO', duration: 5, orderIndex: 2 },
              ],
            },
          },
        ],
      },
    },
  });
  console.log(`  ✅ ${anxietyRelief.title}`);

  // ─── 3. Deep Work Sprint (3 days) ────────────────────────────────
  const deepWork = await prisma.challenge.create({
    data: {
      title: 'Deep Work Sprint',
      description:
        'Train your focus muscle in 3 days. Start with one 25-min block and build to sustained deep work with reflection.',
      category: 'FOCUS',
      durationDays: 3,
      difficultyLevel: 2,
      icon: '🎯',
      coverGradient: ['#f093fb', '#f5576c'],
      days: {
        create: [
          {
            dayNumber: 1,
            title: 'First Focus Block',
            motivation: 'Focus is a skill, not a talent. 25 minutes of single-tasking changes everything.',
            tasks: {
              create: [
                { title: '25-min Focus Block', description: 'One task, no distractions, timer running', type: 'HABIT', duration: 25, orderIndex: 0 },
                { title: 'Focus Debrief', description: 'What distracted you? What worked?', type: 'REFLECTION', duration: 3, orderIndex: 1 },
              ],
            },
          },
          {
            dayNumber: 2,
            title: 'Double Down',
            motivation: 'Yesterday was one block. Today: two. You are building a superpower.',
            tasks: {
              create: [
                { title: 'Focus Block #1', description: '25 min of uninterrupted work', type: 'HABIT', duration: 25, orderIndex: 0 },
                { title: '5-min Reset Breathing', description: 'Clear your mind between blocks', type: 'BREATHING', duration: 5, orderIndex: 1 },
                { title: 'Focus Block #2', description: '25 min — different task allowed', type: 'HABIT', duration: 25, orderIndex: 2 },
              ],
            },
          },
          {
            dayNumber: 3,
            title: 'Deep Work Master',
            motivation: 'Three blocks. This is real deep work capacity. You are sharpening your focus.',
            tasks: {
              create: [
                { title: 'Triple Focus Stack', description: '3 × 25-min blocks with 5-min breaks', type: 'HABIT', duration: 90, orderIndex: 0 },
                { title: 'Weekly Focus Reflection', description: 'Compare your output this week vs. last', type: 'REFLECTION', duration: 5, orderIndex: 1 },
              ],
            },
          },
        ],
      },
    },
  });
  console.log(`  ✅ ${deepWork.title}`);

  // ─── 4. Focus Reset (5 days) ─────────────────────────────────────
  const focusReset = await prisma.challenge.create({
    data: {
      title: 'Focus Reset',
      description:
        'Reclaim your attention from digital noise. 5 days of progressive digital detox paired with deep focus training.',
      category: 'FOCUS',
      durationDays: 5,
      difficultyLevel: 2,
      icon: '🔋',
      coverGradient: ['#4facfe', '#00f2fe'],
      days: {
        create: [
          {
            dayNumber: 1,
            title: 'Awareness Day',
            motivation: 'Before you can fix focus, you need to see where it leaks. Today is about noticing.',
            tasks: {
              create: [
                { title: 'Screen Time Audit', description: 'Check your phone usage stats', type: 'REFLECTION', duration: 3, orderIndex: 0 },
                { title: 'Distraction Log', description: 'Note every time you switch tasks today', type: 'REFLECTION', duration: 2, orderIndex: 1 },
              ],
            },
          },
          {
            dayNumber: 2,
            title: 'First Boundary',
            motivation: 'One small boundary. Phone-free first hour. That is how change starts.',
            tasks: {
              create: [
                { title: 'Phone-Free Morning', description: 'No phone for first 60 min after waking', type: 'HABIT', duration: 60, orderIndex: 0 },
                { title: '15-min Focus Sprint', description: 'One task, full attention', type: 'HABIT', duration: 15, orderIndex: 1 },
              ],
            },
          },
          {
            dayNumber: 3,
            title: 'Build the Block',
            motivation: 'Your boundary is set. Now add a real focus block on top.',
            tasks: {
              create: [
                { title: 'Phone-Free Morning', description: 'Continue from yesterday', type: 'HABIT', duration: 60, orderIndex: 0 },
                { title: '25-min Focus Block', description: 'Timer + single task', type: 'HABIT', duration: 25, orderIndex: 1 },
                { title: 'Focus Breathing Reset', description: 'Clear mind between tasks', type: 'BREATHING', duration: 3, orderIndex: 2 },
              ],
            },
          },
          {
            dayNumber: 4,
            title: 'Sustained Focus',
            motivation: 'Two focus blocks in one day. This is where growth accelerates.',
            tasks: {
              create: [
                { title: 'Double Focus Stack', description: '2 × 25-min blocks', type: 'HABIT', duration: 55, orderIndex: 0 },
                { title: 'Notification Detox', description: 'Turn off non-essential notifications', type: 'HABIT', duration: 5, orderIndex: 1 },
                { title: 'Focus Reflection', description: 'How has your attention changed?', type: 'REFLECTION', duration: 3, orderIndex: 2 },
              ],
            },
          },
          {
            dayNumber: 5,
            title: 'Focus Protocol',
            motivation: 'Your complete focus system. Phone-free mornings + deep work blocks + breathing resets = unstoppable.',
            tasks: {
              create: [
                { title: 'Full Focus Protocol', description: 'Phone-free morning + 2 focus blocks + breathing resets', type: 'HABIT', duration: 90, orderIndex: 0 },
                { title: 'Identity Reflection', description: 'Write: "I am someone who can focus deeply because..."', type: 'REFLECTION', duration: 5, orderIndex: 1 },
              ],
            },
          },
        ],
      },
    },
  });
  console.log(`  ✅ ${focusReset.title}`);

  // ─── 5. Sleep Reset (7 days) ─────────────────────────────────────
  const sleepReset = await prisma.challenge.create({
    data: {
      title: 'Sleep Reset',
      description:
        '7 days to rebuild your sleep from scratch. Progressive night routine building with audio sanctuary integration.',
      category: 'RECOVERY',
      durationDays: 7,
      difficultyLevel: 2,
      icon: '🌙',
      coverGradient: ['#0c3483', '#a2b6df'],
      days: {
        create: [
          {
            dayNumber: 1,
            title: 'Sleep Audit',
            motivation: 'Better sleep starts with awareness. Tonight, just notice.',
            tasks: {
              create: [
                { title: 'Sleep Pattern Review', description: 'What time did you sleep & wake this week?', type: 'REFLECTION', duration: 5, orderIndex: 0 },
                { title: 'Evening Breathing', description: '4-7-8 breathing before bed', type: 'BREATHING', duration: 3, orderIndex: 1 },
              ],
            },
          },
          {
            dayNumber: 2,
            title: 'Screen Curfew',
            motivation: 'Blue light sabotages melatonin. One rule: screens off 30 min before bed.',
            tasks: {
              create: [
                { title: 'Screen Curfew', description: 'No screens 30 min before bed', type: 'HABIT', duration: 30, orderIndex: 0 },
                { title: 'Sleep Soundscape', description: 'Listen to a calming sleep track', type: 'AUDIO', duration: 10, orderIndex: 1 },
              ],
            },
          },
          {
            dayNumber: 3,
            title: 'Wind-Down Ritual',
            motivation: 'Your body needs a signal that sleep is coming. Build that signal tonight.',
            tasks: {
              create: [
                { title: 'Screen Curfew', description: 'Continue from yesterday', type: 'HABIT', duration: 30, orderIndex: 0 },
                { title: 'Warm Drink Ritual', description: 'Herbal tea or warm milk — no caffeine', type: 'HABIT', duration: 10, orderIndex: 1 },
                { title: 'Sleep Breathing', description: '4-7-8 extended session', type: 'BREATHING', duration: 5, orderIndex: 2 },
              ],
            },
          },
          {
            dayNumber: 4,
            title: 'Consistent Timing',
            motivation: 'Same bedtime = better sleep quality. Set your target time.',
            tasks: {
              create: [
                { title: 'Set Bedtime Alarm', description: 'Set a "go to bed" alarm', type: 'HABIT', duration: 1, orderIndex: 0 },
                { title: 'Full Wind-Down', description: 'Screen off + tea + breathing', type: 'HABIT', duration: 45, orderIndex: 1 },
              ],
            },
          },
          {
            dayNumber: 5,
            title: 'Morning Anchor',
            motivation: 'Great sleep starts with how you wake up. Anchor your morning.',
            tasks: {
              create: [
                { title: 'Wake at Set Time', description: 'Same wake time, even on weekends', type: 'HABIT', duration: 1, orderIndex: 0 },
                { title: 'Morning Light', description: '10 min natural light exposure', type: 'HABIT', duration: 10, orderIndex: 1 },
                { title: 'Sleep Quality Reflection', description: 'How was last night?', type: 'REFLECTION', duration: 3, orderIndex: 2 },
              ],
            },
          },
          {
            dayNumber: 6,
            title: 'Full Protocol Night',
            motivation: 'Put it all together tonight. This is your complete sleep protocol.',
            tasks: {
              create: [
                { title: 'Full Sleep Protocol', description: 'Screen curfew + tea + breathing + audio', type: 'HABIT', duration: 45, orderIndex: 0 },
                { title: 'Bedtime Audio', description: 'Sleep soundscape in bed', type: 'AUDIO', duration: 15, orderIndex: 1 },
                { title: 'Sleep Journal', description: 'Write what is on your mind to release it', type: 'REFLECTION', duration: 5, orderIndex: 2 },
              ],
            },
          },
          {
            dayNumber: 7,
            title: 'Sleep Master',
            motivation: 'You rebuilt your sleep system in 7 days. You are healing your body. Keep going.',
            tasks: {
              create: [
                { title: 'Full Protocol (Repeat)', description: 'Your complete sleep routine', type: 'HABIT', duration: 45, orderIndex: 0 },
                { title: 'Week Reflection', description: 'Compare sleep quality Day 1 vs Day 7', type: 'REFLECTION', duration: 5, orderIndex: 1 },
              ],
            },
          },
        ],
      },
    },
  });
  console.log(`  ✅ ${sleepReset.title}`);

  // ─── 6. Routine Builder (7 days) ─────────────────────────────────
  const routineBuilder = await prisma.challenge.create({
    data: {
      title: 'Routine Builder',
      description:
        '7 days to construct your ideal morning and evening routines. Start with one habit. End with a full protocol.',
      category: 'DISCIPLINE',
      durationDays: 7,
      difficultyLevel: 3,
      icon: '⚡',
      coverGradient: ['#f7971e', '#ffd200'],
      days: {
        create: [
          {
            dayNumber: 1,
            title: 'One Morning Habit',
            motivation: 'Discipline starts with ONE non-negotiable. Pick yours today.',
            tasks: {
              create: [
                { title: 'Morning Hydration', description: 'Glass of water within 5 min of waking', type: 'HABIT', duration: 1, orderIndex: 0 },
                { title: 'Set Tomorrow\'s Alarm', description: 'Same time, non-negotiable', type: 'HABIT', duration: 1, orderIndex: 1 },
              ],
            },
          },
          {
            dayNumber: 2,
            title: 'Stack a Second',
            motivation: 'Habit stacking: attach a new habit to your existing one.',
            tasks: {
              create: [
                { title: 'Morning Hydration', description: 'Continue from Day 1', type: 'HABIT', duration: 1, orderIndex: 0 },
                { title: '2-min Stretching', description: 'Right after water, before phone', type: 'HABIT', duration: 2, orderIndex: 1 },
                { title: 'Routine Planning', description: 'Write your ideal morning (5 items max)', type: 'REFLECTION', duration: 3, orderIndex: 2 },
              ],
            },
          },
          {
            dayNumber: 3,
            title: 'Add the Mind',
            motivation: 'Body is awake. Now wake the mind.',
            tasks: {
              create: [
                { title: 'Water + Stretch', description: 'Stack from yesterday', type: 'HABIT', duration: 3, orderIndex: 0 },
                { title: 'Morning Breathing', description: '3 min focused breathing', type: 'BREATHING', duration: 3, orderIndex: 1 },
                { title: 'Day Intention', description: 'Write one sentence about today\'s focus', type: 'REFLECTION', duration: 2, orderIndex: 2 },
              ],
            },
          },
          {
            dayNumber: 4,
            title: 'Evening Bookend',
            motivation: 'Great days end well. Add an evening ritual.',
            tasks: {
              create: [
                { title: 'Full Morning Stack', description: 'Water + stretch + breathing + intention', type: 'HABIT', duration: 10, orderIndex: 0 },
                { title: 'Evening Review', description: 'What went well? What to improve?', type: 'REFLECTION', duration: 5, orderIndex: 1 },
                { title: 'Wind-Down Audio', description: 'Listen to calming audio before bed', type: 'AUDIO', duration: 5, orderIndex: 2 },
              ],
            },
          },
          {
            dayNumber: 5,
            title: 'Refine & Adjust',
            motivation: 'Not everything works. Drop what does not serve you. Keep what does.',
            tasks: {
              create: [
                { title: 'Full Morning Routine', description: 'Your evolved morning stack', type: 'HABIT', duration: 10, orderIndex: 0 },
                { title: 'Routine Audit', description: 'What is working? What feels forced?', type: 'REFLECTION', duration: 5, orderIndex: 1 },
                { title: 'Evening Routine', description: 'Review + audio', type: 'HABIT', duration: 10, orderIndex: 2 },
              ],
            },
          },
          {
            dayNumber: 6,
            title: 'Full Protocol',
            motivation: 'Your full day protocol: morning + evening. Execute it with intention.',
            tasks: {
              create: [
                { title: 'Morning Protocol', description: 'Execute your refined morning routine', type: 'HABIT', duration: 15, orderIndex: 0 },
                { title: 'Midday Check-in', description: 'Am I on track with today\'s intention?', type: 'REFLECTION', duration: 2, orderIndex: 1 },
                { title: 'Evening Protocol', description: 'Execute your evening routine', type: 'HABIT', duration: 15, orderIndex: 2 },
              ],
            },
          },
          {
            dayNumber: 7,
            title: 'Identity Lock',
            motivation: 'You are not just "trying routines." You are someone who has a system. You are building discipline.',
            tasks: {
              create: [
                { title: 'Morning Protocol (Final)', description: 'Your complete morning routine', type: 'HABIT', duration: 15, orderIndex: 0 },
                { title: 'Identity Reflection', description: 'Write: "I am someone who..." — finish the sentence', type: 'REFLECTION', duration: 5, orderIndex: 1 },
                { title: 'Evening Protocol (Final)', description: 'Your complete evening routine', type: 'HABIT', duration: 15, orderIndex: 2 },
              ],
            },
          },
        ],
      },
    },
  });
  console.log(`  ✅ ${routineBuilder.title}`);

  console.log('\n🎉 All 6 challenges seeded successfully!');
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
