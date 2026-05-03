import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URL || 'mongodb://localhost:27017/mindnova';
const client = new MongoClient(uri);

async function seed() {
  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection('questionnaires');

    const phq9 = {
      slug: 'phq-9',
      title: 'PHQ-9 Depression Test',
      description: 'The Patient Health Questionnaire (PHQ-9) is a multipurpose instrument for screening, monitoring and measuring the severity of depression.',
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
        {
          id: 'q3',
          text: 'Trouble falling or staying asleep, or sleeping too much',
          category: 'Sleep',
          options: [
            { text: 'Not at all', score: 0 },
            { text: 'Several days', score: 1 },
            { text: 'More than half the days', score: 2 },
            { text: 'Nearly every day', score: 3 },
          ],
        },
        {
          id: 'q4',
          text: 'Feeling tired or having little energy',
          category: 'Energy',
          options: [
            { text: 'Not at all', score: 0 },
            { text: 'Several days', score: 1 },
            { text: 'More than half the days', score: 2 },
            { text: 'Nearly every day', score: 3 },
          ],
        },
        {
          id: 'q5',
          text: 'Poor appetite or overeating',
          category: 'Appetite',
          options: [
            { text: 'Not at all', score: 0 },
            { text: 'Several days', score: 1 },
            { text: 'More than half the days', score: 2 },
            { text: 'Nearly every day', score: 3 },
          ],
        },
      ],
    };

    await collection.updateOne(
      { slug: 'phq-9' },
      { $set: phq9 },
      { upsert: true }
    );

    console.log('PHQ-9 Seeded successfully into MongoDB');
  } finally {
    await client.close();
  }
}

seed().catch(console.error);
