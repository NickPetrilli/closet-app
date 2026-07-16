"use client";

import { useEffect, useRef } from "react";
import { vibeGradient } from "@/lib/color";
import {
  categoryLabel,
  type Category,
  type ClothingItem,
  type Outfit,
} from "@/lib/types";
import { GarmentGlyph, ModelFigure } from "./GarmentGlyph";
import { outfitPieces } from "./OutfitCard";
import { SceneBackdrop, vibeLabel } from "./SceneBackdrop";

export function OutfitDetailPanel({
  outfit,
  items,
  onClose,
  onSelectItem,
  onUpdate,
}: {
  /** null when closed; the panel stays mounted so it can slide out. */
  outfit: Outfit | null;
  items: ClothingItem[];
  onClose: () => void;
  /** Opens the item detail view for one of the outfit's pieces. */
  onSelectItem: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Outfit>) => void;
}) {
  const open = outfit !== null;

  // Keep rendering the last outfit while sliding out.
  const lastOutfitRef = useRef<Outfit | null>(null);
  if (outfit) lastOutfitRef.current = outfit;
  const shown = outfit ?? lastOutfitRef.current;

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const pieces = shown ? outfitPieces(shown, items) : [];

  return (
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}
    >
      {/* Backdrop — wardrobe stays visible, dimmed */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-ink/25 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={shown ? `Details for ${shown.name}` : "Outfit details"}
        className={`absolute top-0 right-0 h-full w-full max-w-2xl overflow-y-auto border-l border-line-dark bg-cream transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {shown && (
          <div className="flex min-h-full flex-col">
            {/* Hero — the full look on the model in its vibe's scene */}
            <div className="relative h-[440px] shrink-0 overflow-hidden">
              <SceneBackdrop vibe={shown.vibe} />
              <div className="absolute inset-x-0 top-[6%] mx-auto aspect-[120/200] h-[88%]">
                <ModelFigure className="absolute inset-0 h-full w-full text-ink/40" />
                {pieces.map((piece) => (
                  <GarmentGlyph
                    key={piece.id}
                    category={piece.category}
                    colorHex={piece.primaryColorHex}
                    className={`absolute -translate-x-1/2 drop-shadow-sm ${HERO_SLOTS[piece.category]}`}
                  />
                ))}
              </div>

              {/* Editable name chip */}
              <div className="absolute top-5 left-5 border border-line-dark bg-cream px-4 py-2.5">
                <input
                  value={shown.name}
                  onChange={(e) => onUpdate(shown.id, { name: e.target.value })}
                  aria-label="Outfit name"
                  size={Math.max(shown.name.length, 4)}
                  className="max-w-[16rem] bg-transparent font-serif text-xl leading-none focus:outline-none"
                />
              </div>

              {/* Close */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close details"
                className="absolute top-5 right-5 flex h-11 w-11 items-center justify-center border border-line-dark bg-cream text-ink-soft transition-colors hover:border-ink hover:text-ink"
              >
                <svg
                  viewBox="0 0 16 16"
                  className="h-3.5 w-3.5"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  aria-hidden="true"
                >
                  <path d="M2 2l12 12M14 2L2 14" />
                </svg>
              </button>

              <span className="eyebrow absolute bottom-5 left-5 border border-line bg-cream/95 px-2.5 py-1.5 text-ink">
                {vibeLabel(shown.vibe)} · {pieces.length} pieces
              </span>
            </div>

            {/* Pieces list */}
            <div className="flex flex-1 flex-col gap-8 px-8 py-8">
              <div>
                <p className="eyebrow text-muted">In this outfit</p>
                <div className="mt-4 flex flex-col gap-3">
                  {pieces.map((piece) => (
                    <button
                      key={piece.id}
                      type="button"
                      onClick={() => onSelectItem(piece.id)}
                      className="group flex items-center gap-5 border border-line p-3 text-left transition-colors hover:border-ink"
                    >
                      <span
                        className="flex h-16 w-16 shrink-0 items-center justify-center border border-line"
                        style={{
                          background: vibeGradient(piece.primaryColorHex),
                        }}
                      >
                        <GarmentGlyph
                          category={piece.category}
                          colorHex={piece.primaryColorHex}
                          className="w-10"
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-serif text-lg leading-snug">
                          {piece.name}
                        </span>
                        <span className="eyebrow mt-1 block text-muted">
                          {categoryLabel(piece.category)}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        <span className="text-xs tracking-[0.06em] text-ink-soft uppercase">
                          {piece.primaryColorHex}
                        </span>
                        <span
                          className="h-6 w-6 border border-line-dark"
                          style={{ backgroundColor: piece.primaryColorHex }}
                        />
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Helper text */}
              <p className="mt-auto border-t border-line pt-5 text-xs leading-relaxed text-muted">
                Select a piece to view and edit its details. Outfit imagery is
                rendered from your own photos once uploads are connected.
              </p>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

/**
 * Worn positions inside the hero's figure-sized wrapper (aspect 120:200),
 * so garments sit on the model regardless of panel width.
 */
const HERO_SLOTS: Record<Category, string> = {
  tops: "left-1/2 top-[20%] w-[49%]",
  jackets: "left-1/2 top-[17%] w-[63%]",
  bottoms: "left-1/2 top-[46%] w-[41%]",
  shoes: "left-1/2 top-[80%] w-[33%]",
  accessories: "left-[82%] top-[41%] w-[24%]",
  outfits: "left-1/2 top-1/2 w-[40%]",
};
