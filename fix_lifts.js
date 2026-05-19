import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jcgmyvxcamstnhuwmemc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZ215dnhjYW1zdG5odXdtZW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMDgyODAsImV4cCI6MjA4NTU4NDI4MH0.wMKYEcXGOgrRwy7DKBlBz-a_mWhAuZaknG_iXYvKLLo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixLifts() {
  // Update LF-256 to RI-040 (Synthetic 85, PO Qty 225)
  let { error: e1 } = await supabase.from('LIFT-ACCOUNTS').update({ 'Indent no.': 'RI-040' }).eq('Lift No', 'LF-256');
  if (e1) console.error("Error LF-256:", e1);
  else console.log("Fixed LF-256 -> RI-040");

  // Update LF-257 to RI-041 (Insulation Pad)
  let { error: e2 } = await supabase.from('LIFT-ACCOUNTS').update({ 'Indent no.': 'RI-041' }).eq('Lift No', 'LF-257');
  if (e2) console.error("Error LF-257:", e2);
  else console.log("Fixed LF-257 -> RI-041");

  // Update LF-258 to RI-042 (Ceramic Paper)
  let { error: e3 } = await supabase.from('LIFT-ACCOUNTS').update({ 'Indent no.': 'RI-042' }).eq('Lift No', 'LF-258');
  if (e3) console.error("Error LF-258:", e3);
  else console.log("Fixed LF-258 -> RI-042");
}

fixLifts();
