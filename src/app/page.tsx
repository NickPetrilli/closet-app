import { WardrobeView } from "@/components/WardrobeView";
import {
  fetchDailySuggestion,
  fetchItems,
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

export default async function Home() {
  const [items, outfits, suggestion] = await Promise.all([
    fetchItems(),
    fetchOutfits(),
    fetchDailySuggestion(),
  ]);

  return (
    <WardrobeView
      initialItems={items}
      initialOutfits={outfits}
      suggestion={suggestion}
      // The Aritzia link-fetch mode needs a real local browser (Puppeteer),
      // which can't run on Vercel (no display) — so only that mode is
      // hidden on the deployed site. Photo upload works everywhere, since
      // background removal now runs via the remove.bg API instead of a
      // local model (see src/lib/server/remove-bg-api.ts).
      canFetchFromLink={!process.env.VERCEL}
    />
  );
}
