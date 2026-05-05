/**
 * MindNova — Clinical Assessment Questionnaire Seeder
 * 
 * Seeds standard clinical scales (PHQ-9, GAD-7, PSS-10, PCL-5, PDSS)
 * into the MongoDB `questionnaires` collection so the mobile app can
 * retrieve question structures when starting an assessment session.
 *
 * Usage:  npx ts-node src/scripts/seed-assessments.ts
 */

import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: resolve(__dirname, '../../.env') });

// ─── Mongoose Schema (mirrors assessment.schema.ts) ──────────────────
const OptionSchema = new mongoose.Schema({
  text: String,
  score: Number,
  branchTo: String,
});

const QuestionSchema = new mongoose.Schema({
  id: String,
  text: String,
  category: String,
  options: [OptionSchema],
});

const QuestionnaireSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: String,
    questions: [QuestionSchema],
  },
  { timestamps: true },
);

const Questionnaire = mongoose.model('Questionnaire', QuestionnaireSchema);

// ─── Standard Likert Options ─────────────────────────────────────────

const PHQ_OPTIONS = [
  { text: 'Not at all', score: 0 },
  { text: 'Several days', score: 1 },
  { text: 'More than half the days', score: 2 },
  { text: 'Nearly every day', score: 3 },
];

const GAD_OPTIONS = PHQ_OPTIONS; // Same 0-3 Likert

const PSS_OPTIONS = [
  { text: 'Never', score: 0 },
  { text: 'Almost never', score: 1 },
  { text: 'Sometimes', score: 2 },
  { text: 'Fairly often', score: 3 },
  { text: 'Very often', score: 4 },
];

const PSS_REVERSE_OPTIONS = [
  { text: 'Never', score: 4 },
  { text: 'Almost never', score: 3 },
  { text: 'Sometimes', score: 2 },
  { text: 'Fairly often', score: 1 },
  { text: 'Very often', score: 0 },
];

const PCL5_OPTIONS = [
  { text: 'Not at all', score: 0 },
  { text: 'A little bit', score: 1 },
  { text: 'Moderately', score: 2 },
  { text: 'Quite a bit', score: 3 },
  { text: 'Extremely', score: 4 },
];

const PDSS_OPTIONS = [
  { text: 'Not at all', score: 0 },
  { text: 'Mild / infrequent', score: 1 },
  { text: 'Moderate / frequent', score: 2 },
  { text: 'Severe / very frequent', score: 3 },
  { text: 'Extreme / near constant', score: 4 },
];

const MBI_OPTIONS = [
  { text: 'Never', score: 0 },
  { text: 'A few times a year or less', score: 1 },
  { text: 'Once a month or less', score: 2 },
  { text: 'A few times a month', score: 3 },
  { text: 'Once a week', score: 4 },
  { text: 'A few times a week', score: 5 },
  { text: 'Every day', score: 6 },
];

// ─── Questionnaire Data ──────────────────────────────────────────────

