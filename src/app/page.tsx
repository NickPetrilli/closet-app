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
    />
  );
}
