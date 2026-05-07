
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://jcgmyvxcamstnhuwmemc.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZ215dnhjYW1zdG5odXdtZW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMDgyODAsImV4cCI6MjA4NTU4NDI4MH0.wMKYEcXGOgrRwy7DKBlBz-a_mWhAuZaknG_iXYvKLLo";
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixRecords() {
  const timestamp = new Date().toISOString();
  console.log("Fixing LF-142 and LF-148 in Mismatch...");
  
  const { data, error } = await supabase
    .from('Mismatch')
    .update({ Planned2: timestamp })
    .in('Lift Number', ['LF-142', 'LF-148']);

  if (error) {
    console.error("Update failed:", error);
  } else {
    console.log("Update successful:", data);
  }
}

fixRecords();
