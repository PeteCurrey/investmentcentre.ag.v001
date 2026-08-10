const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', 'apps', 'terminal', '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const eq = line.indexOf('=');
    if (eq > 0) process.env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
}

async function run() {
  const client = new Client({
    connectionString: process.env.SUPABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const apiKey = process.env.OANDA_API_KEY;
  const accountId = process.env.OANDA_ACCOUNT_ID;
  const env = process.env.OANDA_ENVIRONMENT || 'practice';
  const baseUrl = env === 'live' ? 'https://api-fxtrade.oanda.com/v3' : 'https://api-fxpractice.oanda.com/v3';

  const oandaRes = await fetch(`${baseUrl}/accounts/${accountId}/summary`, {
    headers: { Authorization: `Bearer ${apiKey}` }
  });
  const oandaData = await oandaRes.json();
  const acc = oandaData.account || {};
  const liveNavCents = Math.round(parseFloat(acc.NAV || '22.43') * 100);

  console.log('Live OANDA NAV in cents:', liveNavCents);

  // Update existing account_day records to match live balance
  await client.query(
    'UPDATE meridian.account_day SET opening_balance = $1, high_water_mark = $1',
    [liveNavCents]
  );

  const res = await client.query('SELECT * FROM meridian.account_day');
  console.log('=== UPDATED ACCOUNT DAY TABLE ===');
  console.log(JSON.stringify(res.rows, null, 2));

  await client.end();
}

run().catch(console.error);
