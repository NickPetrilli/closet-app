import type { ClothingItem, DailySuggestion, Outfit } from "@/lib/types";
import { MOCK_DAILY_SUGGESTION, MOCK_ITEMS, MOCK_OUTFITS } from "./mock-items";

/**
 * Data-access layer. UI components never touch mock data directly —
 * they call these functions, which today return in-memory mocks and
 * later will call the real API/database. Keeping the signatures async
 * means swapping in fetch() requires no changes upstream.
 */

export async function fetchItems(): Promise<ClothingItem[]> {
  return MOCK_ITEMS;
}

export async function fetchOutfits(): Promise<Outfit[]> {
  return MOCK_OUTFITS;
}

export async function fetchDailySuggestion(): Promise<DailySuggestion> {
  return MOCK_DAILY_SUGGESTION;
}
