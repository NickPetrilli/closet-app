import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getSupabase } from "@/lib/supabase/server";

/**
 * The current request's Supabase client and signed-in user (or null).
 * Wrapped in React's cache() so the repository's parallel reads on one page
 * load share one client and one auth check, not one each.
 */
export const getSession = cache(async () => {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
});

/**
 * Call at the top of every Server Action and repository read. It redirects to
 * sign-in when there is no session, and otherwise returns the client plus the
 * user whose id every query must filter on.
 *
 * The database's RLS policies enforce the same separation. Filtering here as
 * well means a missing policy shows up as a real error, not a silently empty
 * page.
 */
export async function requireUser() {
  const { supabase, user } = await getSession();
  if (!user) redirect("/sign-in");
  return { supabase, user };
}

/** The first name collected at sign-up, for "<name>'s Closet". */
export function firstNameOf(user: User): string | null {
  const raw = user.user_metadata?.first_name;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}
