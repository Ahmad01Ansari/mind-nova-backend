import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seed() {
  console.log('🌱 Seeding 5 therapist profiles...');

  const therapists = [
    {
      email: 'dr.priya.sharma@mindnova.in',
      password: 'therapist123',
      name: 'Dr. Priya Sharma',
      title: 'Clinical Psychologist',
      specialty: 'Anxiety, Depression, OCD',
      languages: ['English', 'Hindi'],
      hourlyRate: 999,
      priceQuick: 499,
      priceDeep: 999,
      priceStudent: 299,
      bio: 'With 8 years of clinical experience, I specialize in evidence-based CBT and mindfulness approaches for anxiety and depression. I believe therapy should feel like a safe conversation, not a clinical interrogation. My goal is to help you build resilience that lasts beyond our sessions.',
      styleTags: ['CBT structured', 'Warm listener'],
      isVerified: true,
      experienceYrs: 8,
      rating: 4.9,
      responseTime: 'Usually replies in 2 hrs',
      availableHours: {
        morning: ['9:00 AM', '10:00 AM', '11:00 AM'],
        afternoon: ['2:00 PM', '3:00 PM'],
        evening: ['6:00 PM', '7:00 PM'],
      },
    },
    {
      email: 'dr.arjun.mehta@mindnova.in',
      password: 'therapist123',
      name: 'Dr. Arjun Mehta',
      title: 'Counseling Psychologist',
      specialty: 'Burnout, Career stress, Relationship stress',
      languages: ['English', 'Hindi', 'Gujarati'],
      hourlyRate: 799,
      priceQuick: 399,
      priceDeep: 799,
      priceStudent: 249,
      bio: 'I work primarily with young professionals navigating burnout, career transitions, and relationship challenges. My approach blends solution-focused therapy with practical coaching — we work on real tools you can use this week, not just insights for someday.',
      styleTags: ['Direct coach', 'Youth friendly'],
      isVerified: true,
      experienceYrs: 5,
      rating: 4.8,
      responseTime: 'Usually replies in 1 hr',
      availableHours: {
        morning: ['10:00 AM', '11:00 AM'],
        afternoon: ['1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'],
        evening: ['7:00 PM', '8:00 PM'],
      },
    },
    {
      email: 'dr.meera.iyer@mindnova.in',
      password: 'therapist123',
      name: 'Dr. Meera Iyer',
      title: 'Clinical Psychologist & Art Therapist',
      specialty: 'Depression, Trauma, Grief',
      languages: ['English', 'Hindi'],
      hourlyRate: 1200,
      priceQuick: 599,
      priceDeep: 1200,
      priceStudent: 399,
      bio: 'I integrate art therapy and somatic experiencing into traditional clinical work. For those who find it hard to "just talk," creative expression offers a powerful alternative path to healing. I have special expertise in trauma recovery and grief processing.',
      styleTags: ['Warm listener', 'Culturally sensitive'],
      isVerified: true,
      experienceYrs: 12,
      rating: 4.95,
      responseTime: 'Usually replies in 3 hrs',
      availableHours: {
        morning: ['9:00 AM', '10:00 AM'],
        afternoon: ['2:00 PM', '3:00 PM'],
        evening: ['5:00 PM'],
      },
    },
    {
      email: 'dr.rohan.kapoor@mindnova.in',
      password: 'therapist123',
      name: 'Dr. Rohan Kapoor',
      title: 'Youth Psychologist',
      specialty: 'Exam stress, Academic anxiety, Self-esteem',
      languages: ['English', 'Hindi'],
      hourlyRate: 499,
      priceQuick: 249,
      priceDeep: 499,
      priceStudent: 199,
      bio: 'I exclusively work with students aged 16-25. I understand the unique pressures of competitive exams, social media comparison, and identity formation. My sessions are informal, judgment-free, and designed to fit around your study schedule.',
      styleTags: ['Youth friendly', 'Direct coach'],
      isVerified: true,
      experienceYrs: 3,
      rating: 4.7,
      responseTime: 'Usually replies in 30 mins',
      availableHours: {
        morning: ['8:00 AM', '9:00 AM'],
        afternoon: ['12:00 PM', '1:00 PM', '2:00 PM'],
        evening: ['6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM'],
      },
    },
    {
      email: 'dr.ananya.das@mindnova.in',
      password: 'therapist123',
      name: 'Dr. Ananya Das',
      title: 'Family & Relationship Therapist',
      specialty: 'Relationship stress, Family conflict, Anxiety',
      languages: ['English', 'Hindi', 'Mandarin'],
      hourlyRate: 899,
      priceQuick: 449,
      priceDeep: 899,
      priceStudent: 299,
      bio: 'Relationships are where we grow and where we hurt the most. I specialize in couples counseling, family dynamics, and attachment patterns. Whether you are dealing with a difficult breakup or navigating family expectations, I provide a culturally sensitive space to process and rebuild.',
      styleTags: ['Warm listener', 'Culturally sensitive'],
      isVerified: true,
      experienceYrs: 7,
      rating: 4.85,
      responseTime: 'Usually replies in 1 hr',
      availableHours: {
        morning: ['10:00 AM', '11:00 AM'],
        afternoon: ['3:00 PM', '4:00 PM'],
        evening: ['6:00 PM', '7:00 PM'],
      },
    },
  ];

  for (const t of therapists) {
    const hashedPassword = await bcrypt.hash(t.password, 10);

    // Upsert user account
    const user = await prisma.user.upsert({
      where: { email: t.email },
      update: {},
      create: {
        email: t.email,
        passwordHash: hashedPassword,
        role: 'THERAPIST',
      },
    });

    // Upsert therapist profile
    await prisma.therapistProfile.upsert({
      where: { userId: user.id },
      update: {
        name: t.name,
        title: t.title,
        specialty: t.specialty,
        languages: t.languages,
        hourlyRate: t.hourlyRate,
        priceQuick: t.priceQuick,
        priceDeep: t.priceDeep,
        priceStudent: t.priceStudent,
        bio: t.bio,
        styleTags: t.styleTags,
        isVerified: t.isVerified,
        experienceYrs: t.experienceYrs,
        rating: t.rating,
        responseTime: t.responseTime,
        availableHours: t.availableHours,
      },
      create: {
        userId: user.id,
        name: t.name,
        title: t.title,
        specialty: t.specialty,
        languages: t.languages,
        hourlyRate: t.hourlyRate,
        priceQuick: t.priceQuick,
        priceDeep: t.priceDeep,
        priceStudent: t.priceStudent,
        bio: t.bio,
        styleTags: t.styleTags,
        isVerified: t.isVerified,
        experienceYrs: t.experienceYrs,
        rating: t.rating,
        responseTime: t.responseTime,
        availableHours: t.availableHours,
      },
    });

    console.log(`  ✅ ${t.name} (${t.specialty})`);
  }

  console.log('\n🎉 All 5 therapists seeded successfully!');
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
