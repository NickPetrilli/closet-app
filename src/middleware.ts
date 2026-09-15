import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { GATE_COOKIE, isGateCookieValid } from "@/lib/gate";

/**
 * Runs before every page and Server Action request. It does two jobs:
 *
 * 1. Refreshes the Supabase session and writes the renewed tokens back to
 *    cookies. Server Components can't set cookies, so this is where refresh
 *    has to happen (per Supabase's App Router guide).
 * 2. Routes by state:
 *      signed in                -> the app; /unlock and /sign-in bounce to /
 *      unlocked, not signed in  -> /sign-in only
 *      neither                  -> /unlock only
 *
 * Page-level redirects are convenience. The Server Actions re-check
 * everything themselves (requireUser, and signUp re-checks the gate cookie),
 * and RLS enforces separation in the database.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() revalidates the token with Supabase rather than trusting the
  // cookie as-is, which is what makes the routing below safe to rely on.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  const redirectTo = (pathname: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    const redirect = NextResponse.redirect(url);
    // Carry over any refreshed session cookies set above.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  if (user) {
    return path === "/unlock" || path === "/sign-in"
      ? redirectTo("/")
      : response;
  }

  const unlocked = await isGateCookieValid(
    request.cookies.get(GATE_COOKIE)?.value
  );
  if (!unlocked) {
    return path === "/unlock" ? response : redirectTo("/unlock");
  }
  return path === "/sign-in" ? response : redirectTo("/sign-in");
}

export const config = {
  // Everything except static assets and the PWA's public files. The manifest,
  // icons, service worker and offline page must load without a session, or
  // install and the offline fallback break.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|manifest.webmanifest|sw.js|icons/|offline).*)",
  ],
};
