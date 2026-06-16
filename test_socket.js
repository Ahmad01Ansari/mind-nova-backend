const io = require('socket.io-client');

const socket = io('http://127.0.0.1:3001/groups', {
  transports: ['websocket'],
});

socket.on('connect', () => {
  console.log('Connected!');
  socket.emit('join_room', { groupId: 'dummy' });
});

socket.on('connect_error', (err) => {
  console.error('Connection error:', err.message);
});

socket.on('error', (err) => {
  console.error('Server error:', err);
});

setTimeout(() => process.exit(), 3000);
