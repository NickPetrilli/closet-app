import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * A Supabase client bound to THIS request's session cookies.
 *
 * Always a fresh client per request, never a module-level singleton. With a
 * signed-in user attached, a shared client on a warm serverless instance could
 * carry one person's session into another person's request.
 *
 * Still deliberately NOT using NEXT_PUBLIC_ env vars: sign-in, sign-up and
 * every query run server-side (Server Components, Server Actions, middleware),
 * so the anon key never needs to reach the browser. Never import this from a
 * "use client" component.
 *
 * Most code should not call this directly. Use requireUser() from
 * src/lib/auth.ts, which hands back this client together with the signed-in
 * user whose id every query must filter on.
 */
export async function getSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Server Components can't write cookies, only Server Actions and
          // route handlers can. That's fine: middleware.ts refreshes the
          // session on every request, so a render never needs to.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component; middleware covers it.
          }
        },
      },
    }
  );
}
