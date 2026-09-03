"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveLocation,
  searchLocations,
  type LocationChoice,
} from "@/lib/actions/settings";

/**
 * The gear button + its modal. Open state lives in WardrobeView so the daily
 * suggestion card's "Set your location" button can open the same dialog.
 *
 * Coordinates never reach this component: the search action returns labels and
 * an index, and saving sends the index back for the server to resolve.
 */
export function LocationSettings({
  currentLabel,
  ipGuess,
  open,
  onOpenChange,
}: {
  currentLabel: string | null;
  /** First-run prefill from Vercel's IP headers — a guess to confirm, never saved silently. */
  ipGuess: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(currentLabel ?? ipGuess ?? "");
  const [matches, setMatches] = useState<LocationChoice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset to a clean sheet each time the dialog opens.
  useEffect(() => {
    if (!open) return;
    setQuery(currentLabel ?? ipGuess ?? "");
    setMatches(null);
    setError(null);
    const id = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(id);
  }, [open, currentLabel, ipGuess]);

  function close() {
    if (isPending) return;
    onOpenChange(false);
  }

  function commit(choice: LocationChoice) {
    startTransition(async () => {
      const result = await saveLocation(query, choice.index, choice.label);
      if (result.error) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMatches(null);
    startTransition(async () => {
      const result = await searchLocations(query);
      if (result.error || !result.matches) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      // One unambiguous match — no point making her pick from a list of one.
      if (result.matches.length === 1) {
        commit(result.matches[0]);
        return;
      }
      setMatches(result.matches);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        aria-label="Location settings"
        title={currentLabel ? `Location: ${currentLabel}` : "Set your location"}
        className="mb-1 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-line-dark bg-cream/50 text-ink-soft transition-colors hover:border-accent hover:text-accent"
      >
        <GearIcon className="h-4 w-4" />
      </button>

      <div
        aria-hidden={!open}
        className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 ${
          open ? "" : "pointer-events-none"
        }`}
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
          aria-label="Location settings"
          className={`relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-line-dark bg-cream p-5 shadow-xl transition-all duration-300 sm:max-h-[85vh] sm:p-8 ${
            open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          }`}
        >
          <div className="flex items-start justify-between">
            <h2 className="font-serif text-2xl tracking-tight">Your location</h2>
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

          <p className="mt-3 text-xs leading-relaxed text-muted">
            Used only to show today&rsquo;s weather on your suggestion card.
            {currentLabel ? ` Currently set to ${currentLabel}.` : ""}
          </p>

          <form onSubmit={handleSearch} className="mt-5 flex flex-col gap-5">
            <div>
              <p className="eyebrow text-muted">Your location</p>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Boston, MA"
                autoComplete="off"
                className="mt-2.5 w-full border border-line-dark bg-transparent px-3.5 py-2.5 text-sm focus:border-ink focus:outline-none"
              />
              {!currentLabel && ipGuess && (
                <p className="mt-2 text-xs text-muted">
                  Guessed from your connection — check it before saving.
                </p>
              )}
            </div>

            {matches && matches.length > 0 && (
              <div>
                <p className="eyebrow text-muted">Did you mean</p>
                <ul className="mt-2.5 flex flex-col gap-1.5">
                  {matches.map((match) => (
                    <li key={match.index}>
                      <button
                        type="button"
                        onClick={() => commit(match)}
                        disabled={isPending}
                        className="w-full cursor-pointer rounded-xl border border-line bg-card/40 px-3.5 py-2.5 text-left text-sm transition-colors hover:border-accent hover:bg-card disabled:cursor-wait disabled:opacity-70"
                      >
                        {match.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {error && <p className="text-sm text-blush-deep">{error}</p>}

            <button
              type="submit"
              disabled={isPending || query.trim().length === 0}
              className="eyebrow mt-1 w-full cursor-pointer rounded-full border border-line-dark bg-ink py-3 text-cream transition-colors hover:bg-accent disabled:cursor-wait disabled:opacity-70"
            >
              {isPending ? "Looking it up…" : matches ? "Search again" : "Find my location"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

function GearIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3.1" />
      <path d="M19.4 14.4a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.84 2.84l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.12a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.84-2.84l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.12a1.7 1.7 0 0 0 1.55-1.1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.84-2.84l.06.06a1.7 1.7 0 0 0 1.87.34H9.6a1.7 1.7 0 0 0 1.03-1.56V3a2 2 0 1 1 4 0v.12a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.84 2.84l-.06.06a1.7 1.7 0 0 0-.34 1.87v.08a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.12a1.7 1.7 0 0 0-1.48 1.24Z" />
    </svg>
  );
}
