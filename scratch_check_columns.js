import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://jcgmyvxcamstnhuwmemc.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZ215dnhjYW1zdG5odXdtZW1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwMDgyODAsImV4cCI6MjA4NTU4NDI4MH0.wMKYEcXGOgrRwy7DKBlBz-a_mWhAuZaknG_iXYvKLLo";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const { data, error } = await supabase.rpc("get_columns_info", {});
  
  if (error) {
    // If rpc doesn't exist, try querying a raw SQL query or select columns via API.
    // Supabase has /rest/v1/rpc/get_columns_info, but let's query the table definition if we can.
    console.log("RPC error:", error.message);
    
    // Fallback: let's try reading schema via HTTP request or just querying the columns of a single row.
    // Wait, the REST API returns types if we request it, or we can see it via metadata.
    // Let's run a select query and check the types of returned values.
    const { data: firstRow } = await supabase.from("Purchase Returns").select("*").limit(1);
    if (firstRow && firstRow[0]) {
       console.log("First row values and types:");
       for (const [k, v] of Object.entries(firstRow[0])) {
          console.log(`- ${k}: value=${v}, typeof=${typeof v}`);
       }
    }
  } else {
    console.log("Columns info:", data);
  }
}

run();
