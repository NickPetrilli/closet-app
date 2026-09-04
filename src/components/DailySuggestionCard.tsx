"use client";

import { useState, useTransition } from "react";
import {
  addOccasion,
  logWear,
  requestSuggestion,
} from "@/lib/actions/suggestion";
import { NOTABLE_PRECIP } from "@/lib/weather-bands";
import {
  itemImage,
  type ClothingItem,
  type DailySuggestion,
  type OccasionTag,
} from "@/lib/types";
import { GarmentGlyph } from "./GarmentGlyph";
import { OccasionPicker } from "./OccasionPicker";
import { WeatherIcon } from "./WeatherIcon";

export function DailySuggestionCard({
  suggestion: initialSuggestion,
  items,
  occasionTags: initialTags,
  onOpenLocationSettings,
  onSelectItem,
}: {
  suggestion: DailySuggestion;
  items: ClothingItem[];
  occasionTags: OccasionTag[];
  onOpenLocationSettings: () => void;
  onSelectItem: (id: string) => void;
}) {
  const [suggestion, setSuggestion] = useState(initialSuggestion);
  const [tags, setTags] = useState(initialTags);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // What "Show another" has already offered, so it keeps moving rather than
  // cycling back to the same pick. Resets whenever the occasion changes.
  const [seenOutfitIds, setSeenOutfitIds] = useState<string[]>([]);
  const [seenItemIds, setSeenItemIds] = useState<string[]>([]);

  const weather = suggestion.weather;
  const suggestedItems = suggestion.itemIds
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is ClothingItem => item !== undefined);

  function applyResult(
    result: { suggestion?: DailySuggestion; error?: string },
    fallbackError: string
  ) {
    if (result.suggestion) setSuggestion(result.suggestion);
    setError(result.error ?? (result.suggestion ? null : fallbackError));
  }

  function selectOccasion(occasion: string | null) {
    setSeenOutfitIds([]);
    setSeenItemIds([]);
    startTransition(async () => {
      const result = await requestSuggestion({ occasion });
      applyResult(result, "Couldn't update the suggestion.");
    });
  }

  function showAnother() {
    // Remember what's on screen now so the next request can't repeat it.
    const nextOutfitIds = suggestion.outfitId
      ? [...seenOutfitIds, suggestion.outfitId]
      : seenOutfitIds;
    const nextItemIds =
      suggestion.source === "ai"
        ? [...seenItemIds, ...suggestion.itemIds]
        : seenItemIds;

    setSeenOutfitIds(nextOutfitIds);
    setSeenItemIds(nextItemIds);

    startTransition(async () => {
      const result = await requestSuggestion({
        occasion: suggestion.occasion,
        excludeOutfitIds: nextOutfitIds,
        excludeItemIds: nextItemIds,
        // Re-rolling isn't changing her mind about the occasion.
        persistOccasion: false,
      });
      applyResult(result, "Couldn't find another one.");
    });
  }

  function wearThis() {
    startTransition(async () => {
      const result = await logWear({
        outfitId: suggestion.outfitId,
        itemIds: suggestion.itemIds,
        occasion: suggestion.occasion,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setSuggestion((prev) => ({ ...prev, loggedToday: true }));
    });
  }

  async function addNewOccasion(label: string): Promise<string | null> {
    const result = await addOccasion(label);
    if (result.error || !result.tag) {
      return result.error ?? "Couldn't add that one.";
    }
    const tag = result.tag;
    setTags((prev) =>
      prev.some((t) => t.id === tag.id)
        ? prev
        : [...prev, tag].sort((a, b) => a.label.localeCompare(b.label))
    );
    selectOccasion(tag.id);
    return null;
  }

  const canAct = suggestion.itemIds.length > 0;

  return (
    <section
      aria-label="Today's suggestion"
      className="flex flex-col gap-5 rounded-card border border-edge-subtle bg-gradient-to-br from-surface-raised to-surface-sunken px-6 py-5 shadow-card"
    >
      {/* Weather + the pieces themselves */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-muted/30 text-accent">
            {weather ? (
              <WeatherIcon
                icon={weather.icon}
                isDay={weather.isDay}
                className="h-7 w-7"
              />
            ) : (
              <PinIcon className="h-6 w-6" />
            )}
          </span>

          <div>
            <p className="eyebrow text-ink-tertiary">Today&rsquo;s suggestion</p>
            {weather ? (
              <>
                <p className="mt-1 font-serif text-xl leading-snug">
                  {weather.condition}, {weather.tempF}°
                </p>
                <p className="meta mt-1.5 text-ink-tertiary">
                  H {weather.hiF}° · L {weather.loF}°
                  {weather.precipProbability >= NOTABLE_PRECIP
                    ? ` · ${weather.precipProbability}% chance of ${
                        weather.icon === "snow" ? "snow" : "rain"
                      }`
                    : ""}
                </p>
              </>
            ) : (
              <>
                <p className="mt-1 font-serif text-xl leading-snug">
                  Set your location to see today&rsquo;s weather.
                </p>
                <button
                  type="button"
                  onClick={onOpenLocationSettings}
                  className="btn-label mt-2 cursor-pointer rounded-full border border-edge bg-surface-raised/60 px-3.5 py-1.5 text-ink-secondary transition-colors hover:border-accent hover:text-accent"
                >
                  Set location
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {isPending
            ? [0, 1, 2].map((i) => (
                <div key={i} className="skeleton h-14 w-14 rounded-control" />
              ))
            : suggestedItems.map((item) => {
                const thumb = itemImage(item);
                return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectItem(item.id)}
                  title={item.name}
                  className="flex h-14 w-14 cursor-pointer items-center justify-center overflow-hidden rounded-control border border-edge-subtle bg-surface-sunken transition-all duration-150 hover:-translate-y-0.5 hover:border-accent hover:shadow-card"
                >
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb.src}
                      alt={item.name}
                      className={
                        thumb.isCutout
                          ? "h-full w-full object-contain p-1.5"
                          : "h-full w-full object-cover"
                      }
                    />
                  ) : (
                    <GarmentGlyph
                      category={item.category}
                      silhouette={item.silhouette}
                      colorHex={item.primaryColorHex}
                      className="w-8"
                    />
                  )}
                </button>
                );
              })}
        </div>
      </div>

      <OccasionPicker
        tags={tags}
        selected={suggestion.occasion}
        disabled={isPending}
        onSelect={selectOccasion}
        onAdd={addNewOccasion}
      />

      {/* Why this, and what to do about it */}
      <div className="flex flex-col gap-3 border-t border-edge-subtle pt-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {suggestion.outfitName && (
            <p className="font-serif text-lg leading-snug">
              {suggestion.outfitName}
            </p>
          )}
          <p className="mt-0.5 text-sm leading-relaxed text-ink-secondary">
            {isPending ? "Thinking it over…" : suggestion.rationale}
          </p>
          {error && <p className="mt-1.5 text-sm text-error">{error}</p>}
        </div>

        {/* Actions stack on phones: side by side, "Show another" wraps to two
            lines against its single-line neighbour, with about a pixel to
            spare at 375px — not a margin worth trusting. */}
        {canAct && (
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={showAnother}
              disabled={isPending}
              className="btn-label btn-secondary w-full rounded-full px-4 py-2.5 sm:w-auto"
            >
              Show another
            </button>
            <button
              type="button"
              onClick={wearThis}
              disabled={isPending || suggestion.loggedToday}
              className={`btn-label w-full rounded-full px-4 py-2.5 sm:w-auto ${
                // Logged is a settled state, not an action — it reads as a
                // quiet confirmation rather than something still to press.
                suggestion.loggedToday
                  ? "cursor-default border border-accent-muted bg-accent-muted/25 text-accent"
                  : "btn-primary"
              }`}
            >
              {suggestion.loggedToday ? "Worn today ✓" : "Wore this"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function PinIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 21.5s7-6.2 7-11.1a7 7 0 1 0-14 0c0 4.9 7 11.1 7 11.1Z" />
      <circle cx="12" cy="10.2" r="2.6" />
    </svg>
  );
}
