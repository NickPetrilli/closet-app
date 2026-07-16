export type Category =
  | "tops"
  | "jackets"
  | "bottoms"
  | "accessories"
  | "shoes"
  | "outfits";

/** "all" is a UI-only filter value; items themselves always have a concrete Category. */
export type CategoryFilter = Category | "all";

export interface ClothingItem {
  id: string;
  name: string;
  category: Category;
  primaryColorHex: string;
  secondaryColorHex: string | null;
  /** Placeholder path for now; becomes a real CDN/storage URL later. */
  imageUrl: string;
  /** Original photos the item was captured from (1–2 mock entries for now). */
  sourcePhotoUrls: string[];
}

export interface Outfit {
  id: string;
  name: string;
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
