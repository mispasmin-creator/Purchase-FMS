import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config();

const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const { data, error } = await sb.from('Master').select('*').limit(5);
if (error) { console.error('ERROR:', error.message); process.exit(1); }
if (!data || data.length === 0) { console.log('No data found'); process.exit(0); }

console.log('\n=== ALL COLUMNS IN MASTER TABLE ===');
Object.keys(data[0]).forEach(k => {
  const vals = data.map(r => r[k]).filter(v => v !== null && v !== '');
  if (vals.length > 0) console.log(`"${k}" => ${JSON.stringify(vals[0])}`);
  else console.log(`"${k}" => (empty)`);
});

// Specifically look for rate-related columns
console.log('\n=== RATE-RELATED COLUMNS ===');
Object.keys(data[0]).filter(k => k.toLowerCase().includes('rate') || k.toLowerCase().includes('type')).forEach(k => {
  const vals = [...new Set(data.map(r => r[k]).filter(v => v !== null && String(v).trim() !== ''))];
  console.log(`"${k}": [${vals.map(v=>JSON.stringify(v)).join(', ')}]`);
});
