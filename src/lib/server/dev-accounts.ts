import { createClient } from "@supabase/supabase-js";

/**
 * Local-only account switching, for managing everyone's closets from one dev
 * machine.
 *
 * Why this exists: the Aritzia link-fetch mode needs a real local browser and
 * so only runs on this machine (see docs/DEPLOYMENT.md), but it writes to the
 * SAME Supabase project the live site uses. Loading clothes into someone's
 * closet therefore means being signed in as them locally, and their password
 * isn't ours to know.
 *
 * Why it is safe to ship in the repo: it refuses to do anything unless all
 * three hold — not on Vercel, not a production build, and the service-role key
 * is present. That key lives only in the local .env and is deliberately NOT a
 * Vercel environment variable, so even if a route were somehow reached in
 * production it has nothing to mint a session with. The page itself also 404s
 * when this returns false.
 */
export function isDevSwitcherEnabled(): boolean {
  return (
    !process.env.VERCEL &&
    process.env.NODE_ENV !== "production" &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

/**
 * A service-role client. It bypasses RLS entirely, so it must never be used
 * for anything the app proper does — only for listing accounts and minting a
 * local session below. Never import this from a "use client" component.
 */
function adminClient() {
  if (!isDevSwitcherEnabled()) {
    throw new Error("The dev account switcher is disabled.");
  }
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export interface DevAccount {
  id: string;
  email: string;
  firstName: string | null;
  createdAt: string;
  itemCount: number;
  outfitCount: number;
}

/** Every account in the project, with how much is in each closet. */
export async function listDevAccounts(): Promise<DevAccount[]> {
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.listUsers({ perPage: 100 });
  if (error) throw new Error(error.message);

  return Promise.all(
    data.users.map(async (user) => {
      const [items, outfits] = await Promise.all([
        admin
          .from("items")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id),
        admin
          .from("outfits")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);
      return {
        id: user.id,
        email: user.email ?? "(no email)",
        firstName:
          typeof user.user_metadata?.first_name === "string"
            ? user.user_metadata.first_name
            : null,
        createdAt: user.created_at,
        itemCount: items.count ?? 0,
        outfitCount: outfits.count ?? 0,
      };
    })
  );
}

/**
 * A one-time token that can be exchanged for a session, without the password
 * and without sending any email. `generateLink` only RETURNS the link — mail
 * delivery is what the app can't do at all (see the accounts decisions).
 */
export async function devSessionToken(email: string): Promise<string> {
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error) throw new Error(error.message);
  const token = data.properties?.hashed_token;
  if (!token) throw new Error("Supabase returned no token for that account.");
  return token;
}
