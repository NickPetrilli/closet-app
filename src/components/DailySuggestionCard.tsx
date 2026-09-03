"use client";

import {
  hasPhoto,
  type ClothingItem,
  type DailySuggestion,
  type Weather,
} from "@/lib/types";
import { GarmentGlyph } from "./GarmentGlyph";
import { WeatherIcon } from "./WeatherIcon";

/** Precipitation below this reads as noise, not a forecast worth mentioning. */
const NOTABLE_PRECIP = 20;

/** Warm/cool bands, keyed off feels-like rather than the raw temperature. */
function temperatureBand(feelsLikeF: number) {
  if (feelsLikeF < 35) return "freezing";
  if (feelsLikeF < 48) return "cold";
  if (feelsLikeF < 60) return "cool";
  if (feelsLikeF < 73) return "mild";
  if (feelsLikeF < 84) return "warm";
  return "hot";
}

const DRY_LINES: Record<string, string> = {
  freezing: "your warmest layers, no negotiating.",
  cold: "something with a real coat over it.",
  cool: "a light-jacket kind of day.",
  mild: "something easy for a mild day.",
  warm: "keep it light and breezy.",
  hot: "the airiest thing in the closet.",
};

const WET_LINES: Record<string, string> = {
  freezing: "warm layers you don't mind getting damp.",
  cold: "a proper coat and something water-shy.",
  cool: "a jacket you can shake the rain off.",
  mild: "something easy — and an umbrella.",
  warm: "light layers, but take the umbrella.",
  hot: "the airiest thing you own, plus an umbrella.",
};

/** The editorial one-liner, now keyed to the actual forecast. */
function describeDay(weather: Weather): string {
  if (weather.icon === "snow") return "boots and your warmest coat.";

  const band = temperatureBand(weather.feelsLikeF);
  const wet =
    weather.precipProbability >= NOTABLE_PRECIP ||
    weather.icon === "rain" ||
    weather.icon === "drizzle" ||
    weather.icon === "storm";

  return (wet ? WET_LINES : DRY_LINES)[band];
}

export function DailySuggestionCard({
  suggestion,
  items,
  onOpenLocationSettings,
  onSelectItem,
}: {
  suggestion: DailySuggestion;
  items: ClothingItem[];
  onOpenLocationSettings: () => void;
  onSelectItem: (id: string) => void;
}) {
  const suggestedItems = suggestion.itemIds
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is ClothingItem => item !== undefined);

  const weather = suggestion.weather;
  const precipLabel = weather?.icon === "snow" ? "snow" : "rain";

  return (
    <section
      aria-label="Today's suggestion"
      className="flex flex-col gap-6 rounded-2xl border border-line bg-gradient-to-br from-cream to-card px-6 py-5 shadow-[0_10px_30px_-20px_rgba(36,56,75,0.5)] sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-soft/30 text-accent">
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

        {weather ? (
          <div>
            <p className="eyebrow text-muted">Today&rsquo;s suggestion</p>
            <p className="mt-1 font-serif text-xl leading-snug">
              {weather.condition}, {weather.tempF}° — {describeDay(weather)}
            </p>
            <p className="eyebrow mt-1.5 text-muted">
              H {weather.hiF}° · L {weather.loF}°
              {weather.precipProbability >= NOTABLE_PRECIP
                ? ` · ${weather.precipProbability}% chance of ${precipLabel}`
                : ""}
            </p>
          </div>
        ) : (
          <div>
            <p className="eyebrow text-muted">Today&rsquo;s suggestion</p>
            <p className="mt-1 font-serif text-xl leading-snug">
              Set your location to see today&rsquo;s weather.
            </p>
            <button
              type="button"
              onClick={onOpenLocationSettings}
              className="eyebrow mt-2 cursor-pointer rounded-full border border-line-dark bg-cream/60 px-3.5 py-1.5 text-ink-soft transition-colors hover:border-accent hover:text-accent"
            >
              Set location
            </button>
          </div>
        )}
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
