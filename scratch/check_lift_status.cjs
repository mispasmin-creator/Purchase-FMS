
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://jcgmyvxcamstnhuwmemc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZ215dnhjYW1zdG5odXdtZW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMDgyODAsImV4cCI6MjA4NTU4NDI4MH0.wMKYEcXGOgrRwy7DKBlBz-a_mWhAuZaknG_iXYvKLLo";
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log("Checking Mismatch status for LF-142 and LF-148...");
  const { data, error } = await supabase
    .from('Mismatch')
    .select('"Lift Number", Planned2, Actual2')
    .or('"Lift Number".eq.LF-142,"Lift ID".eq.LF-142,"Lift Number".eq.LF-148,"Lift ID".eq.LF-148');

  if (error) console.error(error);
  else console.log("Mismatch status:", JSON.stringify(data, null, 2));
}

checkData();
