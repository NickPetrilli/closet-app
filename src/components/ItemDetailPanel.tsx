"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteItem, updateItem } from "@/lib/actions/items";
import { tintTowardSurface, vibeGradient } from "@/lib/color";
import {
  categoryLabel,
  hasPhoto,
  itemImage,
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
  onDelete,
}: {
  /** null when closed; the panel stays mounted so it can slide out. */
  item: ClothingItem | null;
  outfits: Outfit[];
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<ClothingItem>) => void;
  /** Opens the outfit detail view for one of this item's outfits. */
  onSelectOutfit: (id: string) => void;
  /** Drops the piece from the wardrobe once the server has deleted it. */
  onDelete: (id: string) => void;
}) {
  const open = item !== null;

  // Keep rendering the last item while sliding out.
  const lastItemRef = useRef<ClothingItem | null>(null);
  if (item) lastItemRef.current = item;
  const shown = item ?? lastItemRef.current;
  // Same image the grid tile chose, so tapping a piece never brings its
  // background back.
  const heroImage = shown ? itemImage(shown) : null;

  const outfitsWithItem = shown
    ? outfits.filter((outfit) => outfit.itemIds.includes(shown.id))
    : [];

  const router = useRouter();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [, startSaving] = useTransition();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleting] = useTransition();

  function handleDelete() {
    if (!shown) return;
    startDeleting(async () => {
      const result = await deleteItem(shown.id);
      if (result.error) {
        setDeleteError(result.error);
        return;
      }
      setDeleteModalOpen(false);
      onDelete(shown.id);
      onClose();
      // Outfits that used the piece are now a piece shorter, so the whole
      // page's data is refetched rather than patched by hand.
      router.refresh();
    });
  }

  // What the database currently holds, so blurring an untouched field doesn't
  // fire a pointless write. Reset whenever a different item is opened.
  const lastSavedNameRef = useRef<string>(item?.name ?? "");
  const lastIdRef = useRef<string | null>(item?.id ?? null);
  if (item && item.id !== lastIdRef.current) {
    lastIdRef.current = item.id;
    lastSavedNameRef.current = item.name;
    if (saveError) setSaveError(null);
    if (deleteError) setDeleteError(null);
    if (deleteModalOpen) setDeleteModalOpen(false);
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
              {heroImage ? (
                // Matches the grid tile: whatever the card showed, the panel
                // shows, so a piece does not gain its background back on tap.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={heroImage.src}
                  alt={shown.name}
                  className={`absolute inset-0 h-full w-full object-contain p-12 ${
                    heroImage.isCutout ? "drop-shadow-cutout-lg" : ""
                  }`}
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

              {/* Helper text + the one destructive action */}
              <div className="mt-auto flex flex-wrap items-end justify-between gap-4 border-t border-edge-subtle pt-5">
                <p className="max-w-[24rem] text-xs leading-relaxed text-ink-tertiary">
                  Category and colors are detected automatically from the
                  item&rsquo;s photo.
                </p>
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(true)}
                  className="btn-label flex shrink-0 cursor-pointer items-center gap-2 rounded-full btn-danger px-4 py-2"
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
                  Delete item
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Delete confirmation — same shape as the outfit one, so the two
          destructive actions in the app behave identically. */}
      <div
        aria-hidden={!deleteModalOpen}
        className={`fixed inset-0 z-[60] flex items-center justify-center p-6 ${
          deleteModalOpen ? "" : "pointer-events-none"
        }`}
      >
        <div
          onClick={() => !isDeleting && setDeleteModalOpen(false)}
          className={`absolute inset-0 bg-backdrop-strong transition-opacity duration-150 ${
            deleteModalOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          role="alertdialog"
          aria-modal="true"
          aria-label="Confirm delete item"
          className={`relative w-full max-w-sm rounded-sheet border border-error/40 bg-surface-raised p-7 shadow-modal transition-all duration-150 ${
            deleteModalOpen ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-error/10 text-error">
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
            <h3 className="font-serif text-xl tracking-tight">Delete this piece?</h3>
          </div>
          <p className="mt-3.5 text-sm leading-relaxed text-ink-secondary">
            {shown ? `"${shown.name}" will be removed from your wardrobe` : ""}
            {outfitsWithItem.length === 0
              ? ". Its photo is deleted too."
              : outfitsWithItem.length === 1
                ? ", and from the 1 outfit that uses it. That outfit stays, one piece shorter."
                : `, and from the ${outfitsWithItem.length} outfits that use it. Those outfits stay, one piece shorter.`}{" "}
            This can&apos;t be undone.
          </p>
          {deleteError && <p className="mt-3 text-sm text-error">{deleteError}</p>}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              disabled={isDeleting}
              className="btn-label cursor-pointer rounded-full btn-secondary px-5 py-2.5 disabled:cursor-wait disabled:opacity-70"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="btn-label cursor-pointer rounded-full btn-danger px-5 py-2.5 disabled:cursor-wait disabled:opacity-70"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
