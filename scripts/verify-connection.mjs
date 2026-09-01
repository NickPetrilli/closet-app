// One-off check that .env is wired up correctly. Run with:
//   node --env-file=.env scripts/verify-connection.mjs
// Never logs the actual key/URL values.
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY.");
  process.exit(1);
}

async function check(label, client) {
  const { data, error, status, statusText } = await client.from("items").select("id");
  if (error) {
    console.log(`${label}: FAILED (${status} ${statusText}) — ${error.message}`);
    return false;
  }
  console.log(`${label}: OK — ${data.length} row(s).`);
  return true;
}

await check("anon key", createClient(url, anonKey));

if (serviceKey) {
  await check("service_role key", createClient(url, serviceKey));
} else {
  console.log("service_role key: not set, skipping.");
}
