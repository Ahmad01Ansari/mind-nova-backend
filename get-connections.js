const { Client } = require('pg');
async function run() {
  const client = new Client({ connectionString: 'postgresql://postgres.pdbhmgcxzbihcfcybhzm:MindNova_Secure_2027@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?sslmode=require', ssl: { rejectUnauthorized: false } });
  await client.connect();
  const res = await client.query("SELECT state, count(*) FROM pg_stat_activity WHERE usename = 'postgres.pdbhmgcxzbihcfcybhzm' GROUP BY state;");
  console.log('--- PgBouncer Connections ---');
  console.table(res.rows);
  await client.end();

  const directClient = new Client({ connectionString: 'postgresql://postgres:MindNova_Secure_2027@db.pdbhmgcxzbihcfcybhzm.supabase.co:5432/postgres?sslmode=require', ssl: { rejectUnauthorized: false } });
  await directClient.connect();
  const res2 = await directClient.query("SELECT state, query FROM pg_stat_activity WHERE state = 'active' OR state = 'idle in transaction';");
  console.log('--- Direct Active Queries ---');
  console.table(res2.rows);
  await directClient.end();
}
run();
