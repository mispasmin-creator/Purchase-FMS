import fs from 'fs';

const content = fs.readFileSync('c:/Users/ASUS/Downloads/Passary/Purchase FMS/Purchase-FMS/src/components/ManagementApprovals.jsx', 'utf8');
const lines = content.split('\n');
console.log("--- Searching for fetch / load logic in ManagementApprovals.jsx ---");
lines.forEach((line, index) => {
  if (line.includes('fetch') || line.includes('from') || line.includes('select') || line.includes('supabase')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
