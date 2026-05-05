const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://jcgmyvxcamstnhuwmemc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZ215dnhjYW1zdG5odXdtZW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMDgyODAsImV4cCI6MjA4NTU4NDI4MH0.wMKYEcXGOgrRwy7DKBlBz-a_mWhAuZaknG_iXYvKLLo';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    const { data, error } = await supabase
        .from('INDENT-PO')
        .select('id, "Indent Id.", Status, Planned3, Actual3, Actual4')
        .limit(20);

    if (error) {
        console.error(error);
    } else {
        console.log(JSON.stringify(data, null, 2));
    }
}

checkData();
