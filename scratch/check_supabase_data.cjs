
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://jcgmyvxcamstnhuwmemc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZ215dnhjYW1zdG5odXdtZW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMDgyODAsImV4cCI6MjA4NTU4NDI4MH0.wMKYEcXGOgrRwy7DKBlBz-a_mWhAuZaknG_iXYvKLLo";
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log("Checking INDENT-PO...");
  const { data: indentPo, error: err1 } = await supabase
    .from('INDENT-PO')
    .select('po_number, "Indent Id."')
    .order('id', { ascending: false })
    .limit(10);
  
  if (err1) console.error(err1);
  else console.log("INDENT-PO samples:", JSON.stringify(indentPo, null, 2));

  console.log("\nChecking Mismatch...");
  const { data: mismatch, error: err2 } = await supabase
    .from('Mismatch')
    .select('"Indent Number", "Indent No"')
    .order('id', { ascending: false })
    .limit(10);

  if (err2) console.error(err2);
  else console.log("Mismatch samples:", JSON.stringify(mismatch, null, 2));
}

checkData();
