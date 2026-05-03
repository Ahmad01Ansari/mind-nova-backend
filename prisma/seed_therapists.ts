import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding 5 curated therapists with marketplace data...');

  // Helper to create a user and therapist profile
  const createTherapist = async (
    email: string,
    name: string,
    title: string,
    specialty: string,
    languages: string[],
    hourlyRate: number,
    bio: string,
    styleTags: string[],
    experienceYrs: number,
    rating: number,
    responseTime: string,
    sessionsCompleted: number,
    onlineStatus: string,
    supportedModes: string[],
    availability: { dayOfWeek: string; startTime: string; endTime: string; mode: string }[],
  ) => {
    // Check if therapist already exists
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      const passwordHash = await bcrypt.hash('MindNova123!', 10);
      user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          role: 'THERAPIST',
        },
      });
    }

    const profile = await prisma.therapistProfile.upsert({
      where: { userId: user.id },
      update: {
        name,
        title,
        specialty,
        languages,
        hourlyRate,
        bio,
        styleTags,
        isVerified: true,
        isActive: true,
        experienceYrs,
        rating,
        responseTime,
        sessionsCompleted,
        onlineStatus,
        supportedModes,
      },
      create: {
        userId: user.id,
        name,
        title,
        specialty,
        languages,
        hourlyRate,
        bio,
        styleTags,
        isVerified: true,
        isActive: true,
        experienceYrs,
        rating,
        responseTime,
        sessionsCompleted,
        onlineStatus,
        supportedModes,
      },
    });

    // Seed availability slots
    await prisma.therapistAvailability.deleteMany({ where: { therapistId: profile.id } });
    if (availability.length > 0) {
      await prisma.therapistAvailability.createMany({
        data: availability.map(slot => ({
          therapistId: profile.id,
          ...slot,
        })),
      });
    }

    console.log(`Created therapist: ${profile.name} (${sessionsCompleted} sessions, ${onlineStatus})`);
  };

  // 1. Anxiety Specialist
  await createTherapist(
    'anxiety.expert@mindnova.com',
    'Dr. Sarah Jenkins',
    'Clinical Psychologist',
    'Anxiety & Panic Disorders',
    ['English'],
    999,
    'I specialize in helping individuals navigate severe anxiety, panic attacks, and generalized anxiety disorder using evidence-based CBT.',
    ['CBT structured', 'Direct coach', 'Action-oriented'],
    8,
    4.9,
    'Usually replies in 1 hr',
    1247,
    'OFFLINE',
    ['CHAT', 'VOICE', 'VIDEO'],
    [
      { dayOfWeek: 'MON', startTime: '10:00', endTime: '13:00', mode: 'VIDEO' },
      { dayOfWeek: 'MON', startTime: '17:00', endTime: '19:00', mode: 'CHAT' },
      { dayOfWeek: 'WED', startTime: '10:00', endTime: '13:00', mode: 'VIDEO' },
      { dayOfWeek: 'WED', startTime: '17:00', endTime: '19:00', mode: 'CHAT' },
      { dayOfWeek: 'FRI', startTime: '14:00', endTime: '18:00', mode: 'VIDEO' },
      { dayOfWeek: 'SAT', startTime: '10:00', endTime: '12:00', mode: 'VOICE' },
    ],
  );

  // 2. Relationship Counselor
  await createTherapist(
    'relationship.counselor@mindnova.com',
    'Michael Chen',
    'Licensed Marriage and Family Therapist',
    'Relationship & Couples Therapy',
    ['English', 'Mandarin'],
    999,
    'Passionate about helping couples and individuals build healthier, more communicative, and resilient relationships.',
    ['Warm listener', 'Empathic', 'Solution-focused'],
    12,
    4.8,
    'Usually replies in 4 hrs',
    1823,
    'BUSY',
    ['CHAT', 'VIDEO'],
    [
      { dayOfWeek: 'TUE', startTime: '11:00', endTime: '14:00', mode: 'VIDEO' },
      { dayOfWeek: 'THU', startTime: '11:00', endTime: '14:00', mode: 'VIDEO' },
      { dayOfWeek: 'THU', startTime: '18:00', endTime: '20:00', mode: 'CHAT' },
      { dayOfWeek: 'SAT', startTime: '09:00', endTime: '13:00', mode: 'VIDEO' },
    ],
  );

  // 3. Student / Exam Stress Therapist
  await createTherapist(
    'student.support@mindnova.com',
    'Priya Sharma',
    'Counseling Psychologist',
    'Academic Pressure & Student Stress',
    ['English', 'Hindi'],
    299, // Affordable student pricing
    'I understand the immense pressure of exams and academics. I help students manage stress, overcome procrastination, and build resilience.',
    ['Youth friendly', 'Warm listener', 'Practical advice'],
    5,
    4.9,
    'Usually replies in 2 hrs',
    876,
    'OFFLINE',
    ['CHAT', 'VOICE', 'VIDEO'],
    [
      { dayOfWeek: 'MON', startTime: '16:00', endTime: '20:00', mode: 'CHAT' },
      { dayOfWeek: 'TUE', startTime: '16:00', endTime: '20:00', mode: 'CHAT' },
      { dayOfWeek: 'WED', startTime: '16:00', endTime: '20:00', mode: 'VOICE' },
      { dayOfWeek: 'THU', startTime: '16:00', endTime: '20:00', mode: 'CHAT' },
      { dayOfWeek: 'FRI', startTime: '16:00', endTime: '20:00', mode: 'CHAT' },
      { dayOfWeek: 'SUN', startTime: '10:00', endTime: '14:00', mode: 'VIDEO' },
    ],
  );

  // 4. Burnout / Work Stress Expert
  await createTherapist(
    'burnout.coach@mindnova.com',
    'David Miller',
    'Executive Coach & Therapist',
    'Burnout & Career Stress',
    ['English'],
    999,
    'Navigating the corporate world can be exhausting. I help professionals recover from burnout, set boundaries, and rediscover their passion.',
    ['Direct coach', 'Career-focused', 'Action-oriented'],
    10,
    4.7,
    'Usually replies in 12 hrs',
    542,
    'OFFLINE',
    ['CHAT', 'VIDEO'],
    [
      { dayOfWeek: 'MON', startTime: '09:00', endTime: '11:00', mode: 'VIDEO' },
      { dayOfWeek: 'WED', startTime: '09:00', endTime: '11:00', mode: 'VIDEO' },
      { dayOfWeek: 'FRI', startTime: '09:00', endTime: '11:00', mode: 'CHAT' },
    ],
  );

  // 5. Hindi + Affordable General Counselor
  await createTherapist(
    'general.hindi@mindnova.com',
    'Anjali Singh',
    'General Counselor',
    'General Mental Wellness',
    ['Hindi', 'English', 'Gujarati'],
    499, // Quick consult pricing
    'Providing accessible, culturally sensitive counseling for everyday challenges, life transitions, and mild emotional distress.',
    ['Warm listener', 'Spiritual / mindful', 'Culturally sensitive'],
    7,
    4.8,
    'Usually replies in 3 hrs',
    1105,
    'OFFLINE',
    ['CHAT', 'VOICE', 'VIDEO'],
    [
      { dayOfWeek: 'MON', startTime: '10:00', endTime: '13:00', mode: 'VIDEO' },
      { dayOfWeek: 'TUE', startTime: '10:00', endTime: '13:00', mode: 'VOICE' },
      { dayOfWeek: 'WED', startTime: '10:00', endTime: '13:00', mode: 'VIDEO' },
      { dayOfWeek: 'THU', startTime: '15:00', endTime: '19:00', mode: 'CHAT' },
      { dayOfWeek: 'FRI', startTime: '10:00', endTime: '13:00', mode: 'VIDEO' },
      { dayOfWeek: 'SAT', startTime: '10:00', endTime: '14:00', mode: 'VIDEO' },
    ],
  );

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
