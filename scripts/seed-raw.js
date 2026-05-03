const { Client } = require('pg');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const postgresUri = process.env.DATABASE_URL;
const mongoUri = process.env.MONGODB_URL || 'mongodb://localhost:27017/mindnova';

async function seed() {
  console.log('🚀 Starting Authenticated Clinical Revamp (PHQ-9, GAD-7, PSS-10)...');

  // 1. Seed Postgres (Metadata)
  const pgClient = new Client({ connectionString: postgresUri });
  try {
    await pgClient.connect();
    console.log('🔗 Connected to Postgres.');

    const assessments = [
      { id: 'phq9', title: 'Depression (PHQ-9)', type: 'CLINICAL', description: 'Real-world screening for depressive symptoms.' },
      { id: 'gad7', title: 'Anxiety (GAD-7)', type: 'CLINICAL', description: 'Authentic General Anxiety Disorder assessment.' },
      { id: 'pss', title: 'Stress (PSS)', type: 'CLINICAL', description: 'Perceived Stress Scale (PSS-10).' },
      { id: 'pcl5', title: 'PTSD (PCL-5)', type: 'CLINICAL', description: 'PTSD Checklist for DSM-5.' },
      { id: 'pdss', title: 'Panic (PDSS)', type: 'CLINICAL', description: 'Panic Disorder Severity Scale.' },
    ];

    for (const a of assessments) {
      // Use ON CONFLICT (title) to handle cases where IDs might differ from previous seeds
      await pgClient.query(
        `INSERT INTO "Assessment" (id, title, description, type) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (title) DO UPDATE SET description = $3, type = $4`,
        [a.id, a.title, a.description, a.type]
      );
    }
    console.log('✅ Postgres Assessments Standardized.');
  } finally {
    await pgClient.end();
  }

  // 2. Seed MongoDB (Authentic Questionnaires)
  const mongoClient = new MongoClient(mongoUri);
  try {
    await mongoClient.connect();
    const db = mongoClient.db();
    const collection = db.collection('questionnaires');

    const fourPointOptions = [
      { text: 'Not at all', score: 0 },
      { text: 'Several days', score: 1 },
      { text: 'More than half the days', score: 2 },
      { text: 'Nearly every day', score: 3 },
    ];

    const pssOptions = [
      { text: 'Never', score: 0 },
      { text: 'Almost Never', score: 1 },
      { text: 'Sometimes', score: 2 },
      { text: 'Fairly Often', score: 3 },
      { text: 'Very Often', score: 4 },
    ];

    const questionnaires = [
      {
        slug: 'depression-(phq-9)',
        title: 'Depression (PHQ-9)',
        questions: [
          { id: 'phq1', text: 'Little interest or pleasure in doing things', category: 'Interest', options: fourPointOptions },
          { id: 'phq2', text: 'Feeling down, depressed, or hopeless', category: 'Mood', options: fourPointOptions },
          { id: 'phq3', text: 'Trouble falling or staying asleep, or sleeping too much', category: 'Sleep', options: fourPointOptions },
          { id: 'phq4', text: 'Feeling tired or having little energy', category: 'Energy', options: fourPointOptions },
          { id: 'phq5', text: 'Poor appetite or overeating', category: 'Appetite', options: fourPointOptions },
          { id: 'phq6', text: 'Feeling bad about yourself — or that you are a failure', category: 'Self-Esteem', options: fourPointOptions },
          { id: 'phq7', text: 'Trouble concentrating on things, such as reading or watching TV', category: 'Concentration', options: fourPointOptions },
          { id: 'phq8', text: 'Moving or speaking so slowly that others noticed?', category: 'Psychomotor', options: fourPointOptions },
          { id: 'phq9', text: 'Thoughts that you would be better off dead?', category: 'Risk', options: fourPointOptions },
        ],
      },
      {
        slug: 'anxiety-(gad-7)',
        title: 'Anxiety (GAD-7)',
        questions: [
          { id: 'gad1', text: 'Feeling nervous, anxious or on edge', category: 'Anxiety', options: fourPointOptions },
          { id: 'gad2', text: 'Not being able to stop or control worrying', category: 'Control', options: fourPointOptions },
          { id: 'gad3', text: 'Worrying too much about different things', category: 'Worry', options: fourPointOptions },
          { id: 'gad4', text: 'Trouble relaxing', category: 'Tension', options: fourPointOptions },
          { id: 'gad5', text: 'Being so restless that it is hard to sit still', category: 'Restless', options: fourPointOptions },
          { id: 'gad6', text: 'Becoming easily annoyed or irritable', category: 'Irritability', options: fourPointOptions },
          { id: 'gad7', text: 'Feeling afraid as if something awful might happen', category: 'Fear', options: fourPointOptions },
        ],
      },
      {
        slug: 'stress-(pss)',
        title: 'Stress (PSS)',
        questions: [
          { id: 'pss1', text: 'Been upset because of something that happened unexpectedly?', category: 'Control', options: pssOptions },
          { id: 'pss2', text: 'Felt that you were unable to control the important things?', category: 'Control', options: pssOptions },
          { id: 'pss3', text: 'Felt nervous and "stressed"?', category: 'Confidence', options: pssOptions },
          { id: 'pss4', text: 'Felt confident about your ability to handle personal problems?', category: 'Confidence', options: pssOptions },
          { id: 'pss5', text: 'Felt that things were going your way?', category: 'Coping', options: pssOptions },
          { id: 'pss6', text: 'Found that you could not cope with all the things you had to do?', category: 'Coping', options: pssOptions },
          { id: 'pss7', text: 'Been able to control irritations in your life?', category: 'Irritability', options: pssOptions },
          { id: 'pss8', text: 'Felt that you were on top of things?', category: 'Confidence', options: pssOptions },
          { id: 'pss9', text: 'Been angered because of things that were outside of your control?', category: 'Control', options: pssOptions },
          { id: 'pss10', text: 'Felt difficulties were piling up so high that you could not overcome them?', category: 'Overwhelmed', options: pssOptions },
        ],
      },
      {
        slug: 'ptsd-(pcl-5)',
        title: 'PTSD (PCL-5)',
        questions: [
          { id: 'pcl1', text: 'Repeated, disturbing, and unwanted memories of the stressful experience?', category: 'Intrusion', options: pssOptions },
          { id: 'pcl2', text: 'Repeated, disturbing dreams of the stressful experience?', category: 'Intrusion', options: pssOptions },
          { id: 'pcl3', text: 'Suddenly feeling or acting as if the stressful experience were actually happening again?', category: 'Intrusion', options: pssOptions },
          { id: 'pcl4', text: 'Feeling very upset when something reminded you of the stressful experience?', category: 'Intrusion', options: pssOptions },
          { id: 'pcl5', text: 'Having strong physical reactions when something reminded you of the stressful experience?', category: 'Intrusion', options: pssOptions },
          { id: 'pcl6', text: 'Avoiding memories, thoughts, or feelings related to the stressful experience?', category: 'Avoidance', options: pssOptions },
          { id: 'pcl7', text: 'Avoiding external reminders (e.g. people, places, conversations) of the stressful experience?', category: 'Avoidance', options: pssOptions },
          { id: 'pcl8', text: 'Trouble remembering important parts of the stressful experience?', category: 'Cognition', options: pssOptions },
          { id: 'pcl9', text: 'Having strong negative beliefs about yourself, others, or the world?', category: 'Cognition', options: pssOptions },
          { id: 'pcl10', text: 'Blaming yourself or someone else for the stressful experience or what happened after it?', category: 'Cognition', options: pssOptions },
        ],
      },
      {
        slug: 'panic-(pdss)',
        title: 'Panic (PDSS)',
        questions: [
          { id: 'pdss1', text: 'How many panic attacks and limited symptom attacks did you have during the past week?', category: 'Frequency', options: pssOptions },
          { id: 'pdss2', text: 'If you had any panic attacks during the past week, how distressing (uncomfortable, frightening) were they while they were happening?', category: 'Distress', options: pssOptions },
          { id: 'pdss3', text: 'During the past week, how much have you worried or felt anxious about when your next panic attack would occur?', category: 'Worry', options: pssOptions },
          { id: 'pdss4', text: 'Were there places or situations (e.g. public transportation, theaters) from which you stayed away because of a fear of having a panic attack?', category: 'Avoidance', options: pssOptions },
          { id: 'pdss5', text: 'Were there any activities (e.g. sports, sex, driving, climbing stairs) that you avoided?', category: 'Avoidance', options: pssOptions },
          { id: 'pdss6', text: 'How much did the above symptoms (panic and limited symptom attacks, worry, or fear) cause you to not work or carry out your responsibilities?', category: 'Interference', options: pssOptions },
          { id: 'pdss7', text: 'How much did the symptoms mentioned above interfere with your social life?', category: 'Social', options: pssOptions },
        ],
      },
    ];

    for (const q of questionnaires) {
      await collection.updateOne({ slug: q.slug }, { $set: q }, { upsert: true });
    }
    console.log('✅ MongoDB Questionnaires Revamped with Clinical Data.');
  } finally {
    await mongoClient.close();
  }
}

seed().catch(console.error);
