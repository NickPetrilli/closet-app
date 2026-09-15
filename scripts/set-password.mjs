// Sets a new password for an account, for when someone forgets theirs. The
// app can't send email (no reset link, no magic link), so an admin sets a
// temporary password and tells the person directly. Run from the project root:
//   node --env-file=.env scripts/set-password.mjs someone@example.com newpassword
//
// Uses the service_role key via the Auth admin API — local only, never on
// Vercel.
import { createClient } from "@supabase/supabase-js";
import { findUserByEmail } from "./find-user.mjs";

const [email, password] = process.argv.slice(2);
if (!email || !password) {
  console.error(
    "Usage: node --env-file=.env scripts/set-password.mjs <email> <new password>"
  );
  process.exit(1);
}

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

try {
  const user = await findUserByEmail(supabase, email);
  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    password,
  });
  // Supabase enforces its own minimum length here (Authentication → Sign In /
  // Providers → Email), so a too-short password fails with its message.
  if (error) throw new Error(error.message);
  console.log(`Password updated for ${user.email}.`);
} catch (err) {
  console.error("Failed:", err.message);
  process.exit(1);
}
