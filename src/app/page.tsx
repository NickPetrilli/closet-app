import { WardrobeView } from "@/components/WardrobeView";
import {
  fetchDailySuggestion,
  fetchItems,
  fetchOutfits,
} from "@/lib/data/wardrobe-repository";

// Without this, Next prerenders "/" once at build time. New items are added
// by running the app locally (see canAddItems below) against the same
// Supabase database the deployed site reads from — revalidatePath() from
// that local process can't invalidate the deployed instance's cache, since
// they're separate processes. Forcing dynamic rendering means the deployed
// page always reflects the current database instead of going stale.
export const dynamic = "force-dynamic";

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
      // Add Item needs a local browser (Puppeteer) and a local background-
      // removal model, neither of which ship to the deployed Vercel
      // function (see next.config.ts) — so it's local-dev only.
      canAddItems={!process.env.VERCEL}
    />
  );
}
