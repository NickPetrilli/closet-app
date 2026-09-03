"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateOutfits, saveOutfits, type OutfitCandidate } from "@/lib/actions/outfits";
import { hasPhoto, type ClothingItem } from "@/lib/types";
import { GarmentGlyph } from "./GarmentGlyph";
import { SceneBackdrop, vibeLabel } from "./SceneBackdrop";

const GENERATE_COUNT = 8;

/** Cycled through while Gemini works so the wait reads as progress, not a hang. */
const LOADING_STEPS = [
  "Looking through every piece in the wardrobe…",
  "Matching colours and balancing silhouettes…",
  "Building tops, bottoms, and shoes into looks…",
  "Skipping anything too close to an outfit you have…",
  "Giving each look a name…",
];

export function GenerateOutfitsButton({ items }: { items: ClothingItem[] }) {
  const router = useRouter();
  const [isGenerating, startGenerating] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const [candidates, setCandidates] = useState<OutfitCandidate[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);

  // Keep the modal up for the whole flow: while Gemini runs, while the user
  // reviews candidates, and to show a generation error (which otherwise
  // vanishes with the modal before it can be read).
  const open = candidates !== null || isGenerating || error !== null;

  useEffect(() => {
    if (!isGenerating) {
      setLoadingStep(0);
      return;
    }
    const id = setInterval(
      () => setLoadingStep((s) => (s + 1) % LOADING_STEPS.length),
      2800
    );
    return () => clearInterval(id);
  }, [isGenerating]);

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
    if (isSaving || isGenerating) return;
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
        className="eyebrow flex w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border border-line-dark bg-ink px-5 py-2.5 text-cream transition-colors hover:bg-accent disabled:cursor-wait disabled:opacity-70 sm:w-auto sm:justify-start"
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
          aria-label={
            isGenerating
              ? "Generating outfits"
              : candidates === null
                ? "Outfit generation failed"
                : "Review generated outfits"
          }
          className={`relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-line-dark bg-cream shadow-xl transition-all duration-300 sm:max-h-[85vh] ${
            open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          }`}
        >
          {isGenerating ? (
            <GeneratingState step={loadingStep} />
          ) : candidates === null ? (
            <div className="flex flex-col items-center gap-5 px-5 py-14 text-center sm:px-8 sm:py-16">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blush/30 text-blush-deep">
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 3 2.5 20h19L12 3Z" />
                  <path d="M12 9v4.5M12 16.5v.01" />
                </svg>
              </span>
              <div>
                <h2 className="font-serif text-2xl tracking-tight">
                  Couldn&apos;t generate outfits
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">{error}</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={close}
                  className="eyebrow cursor-pointer rounded-full border border-line-dark px-5 py-2.5 text-ink transition-colors hover:bg-card"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="eyebrow cursor-pointer rounded-full border border-line-dark bg-ink px-5 py-2.5 text-cream transition-colors hover:bg-accent"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : (
            <>
          <div className="flex items-start justify-between border-b border-line px-5 py-5 sm:px-8 sm:py-6">
            <div>
              <h2 className="font-serif text-xl tracking-tight sm:text-2xl">
                Review generated outfits
              </h2>
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

          <div className="grid flex-1 auto-rows-min content-start grid-cols-2 gap-3 overflow-y-auto p-4 sm:grid-cols-3 sm:gap-4 sm:p-8">
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
            <p className="border-t border-line px-5 py-3 text-sm text-blush-deep sm:px-8">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-3 border-t border-line-dark px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-8 sm:py-5">
            <p className="eyebrow text-muted">
              {selected.size} of {candidates?.length ?? 0} selected
            </p>
            <div className="flex gap-2 sm:gap-3">
              <button
                type="button"
                onClick={close}
                disabled={isSaving}
                className="eyebrow flex-1 cursor-pointer rounded-full border border-line-dark px-5 py-2.5 text-ink transition-colors hover:bg-card disabled:cursor-wait disabled:opacity-70 sm:flex-none"
              >
                Discard All
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || selected.size === 0}
                className="eyebrow flex-1 cursor-pointer rounded-full border border-line-dark bg-ink px-5 py-2.5 text-cream transition-colors hover:bg-accent disabled:cursor-wait disabled:opacity-70 sm:flex-none"
              >
                {isSaving ? "Saving…" : `Save Selected (${selected.size})`}
              </button>
            </div>
          </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

/** Full-modal loading state shown while Gemini builds the candidates. */
function GeneratingState({ step }: { step: number }) {
  return (
    <div className="flex flex-col items-center gap-6 px-5 py-12 text-center sm:gap-7 sm:px-8 sm:py-14">
      <span className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-accent-soft/40" />
        <span className="absolute inset-0 rounded-full bg-accent-soft/25" />
        <svg
          viewBox="0 0 16 16"
          className="animate-twinkle relative h-7 w-7 text-accent"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M8 1.5 L9.6 6.2 L14.5 8 L9.6 9.8 L8 14.5 L6.4 9.8 L1.5 8 L6.4 6.2 Z" />
        </svg>
      </span>

      <div className="space-y-2">
        <h2 className="font-serif text-2xl tracking-tight">Putting looks together</h2>
        <p key={step} className="eyebrow animate-fade-in text-muted">
          {LOADING_STEPS[step]}
        </p>
      </div>

      <div className="grid w-full max-w-md grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton aspect-[3/4] rounded-xl border border-line" />
        ))}
      </div>

      <p className="text-xs text-muted">This usually takes 20&ndash;40 seconds.</p>
    </div>
  );
}
