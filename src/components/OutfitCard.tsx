"use client";

import { hasPhoto, type Category, type ClothingItem, type Outfit } from "@/lib/types";
import { GarmentGlyph } from "./GarmentGlyph";
import { SceneBackdrop } from "./SceneBackdrop";

/** Resolve an outfit's item ids into items, sorted into render layers. */
export function outfitPieces(
  outfit: Outfit,
  items: ClothingItem[]
): ClothingItem[] {
  return outfit.itemIds
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is ClothingItem => item !== undefined)
    .sort((a, b) => LAYER_ORDER[a.category] - LAYER_ORDER[b.category]);
}

/**
 * An outfit rendered on the model figure. On hover the figure fades and
 * the garments spread into an exploded view so each piece reads on its own —
 * a mock of the eventual AI-rendered outfit imagery. Clicking the card opens
 * the outfit detail view; clicking an individual garment opens that piece.
 */
export function OutfitCard({
  outfit,
  items,
  onSelect,
  onSelectItem,
}: {
  outfit: Outfit;
  items: ClothingItem[];
  onSelect: (id: string) => void;
  onSelectItem: (id: string) => void;
}) {
  const pieces = outfitPieces(outfit, items);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${outfit.name}, ${pieces.length} pieces`}
      onClick={() => onSelect(outfit.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(outfit.id);
        }
      }}
      className="group relative aspect-[3/4] cursor-pointer overflow-hidden border border-edge-subtle transition-colors duration-300 hover:border-ink focus-visible:border-ink focus-visible:outline-none"
    >
      <SceneBackdrop
        vibe={outfit.vibe}
        className="transition-opacity duration-500 group-hover:opacity-60"
      />

      {pieces.map((piece) => {
        const photoUrl =
          piece.cutoutImageUrl ?? (hasPhoto(piece.imageUrl) ? piece.imageUrl : null);
        return (
          <button
            key={piece.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectItem(piece.id);
            }}
            title={piece.name}
            aria-label={piece.name}
            className={`absolute -translate-x-1/2 transition-all duration-500 ease-out ${SLOT_CLASSES[piece.category]}`}
          >
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt={piece.name}
                className="h-auto w-full object-contain drop-shadow-[0_6px_10px_rgba(36,56,75,0.25)]"
              />
            ) : (
              <GarmentGlyph
                category={piece.category}
                silhouette={piece.silhouette}
                colorHex={piece.primaryColorHex}
                className="w-full drop-shadow-sm"
              />
            )}
          </button>
        );
      })}

      <span className="eyebrow pointer-events-none absolute bottom-3 left-3 border border-edge-subtle bg-surface-raised/95 px-2.5 py-1.5 text-ink opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        {outfit.name} · {pieces.length} pieces
      </span>
    </div>
  );
}

/** Render order: layered garments sit over the figure, top layer last. */
const LAYER_ORDER: Record<Category, number> = {
  accessories: 0,
  bottoms: 1,
  shoes: 2,
  jackets: 3,
  tops: 4,
  outfits: 5,
};

/**
 * Resting position (worn, over the figure) → exploded position on hover.
 * Static class strings so Tailwind can compile the arbitrary values.
 */
const SLOT_CLASSES: Record<Category, string> = {
  tops: "left-1/2 top-[22%] w-[36%] group-hover:left-[27%] group-hover:top-[14%] group-hover:w-[44%]",
  jackets:
    "left-1/2 top-[20%] w-[46%] group-hover:left-[73%] group-hover:top-[16%] group-hover:w-[48%]",
  bottoms:
    "left-1/2 top-[46%] w-[30%] group-hover:left-[38%] group-hover:top-[52%] group-hover:w-[38%]",
  shoes:
    "left-1/2 top-[78%] w-[24%] group-hover:left-[74%] group-hover:top-[74%] group-hover:w-[30%]",
  accessories:
    "left-[70%] top-[42%] w-[16%] group-hover:left-[20%] group-hover:top-[66%] group-hover:w-[24%]",
  outfits: "left-1/2 top-1/2 w-[40%]",
};
