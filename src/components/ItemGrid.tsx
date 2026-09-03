"use client";

import type { ClothingItem } from "@/lib/types";
import { ItemCard } from "./ItemCard";

export function ItemGrid({
  items,
  onSelect,
  emptyTitle = "Nothing here yet.",
  emptyHint = "Pieces you add will appear in this view",
}: {
  items: ClothingItem[];
  onSelect: (id: string) => void;
  /** Overridden when a search comes back empty, so the copy fits the reason. */
  emptyTitle?: string;
  emptyHint?: string;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-card border border-edge-subtle bg-surface-raised/40 py-24 text-center">
        <p className="font-serif text-2xl italic text-ink-secondary">{emptyTitle}</p>
        <p className="meta mt-3 text-ink-tertiary">{emptyHint}</p>
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
