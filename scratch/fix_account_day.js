const { Client } = require('pg');

async function main() {
  const client = new Client({ connectionString: 'postgresql://postgres:Vivaro2104!!@db.jhavbgxrnhxqlmupqrbe.supabase.co:5432/postgres' });
  await client.connect();

  const demoBalanceCents = '9924621'; // £99,246.21 in cents

  console.log('Updating meridian.account_day for demo account balance:', demoBalanceCents);
  
  await client.query("UPDATE meridian.account_day SET opening_balance = $1, high_water_mark = $2 WHERE day_date >= '2026-08-01'", [demoBalanceCents, demoBalanceCents]);
  
  const check = await client.query('SELECT * FROM meridian.account_day ORDER BY day_date DESC LIMIT 5');
  console.table(check.rows);

  await client.end();
}

main().catch(console.error);
