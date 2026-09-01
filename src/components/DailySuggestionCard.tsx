"use client";

import { hasPhoto, type ClothingItem, type DailySuggestion } from "@/lib/types";
import { GarmentGlyph } from "./GarmentGlyph";

export function DailySuggestionCard({
  suggestion,
  items,
  onSelectItem,
}: {
  suggestion: DailySuggestion;
  items: ClothingItem[];
  onSelectItem: (id: string) => void;
}) {
  const suggestedItems = suggestion.itemIds
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is ClothingItem => item !== undefined);

  return (
    <section
      aria-label="Today's suggestion"
      className="flex flex-col gap-6 rounded-2xl border border-line bg-gradient-to-br from-cream to-card px-6 py-5 shadow-[0_10px_30px_-20px_rgba(36,56,75,0.5)] sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-soft/30 text-accent">
          <SunIcon className="h-7 w-7" />
        </span>
        <div>
          <p className="eyebrow text-muted">Today&rsquo;s suggestion</p>
          <p className="mt-1 font-serif text-xl leading-snug">
            {suggestion.weather.condition}, {suggestion.weather.tempF}° —
            something easy for a mild day.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <span className="eyebrow rounded-full border border-blush-deep/40 bg-blush/30 px-3.5 py-1.5 text-ink-soft">
          {suggestion.occasion}
        </span>
        <div className="flex gap-2">
          {suggestedItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectItem(item.id)}
              title={item.name}
              className="flex h-14 w-14 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-line bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-accent hover:shadow-sm"
            >
              {hasPhoto(item.imageUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-full w-full object-cover"
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
          ))}
        </div>
      </div>
    </section>
  );
}

function SunIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8" />
    </svg>
  );
}
