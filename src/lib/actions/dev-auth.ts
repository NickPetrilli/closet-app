"use server";

import { redirect } from "next/navigation";
import { devSessionToken, isDevSwitcherEnabled } from "@/lib/server/dev-accounts";
import { getSupabase } from "@/lib/supabase/server";

/**
 * Signs this machine in as the chosen account, without its password. Local
 * development only — see the guard notes in src/lib/server/dev-accounts.ts.
 */
export async function switchToAccount(formData: FormData): Promise<void> {
  if (!isDevSwitcherEnabled()) {
    throw new Error("The dev account switcher is disabled.");
  }

  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    throw new Error("No account was chosen.");
  }

  // The admin API mints a one-time token; verifying it here (on the client
  // bound to this request's cookies) is what actually writes the session
  // cookies, exactly as a real sign-in would. Only the id crosses the wire —
  // the helper resolves the email itself, so a stale page can't name an
  // address that would create an account instead of finding one.
  const tokenHash = await devSessionToken(id);
  const supabase = await getSupabase();
  const { error } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });
  if (error) throw new Error(error.message);

  redirect("/");
}
