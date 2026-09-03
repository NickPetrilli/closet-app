"use client";

import { useEffect, useState, useTransition } from "react";
import {
  hasPhoto,
  type Category,
  type ClothingItem,
  type OutfitVibe,
} from "@/lib/types";
import { GarmentGlyph } from "./GarmentGlyph";
import { vibeLabel } from "./SceneBackdrop";

/**
 * The outfit builder, shared by "Create Outfit" and the edit action in
 * OutfitDetailPanel. Extracted rather than duplicated: the slot rules (one
 * top, one bottom, one pair of shoes, optional jacket, any accessories) should
 * only ever be written down once.
 */

const VIBES: OutfitVibe[] = [
  "office",
  "evening",
  "weekend",
  "summer",
  "autumn",
  "street",
];

/** The single-select slots, in the order they're laid out and saved. */
const SLOT_CATEGORIES = ["tops", "bottoms", "shoes", "jackets"] as const;
type SlotCategory = (typeof SLOT_CATEGORIES)[number];

export interface OutfitFormValues {
  name: string;
  vibe: OutfitVibe;
  itemIds: string[];
}

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
    return <p className="text-xs text-ink-tertiary">No items in this category yet.</p>;
  }
  return (
    <div className="flex gap-2.5 overflow-x-auto pb-1">
      {items.map((item) => {
        const photoUrl =
          item.cutoutImageUrl ?? (hasPhoto(item.imageUrl) ? item.imageUrl : null);
        const isSelected = selectedIds.has(item.id);
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onToggle(item.id)}
            title={item.name}
            aria-pressed={isSelected}
            className={`flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-control border-2 bg-surface-sunken/40 p-2 transition-colors ${
              isSelected ? "border-accent" : "border-transparent hover:border-edge"
            }`}
          >
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt={item.name}
                className="h-full w-full object-contain"
              />
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

export function OutfitFormModal({
  open,
  onClose,
  items,
  initial,
  title,
  submitLabel,
  pendingLabel,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  items: ClothingItem[];
  /** Seeds the form when editing; omit to start empty. */
  initial?: OutfitFormValues;
  title: string;
  submitLabel: string;
  pendingLabel: string;
  onSubmit: (values: OutfitFormValues) => Promise<{ error?: string }>;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [vibe, setVibe] = useState<OutfitVibe>("weekend");
  const [slots, setSlots] = useState<Record<SlotCategory, string | null>>({
    tops: null,
    bottoms: null,
    shoes: null,
    jackets: null,
  });
  const [accessoryIds, setAccessoryIds] = useState<Set<string>>(new Set());
  /**
   * Anything the slot model can't represent — a second top, say. Nothing in
   * the wardrobe has this today, but an AI-generated outfit could, and silently
   * dropping pieces on save would be a nasty way to find out.
   */
  const [extraIds, setExtraIds] = useState<string[]>([]);

  // Seed (or clear) on open, so reopening never shows the last edit's state.
  useEffect(() => {
    if (!open) return;
    setError(null);

    if (!initial) {
      setName("");
      setVibe("weekend");
      setSlots({ tops: null, bottoms: null, shoes: null, jackets: null });
      setAccessoryIds(new Set());
      setExtraIds([]);
      return;
    }

    setName(initial.name);
    setVibe(initial.vibe);

    const nextSlots: Record<SlotCategory, string | null> = {
      tops: null,
      bottoms: null,
      shoes: null,
      jackets: null,
    };
    const nextAccessories = new Set<string>();
    const leftovers: string[] = [];

    for (const id of initial.itemIds) {
      const item = items.find((i) => i.id === id);
      if (!item) continue;
      if (item.category === "accessories") {
        nextAccessories.add(id);
        continue;
      }
      const slot = item.category as SlotCategory;
      if (SLOT_CATEGORIES.includes(slot) && nextSlots[slot] === null) {
        nextSlots[slot] = id;
      } else {
        leftovers.push(id);
      }
    }

    setSlots(nextSlots);
    setAccessoryIds(nextAccessories);
    setExtraIds(leftovers);
    // `initial` is a fresh object each render, so key the effect on its
    // contents rather than its identity or this would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.name, initial?.vibe, initial?.itemIds.join(","), items]);

  function close() {
    if (isPending) return;
    onClose();
  }

  function setSlot(category: SlotCategory) {
    // Tapping the already-picked item clears the slot.
    return (id: string) =>
      setSlots((prev) => ({ ...prev, [category]: prev[category] === id ? null : id }));
  }

  function toggleAccessory(id: string) {
    setAccessoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit() {
    if (!name.trim() || !slots.tops || !slots.bottoms || !slots.shoes) {
      setError("Name it, and pick a top, bottom, and pair of shoes.");
      return;
    }
    const itemIds = [
      slots.tops,
      slots.bottoms,
      slots.shoes,
      slots.jackets,
      ...accessoryIds,
      ...extraIds,
    ].filter((id): id is string => Boolean(id));

    startTransition(async () => {
      const result = await onSubmit({ name: name.trim(), vibe, itemIds });
      if (result.error) {
        setError(result.error);
        return;
      }
      onClose();
    });
  }

  const byCategory = (category: Category) =>
    items.filter((item) => item.category === category);

  return (
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 ${
        open ? "" : "pointer-events-none"
      }`}
    >
      <div
        onClick={close}
        className={`absolute inset-0 bg-ink/25 transition-opacity duration-250 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-sheet border border-edge bg-surface-raised p-5 shadow-modal transition-all duration-250 sm:max-h-[85vh] sm:p-8 ${
          open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        }`}
      >
        <div className="flex items-start justify-between">
          <h2 className="font-serif text-2xl tracking-tight">{title}</h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            disabled={isPending}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-secondary transition-colors hover:bg-surface-sunken hover:text-ink"
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
            <p className="eyebrow text-ink-tertiary">Name</p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sunday Coffee Run"
              className="mt-2.5 w-full border border-edge bg-transparent px-3.5 py-2.5 text-sm focus:border-ink"
            />
          </div>

          <div>
            <p className="eyebrow text-ink-tertiary">Vibe</p>
            <div className="relative mt-2.5">
              <select
                value={vibe}
                onChange={(e) => setVibe(e.target.value as OutfitVibe)}
                className="w-full appearance-none border border-edge bg-transparent px-3.5 py-2.5 pr-9 text-sm focus:border-ink"
              >
                {VIBES.map((v) => (
                  <option key={v} value={v}>
                    {vibeLabel(v)}
                  </option>
                ))}
              </select>
              <svg
                viewBox="0 0 12 8"
                className="pointer-events-none absolute top-1/2 right-3.5 h-2 w-3 -translate-y-1/2 text-ink-secondary"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.25"
                aria-hidden="true"
              >
                <path d="M1 1.5l5 5 5-5" />
              </svg>
            </div>
          </div>

          {(
            [
              ["tops", "Top *"],
              ["bottoms", "Bottom *"],
              ["shoes", "Shoes *"],
              ["jackets", "Jacket (optional)"],
            ] as [SlotCategory, string][]
          ).map(([category, label]) => (
            <div key={category}>
              <p className="eyebrow text-ink-tertiary">{label}</p>
              <div className="mt-2.5">
                <ItemPicker
                  items={byCategory(category)}
                  selectedIds={new Set(slots[category] ? [slots[category]!] : [])}
                  onToggle={setSlot(category)}
                />
              </div>
            </div>
          ))}

          <div>
            <p className="eyebrow text-ink-tertiary">Accessories (optional)</p>
            <div className="mt-2.5">
              <ItemPicker
                items={byCategory("accessories")}
                selectedIds={accessoryIds}
                onToggle={toggleAccessory}
              />
            </div>
          </div>

          {error && <p className="text-sm text-error">{error}</p>}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="btn-label mt-1 w-full cursor-pointer rounded-full btn-primary py-3 disabled:cursor-wait disabled:opacity-70"
          >
            {isPending ? pendingLabel : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
