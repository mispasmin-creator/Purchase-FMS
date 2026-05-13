
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jcgmyvxcamstnhuwmemc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZ215dnhjYW1zdG5odXdtZW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMDgyODAsImV4cCI6MjA4NTU4NDI4MH0.wMKYEcXGOgrRwy7DKBlBz-a_mWhAuZaknG_iXYvKLLo'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testFilter() {
  const { data, error } = await supabase
    .from('INDENT-PO')
    .select('*')
    .in('po_number', ['PMPPL/PO/25-26/2559', 'PMPPL/PO/25-26/2559-1'])

  if (error) {
    console.error(error)
    return
  }

  data.forEach(row => {
    const status = String(row["Status"] || "").trim().toLowerCase();
    const planned4 = row["Planned4"];
    const poNumber = String(row.po_number || row["Indent Id."] || "").trim();
    const totalQty = parseFloat(row["Total Quantity"] || row["Quantity"] || 0);
    
    // In our case liftedSoFar is 0
    const pendingPending = totalQty;

    const isVisible = (status === "" || status === "pending") &&
                     planned4 !== null &&
                     planned4 !== "" &&
                     pendingPending > 0;

    console.log(`PO: ${poNumber}, Indent: ${row["Indent Id."]}, Status: "${status}", Planned4: "${planned4}", Pending: ${pendingPending}, Visible: ${isVisible}`);
  })
}

testFilter()
