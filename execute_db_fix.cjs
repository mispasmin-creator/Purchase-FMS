const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

const envText = fs.readFileSync(".env", "utf8");
let url = "", key = "";
envText.split("\n").forEach(line => {
  if (line.startsWith("VITE_SUPABASE_URL=")) url = line.replace("VITE_SUPABASE_URL=", "").trim();
  if (line.startsWith("VITE_SUPABASE_ANON_KEY=")) key = line.replace("VITE_SUPABASE_ANON_KEY=", "").trim();
});

const supabase = createClient(url, key);

const updates = [
  // LF-1000 duplicates
  { id: 1068, oldNo: "LF-1000", newNo: "LF-1000-1", vendor: "HINDALCO", material: "HGRM 30" },
  { id: 1069, oldNo: "LF-1000", newNo: "LF-1000-2", vendor: "HINDALCO", material: "SMA4" },
  { id: 1130, oldNo: "LF-1000", newNo: "LF-1000-3", vendor: "Venus Services", material: "CBXT 89 (3-5)" },
  { id: 1133, oldNo: "LF-1000", newNo: "LF-1000-4", vendor: "Venus Services", material: "CBXT 89 (3-5)" },
  { id: 1134, oldNo: "LF-1000", newNo: "LF-1000-5", vendor: "Glomin Resources", material: "High Microsilica" },
  { id: 1135, oldNo: "LF-1000", newNo: "LF-1000-6", vendor: "Sarvesh Refractories", material: "97% DBM (0-1)" },
  { id: 1138, oldNo: "LF-1000", newNo: "LF-1000-7", vendor: "IREL INDIA", material: "Siliminite Sand" },
  { id: 1139, oldNo: "LF-1000", newNo: "LF-1000-8", vendor: "IREL INDIA", material: "Siliminite Sand" },
  { id: 1140, oldNo: "LF-1000", newNo: "LF-1000-9", vendor: "SHAH ENTERPRISE", material: "VINNAPAS" },

  // LF-1001 duplicates
  { id: 1131, oldNo: "LF-1001", newNo: "LF-1001-1", vendor: "Venus Services", material: "CBXT 89 (5-8)" },
  { id: 1136, oldNo: "LF-1001", newNo: "LF-1001-2", vendor: "Sarvesh Refractories", material: "97% DBM Fines" },

  // LF-1002 duplicates
  { id: 1132, oldNo: "LF-1002", newNo: "LF-1002-1", vendor: "Venus Services", material: "CBXT 89 (0-1)" },
  { id: 1137, oldNo: "LF-1002", newNo: "LF-1002-2", vendor: "Sarvesh Refractories", material: "97% DBM (1-3)" },
];

async function applyFix() {
  console.log("Starting DB fix for 13 duplicate lift entries...\n");

  for (const item of updates) {
    // 1. Update LIFT-ACCOUNTS table
    const { error: lErr } = await supabase
      .from("LIFT-ACCOUNTS")
      .update({ "Lift No": item.newNo })
      .eq("id", item.id);

    if (lErr) {
      console.error(`Failed to update LIFT-ACCOUNTS id ${item.id}:`, lErr);
    } else {
      console.log(`[LIFT-ACCOUNTS SUCCESS] Updated id ${item.id} (${item.vendor} - ${item.material}): "${item.oldNo}" -> "${item.newNo}"`);
    }

    // 2. Also check and update Mismatch table if there are corresponding records matching Lift Number = oldNo and Party Name / Product Name
    const { data: misMatchRows } = await supabase
      .from("Mismatch")
      .select('id, "Lift Number", "Party Name", "Product Name"')
      .eq("Lift Number", item.oldNo);

    if (misMatchRows && misMatchRows.length > 0) {
      // Find matching row by party / product if needed, or by exact id
      for (const mRow of misMatchRows) {
        if (
          String(mRow["Party Name"] || "").toLowerCase().includes(item.vendor.toLowerCase().slice(0, 5)) ||
          String(mRow["Product Name"] || "").toLowerCase().includes(item.material.toLowerCase().slice(0, 5))
        ) {
          const { error: mUpdateErr } = await supabase
            .from("Mismatch")
            .update({ "Lift Number": item.newNo })
            .eq("id", mRow.id);

          if (mUpdateErr) {
            console.error(`  Failed to update Mismatch id ${mRow.id}:`, mUpdateErr);
          } else {
            console.log(`  [MISMATCH SUCCESS] Updated Mismatch row id ${mRow.id} Lift Number: "${item.oldNo}" -> "${item.newNo}"`);
          }
        }
      }
    }
  }

  console.log("\nDB Fix Complete!");
}

applyFix();
