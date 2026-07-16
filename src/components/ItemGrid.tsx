"use client";

import type { ClothingItem } from "@/lib/types";
import { ItemCard } from "./ItemCard";

export function ItemGrid({
  items,
  onSelect,
}: {
  items: ClothingItem[];
  onSelect: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="border border-line py-24 text-center">
        <p className="font-serif text-2xl italic text-ink-soft">
          Nothing here yet.
        </p>
        <p className="eyebrow mt-3 text-muted">
          Pieces you add will appear in this view
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <ItemCard key={item.id} item={item} onSelect={onSelect} />
      ))}
    </div>
  );
}
