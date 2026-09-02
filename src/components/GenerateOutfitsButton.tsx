"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateOutfits, saveOutfits, type OutfitCandidate } from "@/lib/actions/outfits";
import { hasPhoto, type ClothingItem } from "@/lib/types";
import { GarmentGlyph } from "./GarmentGlyph";
import { SceneBackdrop, vibeLabel } from "./SceneBackdrop";

const GENERATE_COUNT = 8;

export function GenerateOutfitsButton({ items }: { items: ClothingItem[] }) {
  const router = useRouter();
  const [isGenerating, startGenerating] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const [candidates, setCandidates] = useState<OutfitCandidate[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const open = candidates !== null;

  function findItem(id: string) {
    return items.find((item) => item.id === id) ?? null;
  }

  function handleGenerate() {
    setError(null);
    setSavedMessage(null);
    startGenerating(async () => {
      const result = await generateOutfits(GENERATE_COUNT);
      if (result.error || !result.candidates) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      setCandidates(result.candidates);
      setSelected(new Set(result.candidates.map((_, i) => i)));
    });
  }

  function toggle(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function close() {
    if (isSaving) return;
    setCandidates(null);
    setError(null);
  }

  function handleSave() {
    if (!candidates || selected.size === 0) return;
    const chosen = [...selected].map((i) => candidates[i]);
    startSaving(async () => {
      const result = await saveOutfits(chosen);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSavedMessage(
        `Saved ${result.savedCount} outfit${result.savedCount === 1 ? "" : "s"}.`
      );
      setCandidates(null);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleGenerate}
        disabled={isGenerating}
        className="eyebrow flex shrink-0 cursor-pointer items-center gap-2 rounded-full border border-line-dark bg-ink px-5 py-2.5 text-cream transition-colors hover:bg-accent disabled:cursor-wait disabled:opacity-70"
      >
        <svg
          viewBox="0 0 16 16"
          className="h-3 w-3"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M8 1.5 L9.6 6.2 L14.5 8 L9.6 9.8 L8 14.5 L6.4 9.8 L1.5 8 L6.4 6.2 Z" />
        </svg>
        {isGenerating ? "Generating…" : "Generate Outfits"}
      </button>

      {savedMessage && !open && (
        <span className="eyebrow text-muted">{savedMessage}</span>
      )}

      <div
        aria-hidden={!open}
        className={`fixed inset-0 z-50 flex items-center justify-center p-6 ${open ? "" : "pointer-events-none"}`}
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
          aria-label="Review generated outfits"
          className={`relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-line-dark bg-cream shadow-xl transition-all duration-300 ${
            open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          }`}
        >
          <div className="flex items-start justify-between border-b border-line px-8 py-6">
            <div>
              <h2 className="font-serif text-2xl tracking-tight">Review generated outfits</h2>
              <p className="eyebrow mt-1.5 text-muted">
                Uncheck any you don&apos;t want, then save the rest.
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              disabled={isSaving}
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

          <div className="grid flex-1 grid-cols-2 gap-4 overflow-y-auto p-8 sm:grid-cols-3">
            {candidates?.map((candidate, index) => {
              const pieces = candidate.itemIds
                .map(findItem)
                .filter((i): i is ClothingItem => i !== null);
              const isSelected = selected.has(index);
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => toggle(index)}
                  className={`group relative aspect-[3/4] cursor-pointer overflow-hidden rounded-xl border text-left transition-colors ${
                    isSelected ? "border-accent" : "border-line opacity-50"
                  }`}
                >
                  <SceneBackdrop vibe={candidate.vibe} />
                  <div className="absolute inset-0 flex flex-wrap content-center items-center justify-center gap-1.5 p-4">
                    {pieces.map((piece) => {
                      const photoUrl =
                        piece.cutoutImageUrl ?? (hasPhoto(piece.imageUrl) ? piece.imageUrl : null);
                      return photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={piece.id}
                          src={photoUrl}
                          alt={piece.name}
                          className="h-14 w-14 object-contain drop-shadow-[0_4px_8px_rgba(36,56,75,0.25)]"
                        />
                      ) : (
                        <GarmentGlyph
                          key={piece.id}
                          category={piece.category}
                          silhouette={piece.silhouette}
                          colorHex={piece.primaryColorHex}
                          className="h-12 w-12"
                        />
                      );
                    })}
                  </div>
                  <span
                    className={`absolute top-2.5 right-2.5 flex h-6 w-6 items-center justify-center rounded-full border bg-cream ${
                      isSelected ? "border-accent" : "border-line-dark"
                    }`}
                  >
                    {isSelected && (
                      <svg
                        viewBox="0 0 12 10"
                        className="h-2.5 w-3 text-accent"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                      >
                        <path d="M1 5 L4.5 8.5 L11 1" />
                      </svg>
                    )}
                  </span>
                  <span className="eyebrow absolute right-2.5 bottom-2.5 left-2.5 truncate rounded-full border border-line bg-cream/95 px-2.5 py-1 text-ink">
                    {candidate.name} · {vibeLabel(candidate.vibe)}
                  </span>
                </button>
              );
            })}
          </div>

          {error && (
            <p className="border-t border-line px-8 py-3 text-sm text-blush-deep">{error}</p>
          )}

          <div className="flex items-center justify-between gap-4 border-t border-line-dark px-8 py-5">
            <p className="eyebrow text-muted">
              {selected.size} of {candidates?.length ?? 0} selected
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={close}
                disabled={isSaving}
                className="eyebrow cursor-pointer rounded-full border border-line-dark px-5 py-2.5 text-ink transition-colors hover:bg-card disabled:cursor-wait disabled:opacity-70"
              >
                Discard All
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || selected.size === 0}
                className="eyebrow cursor-pointer rounded-full border border-line-dark bg-ink px-5 py-2.5 text-cream transition-colors hover:bg-accent disabled:cursor-wait disabled:opacity-70"
              >
                {isSaving ? "Saving…" : `Save Selected (${selected.size})`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
