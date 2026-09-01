import { WardrobeView } from "@/components/WardrobeView";
import {
  fetchDailySuggestion,
  fetchItems,
  fetchOutfits,
} from "@/lib/data/wardrobe-repository";

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
