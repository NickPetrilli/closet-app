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

export interface DailySuggestion {
  weather: {
    tempF: number;
    condition: string;
  };
  occasion: string;
  itemIds: string[];
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
