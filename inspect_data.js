import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function inspectData() {
  console.log('--- INDENT-PO ---')
  const { data: poData, error: poErr } = await supabase.from('INDENT-PO').select('*').limit(1)
  if (poErr) console.error(poErr)
  else console.log(JSON.stringify(poData?.[0], null, 2))

  console.log('\n--- LIFT-ACCOUNTS ---')
  const { data: liftData, error: liftErr } = await supabase.from('LIFT-ACCOUNTS').select('*').limit(5)
  if (liftErr) console.error(liftErr)
  else {
    console.log('Count:', liftData?.length)
    console.log(JSON.stringify(liftData?.[0], null, 2))
    
    const withDate = liftData?.filter(r => r["Date Of Receiving"] !== null).length
    console.log('Rows with "Date Of Receiving":', withDate)
  }
}

inspectData()
