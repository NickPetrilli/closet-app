export type Category =
  | "tops"
  | "jackets"
  | "bottoms"
  | "accessories"
  | "shoes"
  | "outfits";

/** "all" is a UI-only filter value; items themselves always have a concrete Category. */
export type CategoryFilter = Category | "all";

/**
 * Specific garment shape used to pick a placeholder silhouette, so a tank,
 * cami, blazer, skirt, heel, tote, etc. each render differently instead of
 * one generic shape per category. Optional — falls back to a category glyph.
 * Retired once real item photos replace the silhouettes.
 */
export type Silhouette =
  // tops
  | "tee"
  | "tank"
  | "cami"
  | "shirt"
  | "cardigan"
  | "corset"
  | "offshoulder"
  | "hoodie"
  | "sweatshirt"
  | "sweater"
  // jackets
  | "denim-jacket"
  | "blazer"
  | "moto"
  | "trench"
  | "puffer"
  // bottoms
  | "jeans"
  | "wide-trousers"
  | "leggings"
  | "shorts"
  | "mini-skirt"
  | "midi-skirt"
  // accessories
  | "shoulder-bag"
  | "tote"
  | "earrings"
  | "necklace"
  | "cap"
  | "sunglasses"
  | "belt"
  | "scarf"
  // shoes
  | "sneaker"
  | "loafer"
  | "tall-boot"
  | "ankle-boot"
  | "flat"
  | "sandal";

export interface ClothingItem {
  id: string;
  name: string;
  category: Category;
  /** Specific shape for the placeholder glyph; falls back to category. */
  silhouette?: Silhouette;
  primaryColorHex: string;
  secondaryColorHex: string | null;
  /** Storage/CDN URL for the item's photo. */
  imageUrl: string;
  /** Background-removed, isolated-garment version of imageUrl, if generated. */
  cutoutImageUrl?: string | null;
  /** Original photos the item was captured from (1–2 mock entries for now). */
  sourcePhotoUrls: string[];
  /** Retailer listing URL (e.g. the Aritzia product page), for reordering. */
  productUrl?: string | null;
  /**
   * When the item was added, ISO 8601. Optional because the legacy mock set
   * predates it; sorting falls back to insertion order when it's missing.
   */
  createdAt?: string;
}

/**
 * The mood of an outfit — drives which scene backdrop it is rendered
 * against. Later, AI-generated scenes are keyed off the same value.
 */
export type OutfitVibe =
  | "office"
  | "evening"
  | "weekend"
  | "summer"
  | "autumn"
  | "street";

export interface Outfit {
  id: string;
  name: string;
  vibe: OutfitVibe;
  /** References into the clothing items list. */
  itemIds: string[];
}

/**
 * Which hand-drawn weather glyph a forecast maps to. Derived from the WMO
 * weather code (see src/lib/server/weather.ts) so the card never has to
 * switch on raw numbers.
 */
export type WeatherIcon =
  | "sun"
  | "cloud-sun"
  | "cloud"
  | "fog"
  | "drizzle"
  | "rain"
  | "snow"
  | "storm";

/** Normalised Open-Meteo reading — the shape cached in `weather_cache.payload`. */
export interface Weather {
  tempF: number;
  feelsLikeF: number;
  hiF: number;
  loF: number;
  /** Chance of precipitation today, 0-100. */
  precipProbability: number;
  windMph: number;
  /** Raw WMO code, kept so the mapping can change without a cache wipe. */
  code: number;
  condition: string;
  icon: WeatherIcon;
  isDay: boolean;
}

/**
 * The client-safe view of `app_settings`. Deliberately omits latitude and
 * longitude: the browser only ever needs the label, and precise coordinates
 * shouldn't be shipped in the page HTML.
 */
export interface AppSettings {
  locationLabel: string | null;
  hasLocation: boolean;
  timezone: string | null;
}

/** A reason to get dressed. Seeded in the DB, extendable from the card. */
export interface OccasionTag {
  /** Slug, and the value stored in wear_log.occasion_tag. */
  id: string;
  label: string;
}

/** Where a suggestion came from — the card says so, and it drives the copy. */
export type SuggestionSource = "saved" | "ai" | "none";

export interface DailySuggestion {
  /** null when no location is set yet, or the forecast couldn't be fetched. */
  weather: Weather | null;
  /** Selected occasion tag id, or null before one is picked. */
  occasion: string | null;
  /** Set when the pick is one of Jenna's saved outfits. */
  outfitId: string | null;
  outfitName: string | null;
  itemIds: string[];
  /** One line on why this, shown under the weather. */
  rationale: string;
  source: SuggestionSource;
  /** True when a wear_log row already exists for this pick today. */
  loggedToday: boolean;
}

export const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: "tops", label: "Tops" },
  { value: "jackets", label: "Jackets" },
  { value: "bottoms", label: "Bottoms" },
  { value: "accessories", label: "Accessories" },
  { value: "shoes", label: "Shoes" },
  { value: "outfits", label: "Outfits" },
];

export const FILTER_OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  ...CATEGORY_OPTIONS,
];

export function categoryLabel(category: Category): string {
  return CATEGORY_OPTIONS.find((c) => c.value === category)?.label ?? category;
}

/** True once an item has a real photo (vs. a placeholder-only entry). */
export function hasPhoto(imageUrl: string): boolean {
  return imageUrl.startsWith("http");
}
