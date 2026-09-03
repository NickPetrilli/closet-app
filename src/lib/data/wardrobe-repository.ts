import { getWeather, readStoredLocation } from "@/lib/server/weather";
import { supabase } from "@/lib/supabase/client";
import type {
  AppSettings,
  Category,
  ClothingItem,
  DailySuggestion,
  Outfit,
  Weather,
} from "@/lib/types";

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
 * The client-safe slice of app_settings. Latitude/longitude stay server-side
 * (see readStoredLocation) — the browser only ever needs the label.
 */
export async function fetchAppSettings(): Promise<AppSettings> {
  const location = await readStoredLocation();
  if (location) {
    return {
      locationLabel: location.label || null,
      hasLocation: true,
      timezone: location.timezone,
    };
  }

  // No coordinates saved — still surface a label if one somehow exists.
  const { data } = await supabase
    .from("app_settings")
    .select("location_label, timezone")
    .eq("id", "singleton")
    .maybeSingle();

  return {
    locationLabel: data?.location_label ?? null,
    hasLocation: false,
    timezone: data?.timezone ?? null,
  };
}

/** Today's forecast for the saved location; null if unset or unreachable. */
export async function fetchWeather(): Promise<Weather | null> {
  return getWeather();
}

/**
 * Real weather (Phase 1) around a still-naive item pick — the occasion and
 * outfit-choosing logic land in Phase 3. Until then this samples one item per
 * core category so the card points at real pieces.
 */
export async function fetchDailySuggestion(): Promise<DailySuggestion> {
  const [items, weather] = await Promise.all([fetchItems(), fetchWeather()]);

  const byCategory = (category: Category) =>
    items.find((item) => item.category === category);

  const picks = [
    byCategory("tops"),
    byCategory("bottoms"),
    byCategory("shoes"),
  ].filter((item): item is ClothingItem => item !== undefined);

  return {
    weather,
    occasion: "Today",
    itemIds: (picks.length > 0 ? picks : items.slice(0, 3)).map(
      (item) => item.id
    ),
  };
}
