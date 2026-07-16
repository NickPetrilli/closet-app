"use client";

import { vibeGradient } from "@/lib/color";
import type { ClothingItem } from "@/lib/types";
import { GarmentGlyph } from "./GarmentGlyph";

export function ItemCard({
  item,
  onSelect,
}: {
  item: ClothingItem;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      aria-label={item.name}
      className="group relative block aspect-square w-full overflow-hidden border border-line transition-colors duration-300 hover:border-ink"
    >
      <div
        className="absolute inset-0"
        style={{ background: vibeGradient(item.primaryColorHex) }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <GarmentGlyph
          category={item.category}
          colorHex={item.primaryColorHex}
          className="w-3/5 drop-shadow-sm transition-transform duration-500 ease-out group-hover:scale-[1.06]"
        />
      </div>
      <span className="eyebrow absolute bottom-3 left-3 border border-line bg-cream/95 px-2.5 py-1.5 text-ink opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        {item.name}
      </span>
    </button>
  );
}
