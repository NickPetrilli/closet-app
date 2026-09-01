// Diagnoses .env formatting problems WITHOUT printing secret values.
const url = process.env.SUPABASE_URL ?? "";
const anonKey = process.env.SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function report(name, value, expectedPattern) {
  console.log(`\n${name}`);
  console.log(`  length: ${value.length}`);
  console.log(`  starts with quote/space: ${/^['"\s]/.test(value)}`);
  console.log(`  ends with quote/space: ${/['"\s]$/.test(value)}`);
  console.log(`  has trailing slash: ${value.endsWith("/")}`);
  console.log(`  matches expected shape: ${expectedPattern.test(value)}`);
}

report("SUPABASE_URL", url, /^https:\/\/[a-z0-9-]+\.supabase\.co$/);
report("SUPABASE_ANON_KEY", anonKey, /^ey[\w-]+\.[\w-]+\.[\w-]+$/);
report("SUPABASE_SERVICE_ROLE_KEY", serviceKey, /^ey[\w-]+\.[\w-]+\.[\w-]+$/);
