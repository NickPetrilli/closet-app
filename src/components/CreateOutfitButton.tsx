"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createOutfit } from "@/lib/actions/outfits";
import { hasPhoto, type Category, type ClothingItem, type OutfitVibe } from "@/lib/types";
import { GarmentGlyph } from "./GarmentGlyph";
import { vibeLabel } from "./SceneBackdrop";

const VIBES: OutfitVibe[] = ["office", "evening", "weekend", "summer", "autumn", "street"];

function ItemPicker({
  items,
  selectedIds,
  onToggle,
}: {
  items: ClothingItem[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  if (items.length === 0) {
    return <p className="text-xs text-muted">No items in this category yet.</p>;
  }
  return (
    <div className="flex gap-2.5 overflow-x-auto pb-1">
      {items.map((item) => {
        const photoUrl = item.cutoutImageUrl ?? (hasPhoto(item.imageUrl) ? item.imageUrl : null);
        const isSelected = selectedIds.has(item.id);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onToggle(item.id)}
            title={item.name}
            className={`flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 bg-card/40 p-2 transition-colors ${
              isSelected ? "border-accent" : "border-transparent hover:border-line-dark"
            }`}
          >
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt={item.name} className="h-full w-full object-contain" />
            ) : (
              <GarmentGlyph
                category={item.category}
                silhouette={item.silhouette}
                colorHex={item.primaryColorHex}
                className="h-full w-full"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

export function CreateOutfitButton({ items }: { items: ClothingItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [vibe, setVibe] = useState<OutfitVibe>("weekend");
  const [topId, setTopId] = useState<string | null>(null);
  const [bottomId, setBottomId] = useState<string | null>(null);
  const [shoesId, setShoesId] = useState<string | null>(null);
  const [jacketId, setJacketId] = useState<string | null>(null);
  const [accessoryIds, setAccessoryIds] = useState<Set<string>>(new Set());

  function byCategory(category: Category) {
    return items.filter((i) => i.category === category);
  }

  function reset() {
    setName("");
    setVibe("weekend");
    setTopId(null);
    setBottomId(null);
    setShoesId(null);
    setJacketId(null);
    setAccessoryIds(new Set());
    setError(null);
  }

  function close() {
    if (isPending) return;
    setOpen(false);
    reset();
  }

  function toggleAccessory(id: string) {
    setAccessoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** Single-select slot: clicking the already-picked item clears it. */
  function singleToggle(current: string | null, setValue: (id: string | null) => void) {
    return (id: string) => setValue(current === id ? null : id);
  }

  function handleSubmit() {
    if (!name.trim() || !topId || !bottomId || !shoesId) {
      setError("Name it, and pick a top, bottom, and pair of shoes.");
      return;
    }
    const itemIds = [topId, bottomId, shoesId, jacketId, ...accessoryIds].filter(
      (id): id is string => !!id
    );
    startTransition(async () => {
      const result = await createOutfit({ name: name.trim(), vibe, itemIds });
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="eyebrow flex w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border border-line-dark px-5 py-2.5 text-ink transition-colors hover:border-ink sm:w-auto sm:justify-start"
      >
        <svg
          viewBox="0 0 16 16"
          className="h-3 w-3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M8 2v12M2 8h12" />
        </svg>
        Create Outfit
      </button>

      <div
        aria-hidden={!open}
        className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 ${open ? "" : "pointer-events-none"}`}
      >
        <div
          onClick={close}
          className={`absolute inset-0 bg-ink/25 transition-opacity duration-300 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />

        <div
          role="dialog"
          aria-modal="true"
          aria-label="Create an outfit"
          className={`relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-line-dark bg-cream p-5 shadow-xl transition-all duration-300 sm:max-h-[85vh] sm:p-8 ${
            open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          }`}
        >
          <div className="flex items-start justify-between">
            <h2 className="font-serif text-2xl tracking-tight">Create an outfit</h2>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              disabled={isPending}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-card hover:text-ink"
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
          </div>

          <div className="mt-6 flex flex-col gap-6">
            <div>
              <p className="eyebrow text-muted">Name</p>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sunday Coffee Run"
                className="mt-2.5 w-full border border-line-dark bg-transparent px-3.5 py-2.5 text-sm focus:border-ink focus:outline-none"
              />
            </div>

            <div>
              <p className="eyebrow text-muted">Vibe</p>
              <div className="relative mt-2.5">
                <select
                  value={vibe}
                  onChange={(e) => setVibe(e.target.value as OutfitVibe)}
                  className="w-full appearance-none border border-line-dark bg-transparent px-3.5 py-2.5 pr-9 text-sm focus:border-ink focus:outline-none"
                >
                  {VIBES.map((v) => (
                    <option key={v} value={v}>
                      {vibeLabel(v)}
                    </option>
                  ))}
                </select>
                <svg
                  viewBox="0 0 12 8"
                  className="pointer-events-none absolute top-1/2 right-3.5 h-2 w-3 -translate-y-1/2 text-ink-soft"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  aria-hidden="true"
                >
                  <path d="M1 1.5l5 5 5-5" />
                </svg>
              </div>
            </div>

            <div>
              <p className="eyebrow text-muted">Top *</p>
              <div className="mt-2.5">
                <ItemPicker
                  items={byCategory("tops")}
                  selectedIds={new Set(topId ? [topId] : [])}
                  onToggle={singleToggle(topId, setTopId)}
                />
              </div>
            </div>
            <div>
              <p className="eyebrow text-muted">Bottom *</p>
              <div className="mt-2.5">
                <ItemPicker
                  items={byCategory("bottoms")}
                  selectedIds={new Set(bottomId ? [bottomId] : [])}
                  onToggle={singleToggle(bottomId, setBottomId)}
                />
              </div>
            </div>
            <div>
              <p className="eyebrow text-muted">Shoes *</p>
              <div className="mt-2.5">
                <ItemPicker
                  items={byCategory("shoes")}
                  selectedIds={new Set(shoesId ? [shoesId] : [])}
                  onToggle={singleToggle(shoesId, setShoesId)}
                />
              </div>
            </div>
            <div>
              <p className="eyebrow text-muted">Jacket (optional)</p>
              <div className="mt-2.5">
                <ItemPicker
                  items={byCategory("jackets")}
                  selectedIds={new Set(jacketId ? [jacketId] : [])}
                  onToggle={singleToggle(jacketId, setJacketId)}
                />
              </div>
            </div>
            <div>
              <p className="eyebrow text-muted">Accessories (optional)</p>
              <div className="mt-2.5">
                <ItemPicker
                  items={byCategory("accessories")}
                  selectedIds={accessoryIds}
                  onToggle={toggleAccessory}
                />
              </div>
            </div>

            {error && <p className="text-sm text-blush-deep">{error}</p>}

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="eyebrow mt-1 w-full cursor-pointer rounded-full border border-line-dark bg-ink py-3 text-cream transition-colors hover:bg-accent disabled:cursor-wait disabled:opacity-70"
            >
              {isPending ? "Saving…" : "Save Outfit"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
