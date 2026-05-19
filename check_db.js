import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jcgmyvxcamstnhuwmemc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZ215dnhjYW1zdG5odXdtZW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMDgyODAsImV4cCI6MjA4NTU4NDI4MH0.wMKYEcXGOgrRwy7DKBlBz-a_mWhAuZaknG_iXYvKLLo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
  const { data: poData, error: poError } = await supabase
    .from('INDENT-PO')
    .select('*');

  if (poError) {
    console.error("Error:", poError);
  } else {
    const matching = poData.filter(po => po['po_number'] === 'PMPPL/PO/25-26/2559' || po['Indent Id.'] === 'RI-021');
    console.log(`Found ${matching.length} rows.`);
    matching.forEach(row => {
      console.log(`- Indent Id: ${row['Indent Id.']}, Material: ${row['Material']}, Quantity: ${row['Quantity']}, PO: ${row['po_number']}, Pending PO Qty: ${row['Pending PO Qty']}`);
      console.log(`  PO Items: ${JSON.stringify(row['PO Items'])}`);
    });
  }
}

checkDatabase();
