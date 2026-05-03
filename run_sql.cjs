const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgres://4fab58a0be69757c7e652a0355c956f5135c87dc554c60d9f6189309836e1e13:sk_7VoonaJvfl-SeLXzncT23@db.prisma.io:5432/postgres?sslmode=require',
});
client.connect().then(() => {
  return client.query(`
    SELECT table_name FROM information_schema.tables WHERE table_schema='public'
  `);
}).then((res) => {
  console.log(res.rows);
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
