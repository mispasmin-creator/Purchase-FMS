import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jcgmyvxcamstnhuwmemc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZ215dnhjYW1zdG5odXdtZW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMDgyODAsImV4cCI6MjA4NTU4NDI4MH0.wMKYEcXGOgrRwy7DKBlBz-a_mWhAuZaknG_iXYvKLLo'

const supabase = createClient(supabaseUrl, supabaseKey)

async function getColumns() {
  const { data, error } = await supabase
    .from('LIFT-ACCOUNTS')
    .select('*')
    .limit(1)
  
  if (error) {
    console.error('Error:', error.message)
    return
  }
  
  if (data && data.length > 0) {
    console.log('Columns in LIFT-ACCOUNTS:', Object.keys(data[0]))
  } else {
    console.log('No data in LIFT-ACCOUNTS')
  }
}

getColumns()
