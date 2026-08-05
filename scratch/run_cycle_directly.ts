import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../apps/terminal/.env.local') });

import * as nextHeaders from 'next/headers';
Object.defineProperty(nextHeaders, 'cookies', {
  value: async () => ({
    get: (name: string) => (name === 'console_session' ? { value: 'active_session' } : undefined),
  }),
  configurable: true,
});

import { POST } from '../apps/terminal/src/app/api/autotrader/run-cycle/route';
import { Client } from 'pg';

async function run() {
  console.log('--- Calling POST /api/autotrader/run-cycle ---');
  const response = await POST();
  const json = await response.json();
  console.log('\n--- VERIFICATION GATE e: Response from POST /api/autotrader/run-cycle ---');
  console.log(JSON.stringify(json, null, 2));

  console.log('\n--- VERIFICATION GATE f: SELECT from meridian.gate_decisions ---');
  const client = new Client({ connectionString: process.env.SUPABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const gateRes = await client.query('SELECT id, order_intent_id, instrument, direction, units, entry_price, approved, reason_code, evaluated_at FROM meridian.gate_decisions ORDER BY id DESC LIMIT 5;');
  console.log('gate_decisions rows written by cycle:');
  console.log(JSON.stringify(gateRes.rows, null, 2));

  const cycleRes = await client.query('SELECT id, cycle_id, instrument, action, reason, created_at FROM meridian.cycle_log ORDER BY id DESC LIMIT 5;');
  console.log('\ncycle_log rows written by cycle:');
  console.log(JSON.stringify(cycleRes.rows, null, 2));

  await client.end();
}

run().catch(console.error);
