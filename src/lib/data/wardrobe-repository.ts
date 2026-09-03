import { chooseSuggestion } from "@/lib/server/suggest-outfit";
import { RECENTLY_WORN_DAYS } from "@/lib/server/suggest-outfit-core";
import { getLocalToday, getWeather, readStoredLocation } from "@/lib/server/weather";
import { supabase } from "@/lib/supabase/client";
import type {
  AppSettings,
  Category,
  ClothingItem,
  DailySuggestion,
  OccasionTag,
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
  created_at: string;
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
    createdAt: row.created_at,
  };
}

export async function fetchItems(): Promise<ClothingItem[]> {
  const { data, error } = await supabase
    .from("items")
    .select(
      "id, name, category, silhouette, primary_color_hex, secondary_color_hex, image_url, cutout_image_url, source_photo_urls, product_url, created_at"
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
 * Seeded tags plus anything Jenna has added.
 *
 * Degrades to an empty list rather than throwing: migrations here are applied
 * by hand (the anon key can't run DDL), so between deploying this and running
 * 002-wear-log.sql these tables don't exist. Throwing would take the whole
 * live page down over a missing occasion row; an empty list just hides the
 * picker until the SQL runs.
 */
export async function fetchOccasionTags(): Promise<OccasionTag[]> {
  const { data, error } = await supabase
    .from("occasion_tags")
    .select("id, label")
    .order("label", { ascending: true });

  if (error) {
    console.warn(`fetchOccasionTags: ${error.message}`);
    return [];
  }
  return (data ?? []) as OccasionTag[];
}

/** The occasion picked for today, if any. Survives a reload; resets each day. */
export async function fetchTodayOccasion(): Promise<string | null> {
  const today = await getLocalToday();
  const { data } = await supabase
    .from("daily_state")
    .select("occasion_tag")
    .eq("day", today)
    .maybeSingle();

  return data?.occasion_tag ?? null;
}

/**
 * Item ids worn in the last `days` days — both saved outfits (resolved
 * through outfit_items) and ad-hoc combinations logged by item id.
 */
export async function fetchRecentlyWornItemIds(
  days = RECENTLY_WORN_DAYS
): Promise<Set<string>> {
  const today = await getLocalToday();
  const since = new Date(`${today}T00:00:00Z`);
  since.setUTCDate(since.getUTCDate() - days);
  const sinceDay = since.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("wear_log")
    .select("outfit_id, item_ids")
    .gte("worn_on", sinceDay);

  // Same reasoning as fetchOccasionTags: no wear_log table yet means nothing
  // has been worn, not that the page should fail.
  if (error) {
    console.warn(`fetchRecentlyWornItemIds: ${error.message}`);
    return new Set();
  }

  const ids = new Set<string>();
  const outfitIds: string[] = [];
  for (const row of data ?? []) {
    for (const id of (row.item_ids ?? []) as string[]) ids.add(id);
    if (row.outfit_id) outfitIds.push(row.outfit_id as string);
  }

  if (outfitIds.length > 0) {
    const { data: members } = await supabase
      .from("outfit_items")
      .select("item_id")
      .in("outfit_id", outfitIds);
    for (const row of members ?? []) ids.add(row.item_id as string);
  }

  return ids;
}

/** What has already been logged today, so the card can show its confirmed state. */
async function fetchTodaysWearLog(): Promise<
  { outfitId: string | null; itemIds: string[] }[]
> {
  const today = await getLocalToday();
  const { data } = await supabase
    .from("wear_log")
    .select("outfit_id, item_ids")
    .eq("worn_on", today);

  return (data ?? []).map((row) => ({
    outfitId: (row.outfit_id as string | null) ?? null,
    itemIds: ((row.item_ids ?? []) as string[]) ?? [],
  }));
}

function sameItems(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

export interface SuggestionOptions {
  /** Overrides the stored selection — used when Jenna taps a different occasion. */
  occasion?: string | null;
  excludeOutfitIds?: string[];
  excludeItemIds?: string[];
}

export interface DailySuggestionResult {
  suggestion: DailySuggestion;
  /** Set when the AI fallback failed; the suggestion is still usable. */
  error?: string;
}

/**
 * Today's suggestion: real weather (Phase 1), the chosen occasion, and an
 * outfit that suits both — a saved one where possible, an AI-composed one
 * only when nothing saved fits (Phase 3).
 */
export async function fetchDailySuggestion(
  options: SuggestionOptions = {}
): Promise<DailySuggestionResult> {
  const [items, outfits, weather, tags, storedOccasion, recentlyWorn, wornToday] =
    await Promise.all([
      fetchItems(),
      fetchOutfits(),
      fetchWeather(),
      fetchOccasionTags(),
      fetchTodayOccasion(),
      fetchRecentlyWornItemIds(),
      fetchTodaysWearLog(),
    ]);

  const occasion =
    options.occasion !== undefined ? options.occasion : storedOccasion;
  const occasionLabel =
    tags.find((tag) => tag.id === occasion)?.label ?? occasion ?? null;

  const { suggestion, error } = await chooseSuggestion(
    {
      items,
      outfits,
      weather,
      occasion,
      recentlyWorn,
      excludeOutfitIds: options.excludeOutfitIds,
      excludeItemIds: options.excludeItemIds,
    },
    occasionLabel
  );

  const loggedToday = wornToday.some((row) =>
    suggestion.outfitId
      ? row.outfitId === suggestion.outfitId
      : sameItems(row.itemIds, suggestion.itemIds)
  );

  return { suggestion: { ...suggestion, loggedToday }, error };
}
