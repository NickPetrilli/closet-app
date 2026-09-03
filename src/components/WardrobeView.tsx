"use client";

import { useEffect, useMemo, useState } from "react";
import { APP_NAME, APP_TAGLINE } from "@/lib/config";
import type {
  AppSettings,
  CategoryFilter,
  ClothingItem,
  DailySuggestion,
  OccasionTag,
  Outfit,
} from "@/lib/types";
import { AddItemButton } from "./AddItemButton";
import { CategoryTabs } from "./CategoryTabs";
import { DailySuggestionCard } from "./DailySuggestionCard";
import { ItemDetailPanel } from "./ItemDetailPanel";
import { ItemGrid } from "./ItemGrid";
import {
  WardrobeControls,
  matchesQuery,
  sortItems,
  type SortOrder,
} from "./WardrobeControls";
import { LocationSettings } from "./LocationSettings";
import { OutfitActionsBanner } from "./OutfitActionsBanner";
import { OutfitDetailPanel } from "./OutfitDetailPanel";
import { OutfitGrid } from "./OutfitGrid";

export function WardrobeView({
  initialItems,
  initialOutfits,
  suggestion,
  occasionTags,
  settings,
  ipLocationGuess,
  canFetchFromLink,
}: {
  initialItems: ClothingItem[];
  initialOutfits: Outfit[];
  suggestion: DailySuggestion;
  occasionTags: OccasionTag[];
  settings: AppSettings;
  ipLocationGuess: string | null;
  canFetchFromLink: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [outfits, setOutfits] = useState(initialOutfits);

  // Re-sync when the server sends fresh data (e.g. router.refresh() after
  // adding an item) — useState's initial value only applies on first mount.
  useEffect(() => setItems(initialItems), [initialItems]);
  useEffect(() => setOutfits(initialOutfits), [initialOutfits]);

  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedOutfitId, setSelectedOutfitId] = useState<string | null>(
    null
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [order, setOrder] = useState<SortOrder>("newest");

  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;
  const selectedOutfit =
    outfits.find((outfit) => outfit.id === selectedOutfitId) ?? null;

  const visibleItems = useMemo(() => {
    const inCategory =
      filter === "all" ? items : items.filter((item) => item.category === filter);
    const matching = query
      ? inCategory.filter((item) => matchesQuery(item, query))
      : inCategory;
    return sortItems(matching, order);
  }, [items, filter, query, order]);

  function updateItem(id: string, patch: Partial<ClothingItem>) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  function updateOutfit(id: string, patch: Partial<Outfit>) {
    setOutfits((prev) =>
      prev.map((outfit) =>
        outfit.id === id ? { ...outfit, ...patch } : outfit
      )
    );
  }

  /** The two detail panels are mutually exclusive. */
  function openItem(id: string) {
    setSelectedOutfitId(null);
    setSelectedItemId(id);
  }

  function openOutfit(id: string) {
    setSelectedItemId(null);
    setSelectedOutfitId(id);
  }

  return (
    <main className="mx-auto max-w-6xl px-6 pt-12 pb-24 lg:px-10">
      {/* Header */}
      <header className="flex items-end justify-between gap-4 border-b border-edge-subtle pb-7">
        <div>
          <p className="eyebrow text-accent">{APP_TAGLINE}</p>
          <h1 className="mt-1.5 font-serif text-4xl tracking-tight sm:text-6xl">
            {APP_NAME}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <p className="meta mb-1 whitespace-nowrap rounded-full border border-edge bg-surface-raised/50 px-3.5 py-1.5 text-ink-secondary">
            {items.length} Pieces
          </p>
          <LocationSettings
            currentLabel={settings.locationLabel}
            ipGuess={ipLocationGuess}
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
          />
        </div>
      </header>

      {/* Daily suggestion */}
      <div className="mt-8">
        <DailySuggestionCard
          suggestion={suggestion}
          occasionTags={occasionTags}
          items={items}
          onOpenLocationSettings={() => setSettingsOpen(true)}
          onSelectItem={openItem}
        />
      </div>

      {/* Filter tabs — Add Item rides along on every tab except Outfits,
          which gets its own action banner below instead (see next block).
          On phones the two stack so the scrollable tab strip gets the full
          width instead of being squeezed next to the button. */}
      <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <CategoryTabs active={filter} onChange={setFilter} />
        {filter !== "outfits" && (
          <div className="sm:shrink-0">
            <AddItemButton canFetchFromLink={canFetchFromLink} />
          </div>
        )}
      </div>

      {/* Search + sort — its own row so the scrollable tab strip keeps its
          full width, and so the two stack cleanly on a phone. */}
      {filter !== "outfits" && (
        <div className="mt-4">
          <WardrobeControls
            query={query}
            onQueryChange={setQuery}
            order={order}
            onOrderChange={setOrder}
            resultCount={visibleItems.length}
          />
        </div>
      )}

      {/* Outfit actions — a dedicated banner, not squeezed onto the tabs row */}
      {filter === "outfits" && (
        <div className="mt-6">
          <OutfitActionsBanner items={items} />
        </div>
      )}

      {/* Grid */}
      <div className="mt-8">
        {filter === "outfits" ? (
          <OutfitGrid
            outfits={outfits}
            items={items}
            onSelect={openOutfit}
            onSelectItem={openItem}
          />
        ) : (
          <ItemGrid
            items={visibleItems}
            onSelect={openItem}
            emptyTitle={query ? "No pieces match that." : "Nothing here yet."}
            emptyHint={
              query
                ? "Try a different word, or clear the search"
                : "Pieces you add will appear in this view"
            }
          />
        )}
      </div>

      {/* Detail panel overlays */}
      <ItemDetailPanel
        item={selectedItem}
        outfits={outfits}
        onClose={() => setSelectedItemId(null)}
        onUpdate={updateItem}
        onSelectOutfit={openOutfit}
      />
      <OutfitDetailPanel
        outfit={selectedOutfit}
        items={items}
        onClose={() => setSelectedOutfitId(null)}
        onSelectItem={openItem}
        onUpdate={updateOutfit}
      />
    </main>
  );
}
