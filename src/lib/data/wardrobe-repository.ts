import { supabase } from "@/lib/supabase/client";
import type { Category, ClothingItem, DailySuggestion, Outfit } from "@/lib/types";

/**
 * Data-access layer. UI components never touch Supabase directly — they
 * call these functions. Keeping the signatures async/shaped the same as
 * before means the mock → real-database swap required no changes upstream.
 * See supabase/schema.sql for the table definitions this queries.
 */

interface ItemRow {
  id: string;
  name: string;
  category: Category;
  silhouette: string | null;
  primary_color_hex: string;
  secondary_color_hex: string | null;
  image_url: string;
  cutout_image_url: string | null;
  source_photo_urls: string[];
  product_url: string | null;
}

function toClothingItem(row: ItemRow): ClothingItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    silhouette: (row.silhouette as ClothingItem["silhouette"]) ?? undefined,
    primaryColorHex: row.primary_color_hex,
    secondaryColorHex: row.secondary_color_hex,
    imageUrl: row.image_url,
    cutoutImageUrl: row.cutout_image_url,
    sourcePhotoUrls: row.source_photo_urls,
    productUrl: row.product_url,
  };
}

export async function fetchItems(): Promise<ClothingItem[]> {
  const { data, error } = await supabase
    .from("items")
    .select(
      "id, name, category, silhouette, primary_color_hex, secondary_color_hex, image_url, cutout_image_url, source_photo_urls, product_url"
    )
    .order("created_at", { ascending: true });

  if (error) throw new Error(`fetchItems: ${error.message}`);
  return (data as ItemRow[]).map(toClothingItem);
}

interface OutfitRow {
  id: string;
  name: string;
  vibe: Outfit["vibe"];
  outfit_items: { item_id: string; position: number }[];
}

export async function fetchOutfits(): Promise<Outfit[]> {
  const { data, error } = await supabase
    .from("outfits")
    .select("id, name, vibe, outfit_items(item_id, position)")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`fetchOutfits: ${error.message}`);

  return (data as OutfitRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    vibe: row.vibe,
    itemIds: [...row.outfit_items]
      .sort((a, b) => a.position - b.position)
      .map((oi) => oi.item_id),
  }));
}

/**
 * Weather/occasion aren't wired up yet (Prompt 4) — this samples a few real
 * items so the suggestion card has something real to point at instead of
 * dangling mock ids.
 */
export async function fetchDailySuggestion(): Promise<DailySuggestion> {
  const items = await fetchItems();
  const byCategory = (category: Category) =>
    items.find((item) => item.category === category);

  const picks = [
    byCategory("tops"),
    byCategory("bottoms"),
    byCategory("shoes"),
  ].filter((item): item is ClothingItem => item !== undefined);

  return {
    weather: { tempF: 72, condition: "Clear" },
    occasion: "Today",
    itemIds: (picks.length > 0 ? picks : items.slice(0, 3)).map(
      (item) => item.id
    ),
  };
}
