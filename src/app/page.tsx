import { headers } from "next/headers";
import { WardrobeView } from "@/components/WardrobeView";
import { firstNameOf, requireUser } from "@/lib/auth";
import { isDevSwitcherEnabled } from "@/lib/server/dev-accounts";
import { closetTitle } from "@/lib/config";
import {
  fetchAppSettings,
  fetchDailySuggestion,
  fetchItems,
  fetchOccasionTags,
  fetchOutfits,
} from "@/lib/data/wardrobe-repository";

// Without this, Next prerenders "/" once at build time. Items can be added
// from either the deployed site or a local dev instance, both writing to
// the same Supabase database — but revalidatePath() only invalidates the
// cache of the process that calls it, so a local add wouldn't refresh the
// deployed page's cache. Forcing dynamic rendering means the deployed page
// always reflects the current database instead of going stale.
export const dynamic = "force-dynamic";

// The Add Item server action runs inside this route's function: remove.bg
// round-trip + sharp processing + two Supabase uploads can take well over
// Vercel's default 10s cap. 60s is the Hobby-tier ceiling and plenty here.
export const maxDuration = 60;

/**
 * First-run convenience only: Vercel's edge adds these headers, so we can
 * prefill the location box with a guess. It is never saved without the user
 * picking it — see LocationSettings.
 */
async function ipLocationGuess(): Promise<string | null> {
  const h = await headers();
  const city = h.get("x-vercel-ip-city");
  if (!city) return null;
  const region = h.get("x-vercel-ip-country-region");
  return [decodeURIComponent(city), region].filter(Boolean).join(", ");
}

export default async function Home() {
  // Middleware already routes signed-out visitors away, but this page must
  // never render without a user even if that's bypassed. getSession() is
  // cached per request, so the repository reads below reuse this same check.
  const { user } = await requireUser();

  const [items, outfits, daily, settings, occasionTags, guess] =
    await Promise.all([
      fetchItems(),
      fetchOutfits(),
      fetchDailySuggestion(),
      fetchAppSettings(),
      fetchOccasionTags(),
      ipLocationGuess(),
    ]);

  return (
    <WardrobeView
      title={closetTitle(firstNameOf(user))}
      accountEmail={user.email ?? null}
      initialItems={items}
      initialOutfits={outfits}
      suggestion={daily.suggestion}
      occasionTags={occasionTags}
      settings={settings}
      ipLocationGuess={guess}
      // The product-link mode needs a real local browser (Puppeteer),
      // which can't run on Vercel (no display) — so only that mode is
      // hidden on the deployed site. Photo upload works everywhere, since
      // background removal now runs via the remove.bg API instead of a
      // local model (see src/lib/server/remove-bg-api.ts).
      canFetchFromLink={!process.env.VERCEL}
      // Never true on the deployed site; the switcher needs the service-role
      // key, which is deliberately not a Vercel environment variable.
      showAdminLink={isDevSwitcherEnabled()}
    />
  );
}
