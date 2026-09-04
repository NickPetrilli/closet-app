"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteOutfit, updateOutfit } from "@/lib/actions/outfits";
import { vibeGradient } from "@/lib/color";
import {
  categoryLabel,
  itemImage,
  type Category,
  type ClothingItem,
  type Outfit,
} from "@/lib/types";
import { GarmentGlyph } from "./GarmentGlyph";
import { OutfitFormModal, type OutfitFormValues } from "./OutfitFormModal";
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

  // What the database currently holds for the name, so blurring an unchanged
  // field doesn't fire a pointless write.
  const lastSavedNameRef = useRef<string>(outfit?.name ?? "");
  if (outfit && outfit.id !== lastOutfitRef.current?.id) {
    lastSavedNameRef.current = outfit.name;
  }

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleting] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [, startSaving] = useTransition();

  useEffect(() => {
    if (!open) return;
    setDeleteModalOpen(false);
    setDeleteError(null);
    setEditOpen(false);
    setSaveError(null);
  }, [open, shown?.id]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  /**
   * The name chip edits local state as you type; this writes it when you leave
   * the field. Without it the rename looked like it worked and silently
   * vanished on the next load.
   */
  function commitRename(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed || trimmed === lastSavedNameRef.current) return;
    startSaving(async () => {
      const result = await updateOutfit({ id, name: trimmed });
      if (result.error) {
        setSaveError(result.error);
        return;
      }
      lastSavedNameRef.current = trimmed;
      setSaveError(null);
      router.refresh();
    });
  }

  async function handleEditSubmit(values: OutfitFormValues) {
    if (!shown) return { error: "No outfit selected." };
    const result = await updateOutfit({ id: shown.id, ...values });
    if (result.error) return result;
    onUpdate(shown.id, values);
    lastSavedNameRef.current = values.name;
    router.refresh();
    return {};
  }

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
        className={`absolute inset-0 bg-backdrop transition-opacity duration-250 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={shown ? `Details for ${shown.name}` : "Outfit details"}
        className={`absolute top-0 right-0 h-full w-full max-w-2xl overflow-y-auto border-l border-edge bg-surface-raised shadow-panel transition-transform duration-400 ease-standard ${
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
                    itemImage(piece)?.src ?? null;
                  return photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={piece.id}
                      src={photoUrl}
                      alt={piece.name}
                      className={`absolute h-auto -translate-x-1/2 object-contain drop-shadow-cutout-lg ${HERO_SLOTS[piece.category]}`}
                    />
                  ) : (
                    <GarmentGlyph
                      key={piece.id}
                      category={piece.category}
                      silhouette={piece.silhouette}
                      colorHex={piece.primaryColorHex}
                      className={`absolute -translate-x-1/2 drop-shadow-cutout-sm ${HERO_SLOTS[piece.category]}`}
                    />
                  );
                })}
              </div>

              {/* Editable name chip */}
              <div className="absolute top-5 left-5 rounded-control border border-edge bg-surface-raised px-4 py-2.5">
                <input
                  value={shown.name}
                  onChange={(e) => onUpdate(shown.id, { name: e.target.value })}
                  onBlur={(e) => commitRename(shown.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                  aria-label="Outfit name"
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

              <span className="meta absolute bottom-5 left-5 rounded-full border border-edge-subtle bg-surface-raised/95 px-2.5 py-1.5 text-ink">
                {vibeLabel(shown.vibe)} · {pieces.length} pieces
              </span>
            </div>

            {/* Pieces list */}
            <div className="flex flex-1 flex-col gap-8 px-8 py-8">
              <div>
                <p className="eyebrow text-ink-tertiary">In this outfit</p>
                <div className="mt-4 flex flex-col gap-3">
                  {pieces.map((piece) => {
                    const thumb = itemImage(piece);
                    return (
                    <button
                      key={piece.id}
                      type="button"
                      onClick={() => onSelectItem(piece.id)}
                      className="group flex items-center gap-5 rounded-control border border-edge-subtle p-3 text-left transition-colors hover:border-ink"
                    >
                      <span
                        className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-control border border-edge-subtle"
                        style={{
                          background: vibeGradient(piece.primaryColorHex),
                        }}
                      >
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumb.src}
                            alt={piece.name}
                            className={
                              thumb.isCutout
                                ? "h-full w-full object-contain p-1.5"
                                : "h-full w-full object-cover"
                            }
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
                        <span className="meta mt-1 block text-ink-tertiary">
                          {categoryLabel(piece.category)}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        <span className="text-xs tracking-[0.06em] text-ink-secondary uppercase">
                          {piece.primaryColorHex}
                        </span>
                        <span
                          className="h-6 w-6 rounded-[3px] border border-edge"
                          style={{ backgroundColor: piece.primaryColorHex }}
                        />
                      </span>
                    </button>
                    );
                  })}
                </div>
              </div>

              {/* Helper text + actions */}
              <div className="mt-auto flex flex-col gap-4 border-t border-edge-subtle pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs leading-relaxed text-ink-tertiary">
                    Select a piece to view and edit its details.
                  </p>
                  {saveError && (
                    <p className="mt-1.5 text-sm text-error">{saveError}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="btn-label flex cursor-pointer items-center gap-2 rounded-full btn-secondary px-4 py-2"
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
                    <path d="M11.2 2.3a1.6 1.6 0 0 1 2.3 2.3L5.6 12.4l-3 .7.7-3z" />
                  </svg>
                  Edit outfit
                </button>
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
                  Delete outfit
                </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>

      {shown && (
        <OutfitFormModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          items={items}
          initial={{
            name: shown.name,
            vibe: shown.vibe,
            itemIds: shown.itemIds,
          }}
          title="Edit outfit"
          submitLabel="Save Changes"
          pendingLabel="Saving…"
          onSubmit={handleEditSubmit}
        />
      )}

      {/* Delete confirmation */}
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
          aria-label="Confirm delete outfit"
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
            <h3 className="font-serif text-xl tracking-tight">Delete this outfit?</h3>
          </div>
          <p className="mt-3.5 text-sm leading-relaxed text-ink-secondary">
            {shown ? `"${shown.name}" will be removed from your outfits.` : ""} The
            individual items stay in your wardrobe — this can&apos;t be undone.
          </p>
          {deleteError && (
            <p className="mt-3 text-sm text-error">{deleteError}</p>
          )}
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
