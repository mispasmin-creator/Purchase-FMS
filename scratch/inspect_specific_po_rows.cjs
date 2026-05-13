const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectPO() {
    const poNumber = 'PMPPL/PO/25-26/2559';
    console.log(`Inspecting PO: ${poNumber}`);

    const { data, error } = await supabase
        .from('INDENT-PO')
        .select('*')
        .eq('po_number', poNumber);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${data.length} rows:`);
    data.forEach((row, i) => {
        console.log(`Row ${i+1}: ID=${row.id}, Indent ID=${row['Indent Id.']}, Material=${row.Material}, Quantity=${row.Quantity}, Total Qty=${row['Total Quantity']}`);
    });
}

inspectPO();
