import { createClient } from "@supabase/supabase-js";

/**
 * Deliberately NOT using NEXT_PUBLIC_-prefixed env vars: this app has no
 * auth/RLS, so the anon key must never reach browser JS — it stays
 * server-only by only ever being read here, and this module must only be
 * imported from Server Components/route handlers, never a "use client"
 * component. If a future feature needs Supabase from the client, that's the
 * moment to revisit this (RLS + policies, or a server-side proxy route).
 * Admin tasks (seeding, storage writes) use the service_role key instead —
 * see scripts/seed-items.ts.
 */
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);
