"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateItem } from "@/lib/actions/items";
import { tintTowardSurface, vibeGradient } from "@/lib/color";
import {
  categoryLabel,
  hasPhoto,
  type ClothingItem,
  type Outfit,
} from "@/lib/types";
import { GarmentGlyph, ModelFigure } from "./GarmentGlyph";
import { vibeLabel } from "./SceneBackdrop";

export function ItemDetailPanel({
  item,
  outfits,
  onClose,
  onUpdate,
  onSelectOutfit,
}: {
  /** null when closed; the panel stays mounted so it can slide out. */
  item: ClothingItem | null;
  outfits: Outfit[];
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<ClothingItem>) => void;
  /** Opens the outfit detail view for one of this item's outfits. */
  onSelectOutfit: (id: string) => void;
}) {
  const open = item !== null;

  // Keep rendering the last item while sliding out.
  const lastItemRef = useRef<ClothingItem | null>(null);
  if (item) lastItemRef.current = item;
  const shown = item ?? lastItemRef.current;

  const outfitsWithItem = shown
    ? outfits.filter((outfit) => outfit.itemIds.includes(shown.id))
    : [];

  const router = useRouter();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [, startSaving] = useTransition();

  // What the database currently holds, so blurring an untouched field doesn't
  // fire a pointless write. Reset whenever a different item is opened.
  const lastSavedNameRef = useRef<string>(item?.name ?? "");
  const lastIdRef = useRef<string | null>(item?.id ?? null);
  if (item && item.id !== lastIdRef.current) {
    lastIdRef.current = item.id;
    lastSavedNameRef.current = item.name;
    if (saveError) setSaveError(null);
  }

  /**
   * The name inputs update local state as you type; this persists on blur or
   * Enter. Without it the rename looked like it worked and silently reverted
   * on the next load — there was no server action behind onUpdate at all.
   */
  function commitName(id: string, value: string) {
    const trimmed = value.trim();
    if (trimmed === lastSavedNameRef.current) return;
    if (!trimmed) {
      // Put the saved name back rather than leaving an empty chip on screen.
      onUpdate(id, { name: lastSavedNameRef.current });
      return;
    }
    startSaving(async () => {
      const result = await updateItem({ id, name: trimmed });
      if (result.error) {
        setSaveError(result.error);
        return;
      }
      lastSavedNameRef.current = trimmed;
      setSaveError(null);
      router.refresh();
    });
  }

  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  useEffect(() => {
    setActiveSourceIndex(0);
  }, [shown?.id]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  return (
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}
    >
      {/* Backdrop — wardrobe stays visible, dimmed */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-backdrop transition-opacity duration-250 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={shown ? `Details for ${shown.name}` : "Item details"}
        className={`absolute top-0 right-0 h-full w-full max-w-2xl overflow-y-auto border-l border-edge bg-surface-raised shadow-panel transition-transform duration-400 ease-standard ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {shown && (
          <div className="flex min-h-full flex-col">
            {/* Hero — item rendered on the user, scene vibe follows the color */}
            <div
              className="relative h-[420px] shrink-0 overflow-hidden transition-[background] duration-400"
              style={{ background: vibeGradient(shown.primaryColorHex) }}
            >
              {hasPhoto(shown.imageUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={shown.imageUrl}
                  alt={shown.name}
                  className="absolute inset-0 h-full w-full object-contain p-12"
                />
              ) : (
                <>
                  <ModelFigure className="absolute left-1/2 top-[6%] h-[88%] -translate-x-1/2 text-ink/40" />
                  <GarmentGlyph
                    category={shown.category}
                    silhouette={shown.silhouette}
                    colorHex={shown.primaryColorHex}
                    className="absolute left-1/2 top-[24%] w-[19%] -translate-x-1/2 drop-shadow-cutout-sm"
                  />
                </>
              )}

              {/* Editable name chip */}
              <div className="absolute top-5 left-5 rounded-control border border-edge bg-surface-raised px-4 py-2.5">
                <input
                  value={shown.name}
                  onChange={(e) => onUpdate(shown.id, { name: e.target.value })}
                  onBlur={(e) => commitName(shown.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                  aria-label="Item name"
                  size={Math.max(shown.name.length, 4)}
                  className="max-w-[16rem] bg-transparent font-serif text-xl leading-none"
                />
              </div>

              {/* Close */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close details"
                className="absolute top-5 right-5 flex h-11 w-11 items-center justify-center rounded-full border border-edge bg-surface-raised text-ink-secondary transition-colors hover:border-ink hover:text-ink"
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

              {/* Isolated cutout, floating bottom-right — redundant once the hero already shows the real photo */}
              {!hasPhoto(shown.imageUrl) && (
                <GarmentGlyph
                  category={shown.category}
                  silhouette={shown.silhouette}
                  colorHex={shown.primaryColorHex}
                  className="absolute right-6 bottom-6 w-28 drop-shadow-cutout"
                />
              )}

              {/* Source photo thumbnails */}
              {shown.sourcePhotoUrls.length > 0 && (
              <div className="absolute bottom-6 left-6 flex gap-1.5 rounded-control border border-edge-subtle bg-surface-raised/95 p-1.5">
                {shown.sourcePhotoUrls.map((url, index) => {
                  const isActive = index === activeSourceIndex;
                  return (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setActiveSourceIndex(index)}
                      aria-pressed={isActive}
                      aria-label={`Source photo ${index + 1}`}
                      className={`relative flex h-12 w-16 items-center justify-center rounded-control border transition-colors ${
                        isActive
                          ? "border-ink"
                          : "border-edge-subtle hover:border-edge"
                      }`}
                      style={{
                        background: vibeGradient(
                          tintTowardSurface(shown.primaryColorHex, 0.2)
                        ),
                      }}
                    >
                      <GarmentGlyph
                        category={shown.category}
                        silhouette={shown.silhouette}
                        colorHex={tintTowardSurface(shown.primaryColorHex, 0.2)}
                        className="w-7"
                      />
                    </button>
                  );
                })}
              </div>
              )}
            </div>

            {/* Form */}
            <div className="flex flex-1 flex-col gap-8 px-8 py-8">
              {/* Name / Category */}
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <p className="eyebrow text-ink-tertiary">Name</p>
                  <input
                    value={shown.name}
                    onChange={(e) =>
                      onUpdate(shown.id, { name: e.target.value })
                    }
                    onBlur={(e) => commitName(shown.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                    }}
                    aria-label="Item name"
                    className="mt-2.5 w-full rounded-control border border-edge bg-transparent px-3.5 py-2.5 text-sm focus:border-ink"
                  />
                  {saveError && (
                    <p className="mt-1.5 text-sm text-error">{saveError}</p>
                  )}
                </div>
                <div>
                  <p className="eyebrow text-ink-tertiary">Category</p>
                  <p className="mt-2.5 rounded-control border border-edge-subtle bg-surface-sunken/50 px-3.5 py-2.5 text-sm text-ink-secondary">
                    {categoryLabel(shown.category)}
                  </p>
                </div>
              </div>

              {/* Colors */}
              <div>
                <p className="eyebrow text-ink-tertiary">Colors</p>
                <div className="mt-4 grid grid-cols-2 divide-x divide-edge-subtle border-t border-edge-subtle pt-6">
                  {/* Primary */}
                  <div className="pr-7">
                    <p className="text-sm font-medium">Primary color</p>
                    <div className="mt-4 flex items-center gap-4">
                      <span
                        className="h-12 w-12 shrink-0 rounded-control border border-edge"
                        style={{ backgroundColor: shown.primaryColorHex }}
                      />
                      <div>
                        <p className="eyebrow text-ink-tertiary">Detected</p>
                        <p className="mt-0.5 text-sm font-medium tracking-[0.06em] uppercase">
                          {shown.primaryColorHex}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Secondary */}
                  <div className="pl-7">
                    <p className="text-sm font-medium">
                      Secondary color{" "}
                      <span className="eyebrow ml-1.5 text-ink-tertiary">
                        Optional
                      </span>
                    </p>
                    {shown.secondaryColorHex ? (
                      <div className="mt-4 flex items-center gap-4">
                        <span
                          className="h-12 w-12 shrink-0 rounded-control border border-edge"
                          style={{
                            backgroundColor: shown.secondaryColorHex,
                          }}
                        />
                        <div>
                          <p className="eyebrow text-ink-tertiary">Detected</p>
                          <p className="mt-0.5 text-sm font-medium tracking-[0.06em] uppercase">
                            {shown.secondaryColorHex}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-ink-tertiary">
                        No distinct secondary color detected.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Appears in these outfits */}
              <div className="border-t border-edge-subtle pt-6">
                <p className="eyebrow text-ink-tertiary">Appears in these outfits</p>
                {outfitsWithItem.length > 0 ? (
                  <div className="mt-4 flex flex-col gap-2.5">
                    {outfitsWithItem.map((outfit) => (
                      <button
                        key={outfit.id}
                        type="button"
                        onClick={() => onSelectOutfit(outfit.id)}
                        className="group flex items-center justify-between rounded-control border border-edge-subtle px-4 py-3 text-left transition-colors hover:border-ink"
                      >
                        <span>
                          <span className="block font-serif text-base leading-snug">
                            {outfit.name}
                          </span>
                          <span className="meta mt-0.5 block text-ink-tertiary">
                            {vibeLabel(outfit.vibe)}
                          </span>
                        </span>
                        <svg
                          viewBox="0 0 8 12"
                          className="h-3 w-2 shrink-0 text-ink-secondary transition-transform group-hover:translate-x-0.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          aria-hidden="true"
                        >
                          <path d="M1 1l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-ink-tertiary">
                    Not part of any outfit yet.
                  </p>
                )}
              </div>

              {/* Helper text */}
              <p className="mt-auto border-t border-edge-subtle pt-5 text-xs leading-relaxed text-ink-tertiary">
                Category and colors are detected automatically from the
                item&rsquo;s photo.
              </p>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
