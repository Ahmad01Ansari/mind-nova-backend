/**
 * MindNova — Therapist Password Updater
 * 
 * Sets a known password for all seeded therapists.
 *
 * Usage: npx ts-node src/scripts/update-therapist-passwords.ts
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function main() {
  const password = 'Password123!';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  console.log(`🔐 Hashing password "${password}"...`);

  const therapists = [
    'dr.sarah@mindnova.com',
    'mark.therapy@mindnova.com',
    'dr.priya@mindnova.com'
  ];

  for (const email of therapists) {
    await prisma.user.update({
      where: { email },
      data: { passwordHash: hash }
    });
    console.log(`✅ Updated password for ${email}`);
  }

  console.log('\n🎉 Credentials updated! Use the following:');
  console.log('------------------------------------------');
  therapists.forEach(email => {
    console.log(`Email: ${email}`);
    console.log(`Pass:  ${password}`);
    console.log('------------------------------------------');
  });
}

main()
  .catch((e) => {
    console.error('❌ Update failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
