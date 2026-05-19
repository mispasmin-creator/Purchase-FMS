import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jcgmyvxcamstnhuwmemc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZ215dnhjYW1zdG5odXdtZW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMDgyODAsImV4cCI6MjA4NTU4NDI4MH0.wMKYEcXGOgrRwy7DKBlBz-a_mWhAuZaknG_iXYvKLLo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixLiftAccounts() {
  const { data, error } = await supabase
    .from('LIFT-ACCOUNTS')
    .select('*')
    .order('Timestamp', { ascending: false })
    .limit(500);

  if (error) {
    console.error("Error:", error);
  } else {
    const filtered = data.filter(r => r['Indent no.'] === 'RI-021');
    const mapped = filtered.map(r => ({ id: r.id, LiftNo: r['Lift No'], Indent: r['Indent no.'], Material: r['Raw Material Name'], Qty: r['Lifting Qty'] }));
    console.table(mapped);
  }
}

fixLiftAccounts();
