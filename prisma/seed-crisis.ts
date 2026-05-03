import 'dotenv/config';
import { PrismaClient, CrisisCategory } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding emergency resources...');

  const resources = [
    // US Resources
    {
      name: '988 Suicide & Crisis Lifeline',
      description: 'Available 24/7, free and confidential support for people in distress, prevention and crisis resources.',
      phoneNumber: '988',
      website: 'https://988lifeline.org',
      countryCode: 'US',
      category: CrisisCategory.SUICIDE_IDEATION,
    },
    {
      name: 'Crisis Text Line',
      description: 'Text HOME to 741741 to connect with a Volunteer Crisis Counselor.',
      phoneNumber: '741741',
      website: 'https://www.crisistextline.org',
      countryCode: 'US',
      category: CrisisCategory.OTHER,
    },
    {
      name: 'The Trevor Project',
      description: 'Crisis intervention and suicide prevention services to lesbian, gay, bisexual, transgender, queer & questioning (LGBTQ) young people.',
      phoneNumber: '866-488-7386',
      website: 'https://www.thetrevorproject.org',
      countryCode: 'US',
      category: CrisisCategory.SUICIDE_IDEATION,
    },
    {
      name: 'National Domestic Violence Hotline',
      description: '24/7, confidential support to anyone experiencing domestic violence or seeking resources and information.',
      phoneNumber: '800-799-7233',
      website: 'https://www.thehotline.org',
      countryCode: 'US',
      category: CrisisCategory.ABUSE,
    },

    // UK Resources
    {
      name: 'Samaritans',
      description: '24/7 support for anyone in emotional distress, struggling to cope, or at risk of suicide.',
      phoneNumber: '116123',
      website: 'https://www.samaritans.org',
      countryCode: 'UK',
      category: CrisisCategory.SUICIDE_IDEATION,
    },
    {
      name: 'National Domestic Abuse Helpline',
      description: '24/7 support for those experiencing domestic abuse.',
      phoneNumber: '08082000247',
      website: 'https://www.nationaldahelpline.org.uk',
      countryCode: 'UK',
      category: CrisisCategory.ABUSE,
    },

    // Global / PK (User is in PK)
    {
      name: 'Talk2Me (Pakistan)',
      description: 'Mental health support and counseling service in Pakistan.',
      phoneNumber: '03041111666',
      website: 'https://talk2me.pk',
      countryCode: 'PK',
      category: CrisisCategory.OTHER,
    },
    {
      name: 'Umang (Pakistan)',
      description: 'Dedicated helpline for suicide prevention and mental health support.',
      phoneNumber: '03117786264',
      website: 'https://www.umang.pk',
      countryCode: 'PK',
      category: CrisisCategory.SUICIDE_IDEATION,
    },
  ];

  for (const resource of resources) {
    await prisma.emergencyResource.upsert({
      where: { id: `seed-${resource.name.toLowerCase().replace(/\s/g, '-')}` },
      update: {},
      create: {
        id: `seed-${resource.name.toLowerCase().replace(/\s/g, '-')}`,
        ...resource,
      },
    });
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
