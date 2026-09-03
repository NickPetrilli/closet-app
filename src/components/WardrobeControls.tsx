"use client";

import { colorSortKey, colorTerms } from "@/lib/color";
import { categoryLabel, type ClothingItem } from "@/lib/types";

/**
 * Search and sort for the wardrobe grid. Entirely client-side over the items
 * already loaded — no query round-trip, so it filters as you type.
 */

export type SortOrder = "newest" | "name" | "color";

export const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "name", label: "Name A–Z" },
  { value: "color", label: "By color" },
];

/**
 * Everything a search should match for one item: its name, its category, and
 * the words someone might use for its color ("navy", "blue", "dark").
 */
function searchHaystack(item: ClothingItem): string {
  return [
    item.name,
    categoryLabel(item.category),
    item.silhouette ?? "",
    ...colorTerms(item.primaryColorHex),
    ...(item.secondaryColorHex ? colorTerms(item.secondaryColorHex) : []),
  ]
    .join(" ")
    .toLowerCase();
}

/**
 * Every word in the query has to match something, so "blue jean" narrows
 * rather than widening the way a single joined string would.
 */
export function matchesQuery(item: ClothingItem, query: string): boolean {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = searchHaystack(item);
  return terms.every((term) => haystack.includes(term));
}

export function sortItems(
  items: ClothingItem[],
  order: SortOrder
): ClothingItem[] {
  const sorted = [...items];
  switch (order) {
    case "name":
      return sorted.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      );
    case "color":
      return sorted.sort(
        (a, b) =>
          colorSortKey(a.primaryColorHex) - colorSortKey(b.primaryColorHex)
      );
    case "newest":
    default:
      // The repository returns oldest-first, so without createdAt the existing
      // order reversed is still the right answer.
      return sorted.reverse().sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }
}

export function WardrobeControls({
  query,
  onQueryChange,
  order,
  onOrderChange,
  resultCount,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  order: SortOrder;
  onOrderChange: (value: SortOrder) => void;
  /** Announced to screen readers as the results change. */
  resultCount: number;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="relative flex-1">
        <svg
          viewBox="0 0 16 16"
          className="pointer-events-none absolute top-1/2 left-3.5 h-3.5 w-3.5 -translate-y-1/2 text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="7" cy="7" r="4.5" />
          <path d="M10.5 10.5 14 14" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Name, category, or color"
          aria-label="Search your wardrobe"
          className="w-full rounded-full border border-line-dark bg-cream/50 py-2.5 pr-9 pl-10 text-sm focus:border-ink focus:outline-none"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            aria-label="Clear search"
            className="absolute top-1/2 right-3 flex h-5 w-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:text-ink"
          >
            <svg
              viewBox="0 0 16 16"
              className="h-3 w-3"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        )}
      </div>

      <div className="relative shrink-0">
        <select
          value={order}
          onChange={(e) => onOrderChange(e.target.value as SortOrder)}
          aria-label="Sort your wardrobe"
          className="eyebrow w-full cursor-pointer appearance-none rounded-full border border-line-dark bg-cream/50 py-2.5 pr-9 pl-5 text-ink-soft focus:border-ink focus:outline-none sm:w-auto"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <svg
          viewBox="0 0 12 8"
          className="pointer-events-none absolute top-1/2 right-4 h-2 w-3 -translate-y-1/2 text-ink-soft"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          aria-hidden="true"
        >
          <path d="M1 1.5l5 5 5-5" />
        </svg>
      </div>

      <p aria-live="polite" className="sr-only">
        {resultCount} {resultCount === 1 ? "piece" : "pieces"} shown
      </p>
    </div>
  );
}
