/**
 * MindNova — Therapist Data Seeder
 * 
 * Seeds initial therapist profiles and availability into PostgreSQL
 * so the mobile app can display experts in the "Discovery" feature.
 *
 * Usage: npx ts-node src/scripts/seed-therapists.ts
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding therapist data...');

  const therapists = [
    {
      email: 'dr.sarah@mindnova.com',
      name: 'Dr. Sarah Jenkins',
      title: 'Clinical Psychologist',
      specialty: 'Anxiety & Depression',
      bio: 'Expert in Cognitive Behavioral Therapy (CBT) with 10+ years of experience helping students manage academic pressure and social anxiety.',
      hourlyRate: 1500,
      priceQuick: 499,
      priceDeep: 999,
      priceStudent: 299,
      experienceYrs: 12,
      styleTags: ['Empathetic', 'Solution-Focused', 'Warm Listener'],
      languages: ['English', 'Spanish'],
      supportedModes: ['CHAT', 'VIDEO'],
      studentFriendly: true,
      onlineStatus: 'ONLINE',
      imageUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300&h=300',
    },
    {
      email: 'mark.therapy@mindnova.com',
      name: 'Mark Thompson',
      title: 'Licensed Professional Counselor',
      specialty: 'Burnout & Workplace Stress',
      bio: 'Helping professionals regain balance and purpose. Specializing in burnout recovery, boundary setting, and career-related stress management.',
      hourlyRate: 1200,
      priceQuick: 399,
      priceDeep: 899,
      priceStudent: 249,
      experienceYrs: 8,
      styleTags: ['Direct Coach', 'Structured', 'Insightful'],
      languages: ['English'],
      supportedModes: ['CHAT', 'VOICE'],
      studentFriendly: true,
      onlineStatus: 'ONLINE',
      imageUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=300&h=300',
    },
    {
      email: 'dr.priya@mindnova.com',
      name: 'Dr. Priya Sharma',
      title: 'Psychiatrist',
      specialty: 'Student Stress & Trauma',
      bio: 'Compassionate care for complex mental health needs. Focused on trauma-informed therapy and holistic student well-being.',
      hourlyRate: 2000,
      priceQuick: 599,
      priceDeep: 1499,
      priceStudent: 399,
      experienceYrs: 15,
      styleTags: ['Trauma-Informed', 'Holistic', 'Calming Presence'],
      languages: ['English', 'Hindi', 'Punjabi'],
      supportedModes: ['VIDEO', 'VOICE'],
      studentFriendly: true,
      onlineStatus: 'BUSY',
      imageUrl: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&q=80&w=300&h=300',
    }
  ];

  for (const t of therapists) {
    // 1. Create or get User
    let user = await prisma.user.findUnique({ where: { email: t.email } });
    if (!user) {
      console.log(`👤 Creating user for ${t.name}...`);
      user = await prisma.user.create({
        data: {
          email: t.email,
          passwordHash: 'hashed_password_stub', // Not used for therapist login in this demo
          role: 'THERAPIST' as any,
        }
      });
    }

    // 2. Create or update TherapistProfile
    const profileData = {
      name: t.name,
      title: t.title,
      specialty: t.specialty,
      bio: t.bio,
      hourlyRate: t.hourlyRate,
      priceQuick: t.priceQuick,
      priceDeep: t.priceDeep,
      priceStudent: t.priceStudent,
      experienceYrs: t.experienceYrs,
      styleTags: t.styleTags,
      languages: t.languages,
      supportedModes: t.supportedModes,
      studentFriendly: t.studentFriendly,
      onlineStatus: t.onlineStatus,
      imageUrl: t.imageUrl,
      isActive: true,
      isVerified: true,
      rating: 4.8 + Math.random() * 0.2,
      sessionsCompleted: 50 + Math.floor(Math.random() * 200),
      responseTime: 'Usually replies in 2 hrs',
    };

    await prisma.therapistProfile.upsert({
      where: { userId: user.id },
      update: profileData,
      create: {
        userId: user.id,
        ...profileData,
      }
    });

    console.log(`✅ Seeded profile for ${t.name}`);
  }

  console.log('\n🎉 Therapist seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
