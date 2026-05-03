import { MongoClient } from 'mongodb';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const mongoUri = process.env.MONGODB_URL || 'mongodb://localhost:27017/mindnova';
const mongoClient = new MongoClient(mongoUri);

async function seed() {
  console.log('🚀 Starting Comprehensive Assessment Seeding...');

  try {
    // 1. Seed Postgres (Prisma)
    // We use the same IDs that the Dashboard is passing for seamless routing
    const assessments = [
      { id: 'phq-9', title: 'Depression (PHQ-9)', type: 'CLINICAL', description: 'Patient Health Questionnaire' },
      { id: 'gad7', title: 'Anxiety (GAD-7)', type: 'CLINICAL', description: 'General Anxiety Disorder scale' },
      { id: 'pss', title: 'Stress (PSS)', type: 'CLINICAL', description: 'Perceived Stress Scale' },
      { id: 'pcl5', title: 'PTSD (PCL-5)', type: 'CLINICAL', description: 'PTSD Checklist' },
      { id: 'pdss', title: 'Panic (PDSS)', type: 'CLINICAL', description: 'Panic Disorder Severity Scale' },
    ];

    for (const a of assessments) {
      await prisma.assessment.upsert({
        where: { id: a.id },
        update: a,
        create: a,
      });
    }
    console.log('✅ Postgres Assessments Seeded.');

    // 2. Seed MongoDB (Questionnaires)
    await mongoClient.connect();
    const db = mongoClient.db();
    const collection = db.collection('questionnaires');

    const questionnaires = [
      {
        slug: 'depression-(phq-9)', // Derived from Prisma title in AssessmentService logic
        title: 'PHQ-9 Depression Test',
        questions: [
          {
            id: 'q1',
            text: 'Little interest or pleasure in doing things',
            category: 'Interest',
            options: [
              { text: 'Not at all', score: 0 },
              { text: 'Several days', score: 1 },
              { text: 'More than half the days', score: 2 },
              { text: 'Nearly every day', score: 3 },
            ],
          },
          {
            id: 'q2',
            text: 'Feeling down, depressed, or hopeless',
            category: 'Mood',
            options: [
              { text: 'Not at all', score: 0 },
              { text: 'Several days', score: 1 },
              { text: 'More than half the days', score: 2 },
              { text: 'Nearly every day', score: 3 },
            ],
          },
        ],
      },
      {
        slug: 'anxiety-(gad-7)',
        title: 'GAD-7 Anxiety Test',
        questions: [
          {
            id: 'q1',
            text: 'Feeling nervous, anxious, or on edge',
            category: 'Anxiety',
            options: [
              { text: 'Not at all', score: 0 },
              { text: 'Several days', score: 1 },
              { text: 'More than half the days', score: 2 },
              { text: 'Nearly every day', score: 3 },
            ],
          },
          {
            id: 'q2',
            text: 'Not being able to stop or control worrying',
            category: 'Control',
            options: [
              { text: 'Not at all', score: 0 },
              { text: 'Several days', score: 1 },
              { text: 'More than half the days', score: 2 },
              { text: 'Nearly every day', score: 3 },
            ],
          },
        ],
      },
    ];

    for (const q of questionnaires) {
      await collection.updateOne(
        { slug: q.slug },
        { $set: q },
        { upsert: true }
      );
    }
    console.log('✅ MongoDB Questionnaires Seeded.');

  } catch (err) {
    console.error('❌ Seeding failed:', err);
  } finally {
    await prisma.$disconnect();
    await mongoClient.close();
  }
}

seed();
