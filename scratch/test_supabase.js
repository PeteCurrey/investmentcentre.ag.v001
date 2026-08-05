const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../apps/terminal/.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

console.log('Connecting via Supabase REST API:', url);
const sb = createClient(url, key);

async function test() {
  const { data, error } = await sb.schema('meridian').from('autotrader_state').select('*');
  console.log('autotrader_state select result:', { data, error });
}

test().catch(console.error);
