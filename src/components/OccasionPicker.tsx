"use client";

import { useState } from "react";
import type { OccasionTag } from "@/lib/types";

/**
 * The occasion row on the daily card: the seeded tags, anything Jenna has
 * added before, and an inline "add" affordance. Selecting one re-requests the
 * suggestion; nothing is written to the wear log until she taps "Wore this".
 */
export function OccasionPicker({
  tags,
  selected,
  disabled,
  onSelect,
  onAdd,
}: {
  tags: OccasionTag[];
  selected: string | null;
  disabled: boolean;
  onSelect: (id: string | null) => void;
  onAdd: (label: string) => Promise<string | null>;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submitNew(e: React.FormEvent) {
    e.preventDefault();
    const label = draft.trim();
    if (!label) {
      setAdding(false);
      return;
    }
    const message = await onAdd(label);
    if (message) {
      setError(message);
      return;
    }
    setDraft("");
    setError(null);
    setAdding(false);
  }

  return (
    <div>
      <p className="eyebrow text-ink-tertiary">For</p>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => {
          const active = tag.id === selected;
          return (
            <button
              key={tag.id}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              // Tapping the active tag clears it — back to "no particular plans".
              onClick={() => onSelect(active ? null : tag.id)}
              className={`eyebrow cursor-pointer rounded-full border px-3.5 py-1.5 transition-colors disabled:cursor-wait disabled:opacity-60 ${
                active
                  ? "border-edge bg-ink text-on-accent"
                  : "border-edge bg-surface-raised/50 text-ink-secondary hover:border-accent hover:text-accent"
              }`}
            >
              {tag.label}
            </button>
          );
        })}

        {adding ? (
          <form onSubmit={submitNew} className="flex items-center gap-1.5">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={submitNew}
              placeholder="Brunch"
              maxLength={24}
              aria-label="New occasion"
              className="w-28 rounded-full border border-edge bg-transparent px-3.5 py-1.5 text-xs focus:border-ink focus:outline-none"
            />
          </form>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setAdding(true)}
            aria-label="Add an occasion"
            className="eyebrow cursor-pointer rounded-full border border-dashed border-edge px-3 py-1.5 text-ink-tertiary transition-colors hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-60"
          >
            + Add
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-blush-strong">{error}</p>}
    </div>
  );
}
