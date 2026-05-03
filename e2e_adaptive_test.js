const axios = require('axios');

async function run() {
  try {
    const auth = await axios.post('http://localhost:3000/auth/anonymous-session', { deviceId: 'test123' });
    const token = auth.data.access_token;
    console.log('Got token:', token.substring(0, 10) + '...');
    
    const start = await axios.post('http://localhost:3000/adaptive/start', { treeId: 'clinical_main', mode: 'STANDARD' }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Start session:', start.data.sessionId, 'NextQ:', start.data.nextQuestion?.questionId);
    
    let sessionId = start.data.sessionId;
    let nextQ = start.data.nextQuestion;
    
    for(let i=0; i<5; i++) {
      if(!nextQ) {
        console.log('Reached end of assessment early.');
        break;
      }
      
      console.log(`\nAnswering ${nextQ.questionId}...`);
      const answerRes = await axios.patch('http://localhost:3000/adaptive/answer', {
        sessionId,
        questionId: nextQ.questionId,
        score: 1 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if(answerRes.data.completed) {
        console.log('SERVER RETURNED COMPLETED TRUE');
        break;
      }
      console.log('Got next Q:', answerRes.data.nextQuestion?.questionId);
      nextQ = answerRes.data.nextQuestion;
    }
    
  } catch (e) {
    console.error('Error:', e.response?.data || e.message);
  }
}
run();
