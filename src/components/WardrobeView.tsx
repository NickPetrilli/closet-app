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
import { OutfitGrid } from "./OutfitGrid";

export function WardrobeView({
  initialItems,
  outfits,
  suggestion,
}: {
  initialItems: ClothingItem[];
  outfits: Outfit[];
  suggestion: DailySuggestion;
}) {
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedItem = items.find((item) => item.id === selectedId) ?? null;

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
          onSelectItem={setSelectedId}
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
            onSelectItem={setSelectedId}
          />
        ) : (
          <ItemGrid items={visibleItems} onSelect={setSelectedId} />
        )}
      </div>

      {/* Detail panel overlay */}
      <ItemDetailPanel
        item={selectedItem}
        onClose={() => setSelectedId(null)}
        onUpdate={updateItem}
      />
    </main>
  );
}