const questionnaires = [
  // ════════════════  PHQ-9  ════════════════
  {
    slug: 'phq-9',
    title: 'Depression (PHQ-9)',
    description:
      'The Patient Health Questionnaire-9 is a clinically validated instrument for screening and measuring the severity of depression.',
    questions: [
      { id: 'phq9_1', text: 'Little interest or pleasure in doing things', category: 'Interest', options: PHQ_OPTIONS },
      { id: 'phq9_2', text: 'Feeling down, depressed, or hopeless', category: 'Mood', options: PHQ_OPTIONS },
      { id: 'phq9_3', text: 'Trouble falling or staying asleep, or sleeping too much', category: 'Sleep', options: PHQ_OPTIONS },
      { id: 'phq9_4', text: 'Feeling tired or having little energy', category: 'Energy', options: PHQ_OPTIONS },
      { id: 'phq9_5', text: 'Poor appetite or overeating', category: 'Appetite', options: PHQ_OPTIONS },
      { id: 'phq9_6', text: 'Feeling bad about yourself — or that you are a failure or have let yourself or your family down', category: 'Self-Esteem', options: PHQ_OPTIONS },
      { id: 'phq9_7', text: 'Trouble concentrating on things, such as reading the newspaper or watching television', category: 'Concentration', options: PHQ_OPTIONS },
      { id: 'phq9_8', text: 'Moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual', category: 'Psychomotor', options: PHQ_OPTIONS },
      { id: 'phq9_9', text: 'Thoughts that you would be better off dead or of hurting yourself in some way', category: 'Self-Harm', options: PHQ_OPTIONS },
    ],
  },

  // ════════════════  GAD-7  ════════════════
  {
    slug: 'gad-7',
    title: 'Anxiety (GAD-7)',
    description:
      'The Generalized Anxiety Disorder 7-item scale is a validated screening tool for assessing generalized anxiety.',
    questions: [
      { id: 'gad7_1', text: 'Feeling nervous, anxious, or on edge', category: 'Anxiety', options: GAD_OPTIONS },
      { id: 'gad7_2', text: 'Not being able to stop or control worrying', category: 'Worry', options: GAD_OPTIONS },
      { id: 'gad7_3', text: 'Worrying too much about different things', category: 'Worry', options: GAD_OPTIONS },
      { id: 'gad7_4', text: 'Trouble relaxing', category: 'Physical', options: GAD_OPTIONS },
      { id: 'gad7_5', text: 'Being so restless that it is hard to sit still', category: 'Physical', options: GAD_OPTIONS },
      { id: 'gad7_6', text: 'Becoming easily annoyed or irritable', category: 'Mood', options: GAD_OPTIONS },
      { id: 'gad7_7', text: 'Feeling afraid as if something awful might happen', category: 'Anxiety', options: GAD_OPTIONS },
    ],
  },

  // ════════════════  PSS-10  ════════════════
  {
    slug: 'pss-10',
    title: 'Stress (PSS-10)',
    description:
      'The Perceived Stress Scale measures the degree to which life situations are appraised as stressful over the past month.',
    questions: [
      { id: 'pss_1', text: 'In the last month, how often have you been upset because of something that happened unexpectedly?', category: 'Control', options: PSS_OPTIONS },
      { id: 'pss_2', text: 'In the last month, how often have you felt that you were unable to control the important things in your life?', category: 'Control', options: PSS_OPTIONS },
      { id: 'pss_3', text: 'In the last month, how often have you felt nervous and stressed?', category: 'Anxiety', options: PSS_OPTIONS },
      { id: 'pss_4', text: 'In the last month, how often have you felt confident about your ability to handle your personal problems?', category: 'Self-Esteem', options: PSS_REVERSE_OPTIONS },
      { id: 'pss_5', text: 'In the last month, how often have you felt that things were going your way?', category: 'Control', options: PSS_REVERSE_OPTIONS },
      { id: 'pss_6', text: 'In the last month, how often have you found that you could not cope with all the things that you had to do?', category: 'Behavior', options: PSS_OPTIONS },
      { id: 'pss_7', text: 'In the last month, how often have you been able to control irritations in your life?', category: 'Control', options: PSS_REVERSE_OPTIONS },
      { id: 'pss_8', text: 'In the last month, how often have you felt that you were on top of things?', category: 'Self-Esteem', options: PSS_REVERSE_OPTIONS },
      { id: 'pss_9', text: 'In the last month, how often have you been angered because of things that happened that were outside of your control?', category: 'Mood', options: PSS_OPTIONS },
      { id: 'pss_10', text: 'In the last month, how often have you felt difficulties were piling up so high that you could not overcome them?', category: 'Anxiety', options: PSS_OPTIONS },
    ],
  },

  // ════════════════  PCL-5  ════════════════
  {
    slug: 'pcl-5',
    title: 'PTSD (PCL-5)',
    description:
      'The PTSD Checklist for DSM-5 is a 20-item self-report measure that assesses the 20 DSM-5 symptoms of PTSD.',
    questions: [
      { id: 'pcl5_1', text: 'Repeated, disturbing, and unwanted memories of the stressful experience', category: 'Intrusion', options: PCL5_OPTIONS },
      { id: 'pcl5_2', text: 'Repeated, disturbing dreams of the stressful experience', category: 'Intrusion', options: PCL5_OPTIONS },
      { id: 'pcl5_3', text: 'Suddenly feeling or acting as if the stressful experience were actually happening again', category: 'Intrusion', options: PCL5_OPTIONS },
      { id: 'pcl5_4', text: 'Feeling very upset when something reminded you of the stressful experience', category: 'Intrusion', options: PCL5_OPTIONS },
      { id: 'pcl5_5', text: 'Having strong physical reactions when something reminded you of the stressful experience', category: 'Somatic', options: PCL5_OPTIONS },
      { id: 'pcl5_6', text: 'Avoiding memories, thoughts, or feelings related to the stressful experience', category: 'Behavior', options: PCL5_OPTIONS },
      { id: 'pcl5_7', text: 'Avoiding external reminders of the stressful experience', category: 'Behavior', options: PCL5_OPTIONS },
      { id: 'pcl5_8', text: 'Trouble remembering important parts of the stressful experience', category: 'Concentration', options: PCL5_OPTIONS },
      { id: 'pcl5_9', text: 'Having strong negative beliefs about yourself, other people, or the world', category: 'Self-Esteem', options: PCL5_OPTIONS },
      { id: 'pcl5_10', text: 'Blaming yourself or someone else for the stressful experience or what happened after it', category: 'Guilt', options: PCL5_OPTIONS },
      { id: 'pcl5_11', text: 'Having strong negative feelings such as fear, horror, anger, guilt, or shame', category: 'Mood', options: PCL5_OPTIONS },
      { id: 'pcl5_12', text: 'Loss of interest in activities that you used to enjoy', category: 'Interest', options: PCL5_OPTIONS },
      { id: 'pcl5_13', text: 'Feeling distant or cut off from other people', category: 'Mood', options: PCL5_OPTIONS },
      { id: 'pcl5_14', text: 'Trouble experiencing positive feelings', category: 'Mood', options: PCL5_OPTIONS },
      { id: 'pcl5_15', text: 'Irritable behavior, angry outbursts, or acting aggressively', category: 'Behavior', options: PCL5_OPTIONS },
      { id: 'pcl5_16', text: 'Taking too many risks or doing things that could cause you harm', category: 'Behavior', options: PCL5_OPTIONS },
      { id: 'pcl5_17', text: 'Being "superalert" or watchful or on guard', category: 'Anxiety', options: PCL5_OPTIONS },
      { id: 'pcl5_18', text: 'Feeling jumpy or easily startled', category: 'Anxiety', options: PCL5_OPTIONS },
      { id: 'pcl5_19', text: 'Having difficulty concentrating', category: 'Concentration', options: PCL5_OPTIONS },
      { id: 'pcl5_20', text: 'Trouble falling or staying asleep', category: 'Sleep', options: PCL5_OPTIONS },
    ],
  },

  // ════════════════  PDSS  ════════════════
  {
    slug: 'pdss',
    title: 'Panic (PDSS)',
    description:
      'The Panic Disorder Severity Scale measures the overall severity of panic disorder symptoms.',
    questions: [
      { id: 'pdss_1', text: 'How many panic attacks did you have during the past week?', category: 'Anxiety', options: PDSS_OPTIONS },
      { id: 'pdss_2', text: 'If you had any panic attacks during the past week, how distressing were they?', category: 'Anxiety', options: PDSS_OPTIONS },
      { id: 'pdss_3', text: 'During the past week, how much have you worried or felt anxious about when your next panic attack would occur?', category: 'Worry', options: PDSS_OPTIONS },
      { id: 'pdss_4', text: 'During the past week, were there any places or situations you avoided, or felt afraid of, because of panic attacks?', category: 'Behavior', options: PDSS_OPTIONS },
      { id: 'pdss_5', text: 'During the past week, were there any activities you avoided, or felt afraid of, because they caused physical sensations like those during panic attacks?', category: 'Behavior', options: PDSS_OPTIONS },
      { id: 'pdss_6', text: 'During the past week, how much did the above symptoms interfere with your ability to work or carry out your responsibilities at home?', category: 'Behavior', options: PDSS_OPTIONS },
      { id: 'pdss_7', text: 'During the past week, how much did panic and limited symptom attacks, worry about attacks, and fear of situations and activities because of attacks interfere with your social life?', category: 'Mood', options: PDSS_OPTIONS },
    ],
  },

  // ════════════════  MBI (Burnout)  ════════════════
  {
    slug: 'burnout',
    title: 'Burnout (MBI-HSS)',
    description:
      'The Maslach Burnout Inventory assesses three dimensions of burnout: emotional exhaustion, depersonalization, and personal accomplishment.',
    questions: [
      { id: 'mbi_1', text: 'I feel emotionally drained from my work', category: 'Energy', options: MBI_OPTIONS },
      { id: 'mbi_2', text: 'I feel used up at the end of the workday', category: 'Energy', options: MBI_OPTIONS },
      { id: 'mbi_3', text: 'I feel fatigued when I get up in the morning and have to face another day on the job', category: 'Energy', options: MBI_OPTIONS },
      { id: 'mbi_4', text: 'Working with people all day is really a strain for me', category: 'Social', options: MBI_OPTIONS },
      { id: 'mbi_5', text: 'I feel burned out from my work', category: 'Energy', options: MBI_OPTIONS },
      { id: 'mbi_6', text: 'I feel I am positively influencing other people’s lives through my work', category: 'Self-Esteem', options: MBI_OPTIONS },
      { id: 'mbi_7', text: 'I have become more callous toward people since I took this job', category: 'Behavior', options: MBI_OPTIONS },
      { id: 'mbi_8', text: 'I worry that this job is hardening me emotionally', category: 'Mood', options: MBI_OPTIONS },
    ],
  },
];

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  const mongoUrl = process.env.MONGODB_URL;
  if (!mongoUrl) {
    console.error('❌ MONGODB_URL not set in .env');
    process.exit(1);
  }

  const prisma = new PrismaClient();

  // 1. Seed MongoDB (Clinical Questions)
  console.log('🔗 Connecting to MongoDB...');
  await mongoose.connect(mongoUrl);
  console.log('✅ Connected to MongoDB');

  for (const q of questionnaires) {
    const existing = await Questionnaire.findOne({ slug: q.slug });
    if (existing) {
      console.log(`🔄 Updating MongoDB questionnaire: ${q.slug} (${q.questions.length} questions)`);
      await Questionnaire.updateOne({ slug: q.slug }, { $set: q });
    } else {
      console.log(`➕ Creating MongoDB questionnaire: ${q.slug} (${q.questions.length} questions)`);
      await Questionnaire.create(q);
    }
  }

  // 2. Seed PostgreSQL (Prisma Metadata)
  console.log('\n🔗 Seeding PostgreSQL via Prisma...');
  for (const q of questionnaires) {
    const existing = await prisma.assessment.findUnique({
      where: { title: q.title }
    });

    if (existing) {
      console.log(`🔄 Updating Prisma assessment: ${q.title}`);
      await prisma.assessment.update({
        where: { id: existing.id },
        data: {
          description: q.description,
          type: 'CLINICAL_SCALE'
        }
      });
    } else {
      console.log(`➕ Creating Prisma assessment: ${q.title}`);
      await prisma.assessment.create({
        data: {
          title: q.title,
          description: q.description,
          type: 'CLINICAL_SCALE'
        }
      });
    }
  }

  console.log('\n🎉 Assessment seed complete!');
  console.log(`   Seeded ${questionnaires.length} clinical scales: ${questionnaires.map(q => q.slug).join(', ')}`);

  await mongoose.disconnect();
  await prisma.$disconnect();
  console.log('🔌 All connections closed');
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
