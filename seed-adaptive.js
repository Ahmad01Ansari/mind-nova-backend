const mongoose = require('mongoose');

async function seed() {
  // Use same database name defined in your Nest app
  const uri = process.env.MONGODB_URL || 'mongodb://localhost:27017/mindnova';
  await mongoose.connect(uri);
  const db = mongoose.connection;
  
  console.log('Cleaning existing adaptive nodes...');
  await db.collection('adaptivequestiontrees').deleteMany({});
  await db.collection('adaptivequestionnodes').deleteMany({});

  console.log('Seeding AdaptiveQuestionTree (clinical_main)...');
  await db.collection('adaptivequestiontrees').insertOne({
    treeId: 'clinical_main',
    name: 'Clinical Assessment',
    description: 'Main diagnostic tree covering depression, anxiety, and automated crisis detection.',
    startingQuestionId: 'q_dep_1',
    supportedModes: ['STANDARD', 'QUICK'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  console.log('Seeding AdaptiveQuestionNodes (Depression & Anxiety subset)...');
  await db.collection('adaptivequestionnodes').insertMany([
    {
      questionId: 'q_dep_1',
      category: 'DEPRESSION',
      subCategory: 'MOOD',
      text: 'Over the last 2 weeks, how often have you been bothered by feeling down, depressed, or hopeless?',
      type: 'SEVERITY_SCALE',
      severityWeight: 1.5,
      options: [
        { text: 'Not at all', score: 0 },
        { text: 'Several days', score: 1 },
        { text: 'More than half the days', score: 2 },
        { text: 'Nearly every day', score: 3 }
      ],
      triggerConditions: [],
      dependencyRules: [],
      parentQuestionId: null,
      childQuestionIds: ['q_anx_1'],
      tags: ['phq9', 'core'],
      crisisFlag: false,
      followUpRules: [
        { answer: 3, nextQId: 'q_crisis_1' } // Severe depression routes to crisis check instantly
      ],
      skipLogic: [],
      targetUsers: ['ALL'],
      estimatedTime: 15
    },
    {
      questionId: 'q_anx_1',
      category: 'ANXIETY',
      subCategory: 'WORRY',
      text: 'How often have you been feeling nervous, anxious or on edge?',
      type: 'SEVERITY_SCALE',
      severityWeight: 1.2,
      options: [
        { text: 'Not at all', score: 0 },
        { text: 'Several days', score: 1 },
        { text: 'More than half the days', score: 2 },
        { text: 'Nearly every day', score: 3 }
      ],
      triggerConditions: [],
      dependencyRules: [],
      parentQuestionId: 'q_dep_1',
      childQuestionIds: [],
      tags: ['gad7'],
      crisisFlag: false,
      followUpRules: [],
      skipLogic: [],
      targetUsers: ['ALL'],
      estimatedTime: 15
    },
    {
      questionId: 'q_crisis_1',
      category: 'DEPRESSION',
      subCategory: 'SUICIDE_IDEATION',
      text: 'Have you had thoughts that you would be better off dead, or thoughts of hurting yourself in some way?',
      type: 'SEVERITY_SCALE',
      severityWeight: 5.0,
      options: [
        { text: 'Not at all', score: 0 },
        { text: 'Several days', score: 1 },
        { text: 'More than half the days', score: 2 },
        { text: 'Nearly every day', score: 3 }
      ],
      triggerConditions: [],
      dependencyRules: [],
      parentQuestionId: 'q_dep_1',
      childQuestionIds: ['q_anx_1'], // Goes back to normal flow if answered Low, otherwise overlaid UI triggers
      tags: ['phq9', 'crisis_trigger'],
      crisisFlag: true, // This boolean flag is tracked by Flutter to fire the Interruption UI 
      followUpRules: [],
      skipLogic: [],
      targetUsers: ['ALL'],
      estimatedTime: 15
    }
  ]);

  console.log('Seeding completed successfully!');
  await mongoose.disconnect();
}

seed().catch(console.error);
