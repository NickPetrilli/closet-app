"use client";

import { useMemo, useState } from "react";
import { APP_NAME, APP_TAGLINE } from "@/lib/config";
import type {
  CategoryFilter,
  ClothingItem,
  DailySuggestion,
  Outfit,
} from "@/lib/types";
import { CategoryTabs } from "./CategoryTabs";
import { DailySuggestionCard } from "./DailySuggestionCard";
import { ItemDetailPanel } from "./ItemDetailPanel";
import { ItemGrid } from "./ItemGrid";
import { OutfitDetailPanel } from "./OutfitDetailPanel";
import { OutfitGrid } from "./OutfitGrid";

export function WardrobeView({
  initialItems,
  initialOutfits,
  suggestion,
}: {
  initialItems: ClothingItem[];
  initialOutfits: Outfit[];
  suggestion: DailySuggestion;
}) {
  const [items, setItems] = useState(initialItems);
  const [outfits, setOutfits] = useState(initialOutfits);
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedOutfitId, setSelectedOutfitId] = useState<string | null>(
    null
  );

  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;
  const selectedOutfit =
    outfits.find((outfit) => outfit.id === selectedOutfitId) ?? null;

  const visibleItems = useMemo(
    () =>
      filter === "all"
        ? items
        : items.filter((item) => item.category === filter),
    [items, filter]
  );

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
      <header className="flex items-end justify-between border-b border-line-dark pb-7">
        <div>
          <p className="eyebrow text-muted">{APP_TAGLINE}</p>
          <h1 className="mt-1 font-serif text-5xl tracking-tight">
            {APP_NAME}
          </h1>
        </div>
        <p className="eyebrow pb-1 text-ink-soft">
          {items.length} Pieces
        </p>
      </header>

      {/* Daily suggestion */}
      <div className="mt-8">
        <DailySuggestionCard
          suggestion={suggestion}
          items={items}
          onSelectItem={openItem}
        />
      </div>

      {/* Filter tabs */}
      <div className="mt-10">
        <CategoryTabs active={filter} onChange={setFilter} />
      </div>

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
          <ItemGrid items={visibleItems} onSelect={openItem} />
        )}
      </div>

      {/* Detail panel overlays */}
      <ItemDetailPanel
        item={selectedItem}
        onClose={() => setSelectedItemId(null)}
        onUpdate={updateItem}
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
