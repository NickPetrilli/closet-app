"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteOutfit } from "@/lib/actions/outfits";
import { vibeGradient } from "@/lib/color";
import {
  categoryLabel,
  hasPhoto,
  type Category,
  type ClothingItem,
  type Outfit,
} from "@/lib/types";
import { GarmentGlyph } from "./GarmentGlyph";
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
  const router = useRouter();
  const open = outfit !== null;

  // Keep rendering the last outfit while sliding out.
  const lastOutfitRef = useRef<Outfit | null>(null);
  if (outfit) lastOutfitRef.current = outfit;
  const shown = outfit ?? lastOutfitRef.current;

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleting] = useTransition();

  useEffect(() => {
    if (!open) return;
    setDeleteModalOpen(false);
    setDeleteError(null);
  }, [open, shown?.id]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  function handleDelete() {
    if (!shown) return;
    startDeleting(async () => {
      const result = await deleteOutfit(shown.id);
      if (result.error) {
        setDeleteError(result.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

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
                {pieces.map((piece) => {
                  const photoUrl =
                    piece.cutoutImageUrl ?? (hasPhoto(piece.imageUrl) ? piece.imageUrl : null);
                  return photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={piece.id}
                      src={photoUrl}
                      alt={piece.name}
                      className={`absolute h-auto -translate-x-1/2 object-contain drop-shadow-[0_10px_16px_rgba(36,56,75,0.3)] ${HERO_SLOTS[piece.category]}`}
                    />
                  ) : (
                    <GarmentGlyph
                      key={piece.id}
                      category={piece.category}
                      silhouette={piece.silhouette}
                      colorHex={piece.primaryColorHex}
                      className={`absolute -translate-x-1/2 drop-shadow-sm ${HERO_SLOTS[piece.category]}`}
                    />
                  );
                })}
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
                        className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden border border-line"
                        style={{
                          background: vibeGradient(piece.primaryColorHex),
                        }}
                      >
                        {hasPhoto(piece.imageUrl) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={piece.imageUrl}
                            alt={piece.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <GarmentGlyph
                            category={piece.category}
                            silhouette={piece.silhouette}
                            colorHex={piece.primaryColorHex}
                            className="w-10"
                          />
                        )}
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

              {/* Helper text + delete */}
              <div className="mt-auto flex items-center justify-between gap-4 border-t border-line pt-5">
                <p className="text-xs leading-relaxed text-muted">
                  Select a piece to view and edit its details.
                </p>
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(true)}
                  className="eyebrow flex shrink-0 cursor-pointer items-center gap-2 rounded-full bg-danger px-4 py-2 text-cream shadow-sm transition-colors hover:bg-danger-deep"
                >
                  <svg
                    viewBox="0 0 16 16"
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M2.5 4h11M6 4V2.5h4V4m-6 0 .6 9.4a1 1 0 0 0 1 .9h4.8a1 1 0 0 0 1-.9L13 4" />
                    <path d="M6.5 7v4M9.5 7v4" />
                  </svg>
                  Delete outfit
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Delete confirmation */}
      <div
        aria-hidden={!deleteModalOpen}
        className={`fixed inset-0 z-[60] flex items-center justify-center p-6 ${
          deleteModalOpen ? "" : "pointer-events-none"
        }`}
      >
        <div
          onClick={() => !isDeleting && setDeleteModalOpen(false)}
          className={`absolute inset-0 bg-ink/35 transition-opacity duration-200 ${
            deleteModalOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          role="alertdialog"
          aria-modal="true"
          aria-label="Confirm delete outfit"
          className={`relative w-full max-w-sm rounded-2xl border border-danger/40 bg-cream p-7 shadow-xl transition-all duration-200 ${
            deleteModalOpen ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-danger/10 text-danger">
              <svg
                viewBox="0 0 16 16"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M2.5 4h11M6 4V2.5h4V4m-6 0 .6 9.4a1 1 0 0 0 1 .9h4.8a1 1 0 0 0 1-.9L13 4" />
                <path d="M6.5 7v4M9.5 7v4" />
              </svg>
            </span>
            <h3 className="font-serif text-xl tracking-tight">Delete this outfit?</h3>
          </div>
          <p className="mt-3.5 text-sm leading-relaxed text-ink-soft">
            {shown ? `"${shown.name}" will be removed from your outfits.` : ""} The
            individual items stay in your wardrobe — this can&apos;t be undone.
          </p>
          {deleteError && (
            <p className="mt-3 text-sm text-danger">{deleteError}</p>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              disabled={isDeleting}
              className="eyebrow cursor-pointer rounded-full border border-line-dark px-5 py-2.5 text-ink transition-colors hover:bg-card disabled:cursor-wait disabled:opacity-70"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="eyebrow cursor-pointer rounded-full bg-danger px-5 py-2.5 text-cream shadow-sm transition-colors hover:bg-danger-deep disabled:cursor-wait disabled:opacity-70"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </div>
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
