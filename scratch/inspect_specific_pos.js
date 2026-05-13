import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jcgmyvxcamstnhuwmemc.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZ215dnhjYW1zdG5odXdtZW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMDgyODAsImV4cCI6MjA4NTU4NDI4MH0.wMKYEcXGOgrRwy7DKBlBz-a_mWhAuZaknG_iXYvKLLo'

const supabase = createClient(supabaseUrl, supabaseKey)

const poNumbers = ['PMPPL/PO/25-26/2559', 'PMPPL/PO/25-26/2559-1']

async function findPO() {
  console.log('Searching for POs:', poNumbers)
  
  const { data: poRows, error: poError } = await supabase
    .from('INDENT-PO')
    .select('*')
    .in('po_number', poNumbers)

  if (poError) {
    console.error('Error fetching POs:', poError.message)
    return
  }

  const indentIds = poRows.map(row => row["Indent Id."])
  console.log('Indent IDs found:', indentIds)

  const { data: liftRows, error: liftError } = await supabase
    .from('LIFT-ACCOUNTS')
    .select('*')
  
  if (liftError) {
    console.error('Error fetching lifts:', liftError.message)
    return
  }

  const matchingLifts = liftRows.filter(l => indentIds.includes(l["Indent no."]))
  console.log(`Found ${matchingLifts.length} matching lift entries.`)

  matchingLifts.forEach(row => {
    console.log('-------------------')
    console.log(`Lift No: ${row["Lift No"]}`)
    console.log(`Indent No: ${row["Indent no."]}`)
    console.log(`Lifting Qty: ${row["Lifting Qty"]}`)
    console.log(`Bill No: ${row["Bill No."]}`)
    console.log(`Truck No: ${row["Truck No."]}`)
    console.log(`Timestamp: ${row.Timestamp}`)
  })

  // Calculate pending quantity for each PO
  poRows.forEach(po => {
    const totalQty = parseFloat(po["Total Quantity"] || 0)
    const liftedQty = matchingLifts
      .filter(l => l["Indent no."] === po["Indent Id."])
      .reduce((sum, l) => sum + parseFloat(l["Lifting Qty"] || 0), 0)
    
    console.log(`PO: ${po.po_number}, Indent: ${po["Indent Id."]}, Total: ${totalQty}, Lifted: ${liftedQty}, Pending: ${totalQty - liftedQty}, Planned4: ${po.Planned4}, Status: ${JSON.stringify(po.Status)} (${typeof po.Status})`)
  })
}

findPO().then(async () => {
  if (process.argv.includes('--firms')) {
    const { data: firms, error: firmError } = await supabase.from('Firms').select('*');
    if (firmError) {
      console.error('Error fetching firms:', firmError);
    } else {
      console.log('Firms in database:');
      firms.forEach(f => console.log(`- ${f.firm_name} (data_name: ${f.data_name})`));
    }
  }
})
