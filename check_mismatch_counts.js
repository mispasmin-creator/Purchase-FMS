import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://jcgmyvxcamstnhuwmemc.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZ215dnhjYW1zdG5odXdtZW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMDgyODAsImV4cCI6MjA4NTU4NDI4MH0.wMKYEcXGOgrRwy7DKBlBz-a_mWhAuZaknG_iXYvKLLo";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("=== Checking mismatch rows with null Actual6 ===");
  
  // 1. Fetch all mismatch rows
  const { data: mismatchData, error: mismatchError } = await supabase
    .from("Mismatch")
    .select("*");
    
  if (mismatchError) {
    console.error("Mismatch Error:", mismatchError);
    return;
  }
  
  // 2. Fetch all fullkittin rows
  const { data: fkData, error: fkError } = await supabase
    .from("fullkittin")
    .select("*");
    
  if (fkError) {
    console.error("fullkittin Error:", fkError);
    return;
  }

  // 3. Build set of kitted lift numbers
  const kittedLiftNos = new Set();
  const kittedBiltyNos = new Set();
  (fkData || []).forEach(fk => {
    const liftNo = String(fk["Lift No"] || "").trim();
    const biltyNo = String(fk["Bilty Number"] || "").trim();
    if (liftNo) kittedLiftNos.add(liftNo);
    if (biltyNo) kittedBiltyNos.add(biltyNo);
  });

  // 4. Find rows in Mismatch that are NOT in fullkittin but have null Actual6
  // Also we require bilty details to show on fullkitting page
  // Let's filter these matching rows
  const targetRows = (mismatchData || []).filter(row => {
    const liftNo = String(row["Lift Number"] || row["Lift ID"] || "").trim();
    const biltyNo = String(row["Bilty No."] || row["Bilty No"] || "").trim();
    const biltyImage = String(row["Bilty Image"] || "").trim();
    
    // Condition A: Not in fullkittin table
    const isKitted = kittedLiftNos.has(liftNo) || (biltyNo && kittedBiltyNos.has(biltyNo));
    if (isKitted) return false;
    
    // Condition B: Actual6 is null
    const isActual6Null = !row.Actual6;
    if (!isActual6Null) return false;
    
    // Condition C: Bilty details exist (required to show in Fullkitting page anyway, otherwise it would be blocked for other reasons)
    const hasBilty = biltyNo && biltyImage;
    return hasBilty;
  });

  console.log(`\nFound ${targetRows.length} entries matching:`);
  console.log("- Not in fullkittin table");
  console.log("- Actual6 is null/empty");
  console.log("- Bilty number and Bilty image exist");
  
  targetRows.forEach((row, i) => {
    console.log(`[${i+1}] Lift No: ${row["Lift Number"] || row["Lift ID"]}, Bilty: ${row["Bilty No."]}, Actual2 (Audit): ${row.Actual2}, Actual4 (Tally): ${row.Actual4}`);
  });
}

run();
