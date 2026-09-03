"use client";

import { vibeGradient } from "@/lib/color";
import { hasPhoto, type ClothingItem } from "@/lib/types";
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
      className="group relative block aspect-square w-full cursor-pointer overflow-hidden rounded-card border border-edge-subtle transition-all duration-250 hover:-translate-y-0.5 hover:border-accent hover:shadow-lift"
    >
      <div
        className="absolute inset-0"
        style={{ background: vibeGradient(item.primaryColorHex) }}
      />
      {hasPhoto(item.imageUrl) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt={item.name}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-400 ease-out group-hover:scale-[1.06]"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <GarmentGlyph
            category={item.category}
            silhouette={item.silhouette}
            colorHex={item.primaryColorHex}
            className="w-3/5 drop-shadow-cutout-sm transition-transform duration-400 ease-out group-hover:scale-[1.06]"
          />
        </div>
      )}
      <span className="meta absolute bottom-3 left-3 rounded-full border border-edge-subtle bg-surface-raised/95 px-3 py-1.5 text-ink opacity-0 shadow-card transition-opacity duration-250 group-hover:opacity-100">
        {item.name}
      </span>
    </button>
  );
}
