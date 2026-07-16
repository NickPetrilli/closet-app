"use client";

import type { ClothingItem, Outfit } from "@/lib/types";
import { OutfitCard } from "./OutfitCard";

export function OutfitGrid({
  outfits,
  items,
  onSelect,
  onSelectItem,
}: {
  outfits: Outfit[];
  items: ClothingItem[];
  onSelect: (id: string) => void;
  onSelectItem: (id: string) => void;
}) {
  if (outfits.length === 0) {
    return (
      <div className="border border-line py-24 text-center">
        <p className="font-serif text-2xl italic text-ink-soft">
          No outfits yet.
        </p>
        <p className="eyebrow mt-3 text-muted">
          Combinations you save will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
      {outfits.map((outfit) => (
        <OutfitCard
          key={outfit.id}
          outfit={outfit}
          items={items}
          onSelect={onSelect}
          onSelectItem={onSelectItem}
        />
      ))}
    </div>
  );
}
