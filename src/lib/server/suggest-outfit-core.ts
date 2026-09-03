import { isWet, temperatureBand, type TemperatureBand } from "@/lib/weather-bands";
import type {
  ClothingItem,
  Outfit,
  OutfitVibe,
  Silhouette,
  Weather,
} from "@/lib/types";

/**
 * Scoring for "what should Jenna wear today". Saved outfits are scored first
 * and an AI combination is only generated when none of them fit (see
 * suggest-outfit.ts) — that keeps the common case free and surfaces the
 * outfits she actually curated.
 *
 * Pure on purpose: no network and no database, so scripts/check-suggestion.mjs
 * can run this exact code under Node's type stripping (via the resolver in
 * scripts/ts-resolve.mjs) rather than a paraphrase of it.
 */

/** Below this, no saved outfit is a good enough answer — ask the model instead. */
export const SAVED_OUTFIT_THRESHOLD = 0.6;

/** An outfit with more than this share of recently-worn items is skipped outright. */
const RECENTLY_WORN_LIMIT = 0.5;

/** How many days back "recently worn" reaches. */
export const RECENTLY_WORN_DAYS = 5;

/**
 * How well each outfit vibe suits each occasion. Unlisted pairs fall back to
 * NEUTRAL_FIT, which is also what a custom occasion gets — with no opinion
 * about a tag she invented, weather should decide.
 */
const NEUTRAL_FIT = 0.6;

const OCCASION_VIBE_FIT: Record<string, Partial<Record<OutfitVibe, number>>> = {
  work: { office: 1, autumn: 0.55, street: 0.5, weekend: 0.35, evening: 0.3, summer: 0.3 },
  gym: { weekend: 0.9, street: 0.8, summer: 0.6, autumn: 0.3, office: 0.05, evening: 0.05 },
  date: { evening: 1, street: 0.7, summer: 0.6, autumn: 0.5, weekend: 0.45, office: 0.35 },
  casual: { weekend: 1, street: 0.8, summer: 0.7, autumn: 0.7, office: 0.3, evening: 0.3 },
  travel: { weekend: 0.9, street: 0.8, autumn: 0.6, summer: 0.6, office: 0.4, evening: 0.3 },
  errands: { weekend: 0.95, street: 0.8, summer: 0.6, autumn: 0.6, office: 0.3, evening: 0.2 },
};

/** How well each vibe suits each temperature band. */
const VIBE_BAND_FIT: Record<OutfitVibe, Record<TemperatureBand, number>> = {
  summer: { freezing: 0.02, cold: 0.05, cool: 0.2, mild: 0.6, warm: 0.95, hot: 1 },
  autumn: { freezing: 0.7, cold: 0.95, cool: 1, mild: 0.7, warm: 0.3, hot: 0.1 },
  office: { freezing: 0.4, cold: 0.6, cool: 0.85, mild: 0.9, warm: 0.7, hot: 0.4 },
  evening: { freezing: 0.3, cold: 0.5, cool: 0.7, mild: 0.9, warm: 0.9, hot: 0.6 },
  weekend: { freezing: 0.5, cold: 0.7, cool: 0.85, mild: 0.9, warm: 0.85, hot: 0.6 },
  street: { freezing: 0.5, cold: 0.75, cool: 0.9, mild: 0.9, warm: 0.75, hot: 0.5 },
};

/** Pieces that give up on a cold day. */
const BARE_SILHOUETTES: Silhouette[] = [
  "tank",
  "cami",
  "shorts",
  "mini-skirt",
  "sandal",
];

/** Pieces that are punishing in real heat. */
const HEAVY_SILHOUETTES: Silhouette[] = [
  "puffer",
  "trench",
  "sweater",
  "hoodie",
  "sweatshirt",
  "cardigan",
  "tall-boot",
];

/** Shoes you'd regret in the rain. */
const WET_UNFRIENDLY: Silhouette[] = ["sandal", "flat", "loafer"];

/**
 * Floor only, no ceiling: clamping the top end to 1 made several strong
 * outfits tie at exactly 1.00, which left the pick among them down to array
 * order. Scores are never shown to the user, so letting them run past 1 costs
 * nothing and keeps the ranking meaningful.
 */
function floorAtZero(value: number): number {
  return Math.max(0, value);
}

export interface OutfitScore {
  outfitId: string;
  score: number;
  /** Set when the outfit is disqualified rather than merely low-scoring. */
  excluded?: "recently-worn" | "empty";
}

/**
 * Adjustments the vibe alone can't capture — an "office" outfit of a cami and
 * sandals is still the wrong answer at 30°.
 */
function garmentAdjustment(
  outfitItems: ClothingItem[],
  weather: Weather
): number {
  const band = temperatureBand(weather.feelsLikeF);
  const wet = isWet(weather);
  const hasJacket = outfitItems.some((item) => item.category === "jackets");
  const has = (list: Silhouette[]) =>
    outfitItems.some(
      (item) => item.silhouette && list.includes(item.silhouette)
    );

  let adjustment = 0;

  if (band === "freezing" || band === "cold") {
    adjustment += hasJacket ? 0.15 : -0.2;
    if (has(BARE_SILHOUETTES)) adjustment -= 0.15;
  } else if (band === "cool") {
    adjustment += hasJacket ? 0.08 : -0.05;
  } else if (band === "warm") {
    if (has(HEAVY_SILHOUETTES)) adjustment -= 0.15;
  } else if (band === "hot") {
    if (hasJacket) adjustment -= 0.15;
    if (has(HEAVY_SILHOUETTES)) adjustment -= 0.2;
  }

  if (wet) {
    adjustment += hasJacket ? 0.08 : -0.05;
    if (has(WET_UNFRIENDLY)) adjustment -= 0.15;
  }

  return adjustment;
}

export function occasionFit(vibe: OutfitVibe, occasion: string | null): number {
  if (!occasion) return NEUTRAL_FIT;
  return OCCASION_VIBE_FIT[occasion]?.[vibe] ?? NEUTRAL_FIT;
}

export function weatherFit(vibe: OutfitVibe, weather: Weather): number {
  return VIBE_BAND_FIT[vibe][temperatureBand(weather.feelsLikeF)];
}

export function scoreOutfit({
  outfit,
  items,
  weather,
  occasion,
  recentlyWorn,
}: {
  outfit: Outfit;
  items: ClothingItem[];
  weather: Weather;
  occasion: string | null;
  recentlyWorn: Set<string>;
}): OutfitScore {
  const outfitItems = outfit.itemIds
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is ClothingItem => item !== undefined);

  if (outfitItems.length === 0) {
    return { outfitId: outfit.id, score: 0, excluded: "empty" };
  }

  const wornCount = outfitItems.filter((item) =>
    recentlyWorn.has(item.id)
  ).length;
  const wornShare = wornCount / outfitItems.length;
  if (wornShare > RECENTLY_WORN_LIMIT) {
    return { outfitId: outfit.id, score: 0, excluded: "recently-worn" };
  }

  const base =
    0.5 * occasionFit(outfit.vibe, occasion) + 0.5 * weatherFit(outfit.vibe, weather);
  const score =
    base + garmentAdjustment(outfitItems, weather) - 0.5 * wornShare;

  return { outfitId: outfit.id, score: floorAtZero(score) };
}

/** Highest-scoring eligible outfit, or null when none clears the threshold. */
export function bestSavedOutfit({
  outfits,
  items,
  weather,
  occasion,
  recentlyWorn,
  excludeOutfitIds = [],
}: {
  outfits: Outfit[];
  items: ClothingItem[];
  weather: Weather;
  occasion: string | null;
  recentlyWorn: Set<string>;
  excludeOutfitIds?: string[];
}): { outfit: Outfit; score: number } | null {
  const excluded = new Set(excludeOutfitIds);

  const ranked = outfits
    .filter((outfit) => !excluded.has(outfit.id))
    .map((outfit) => ({
      outfit,
      result: scoreOutfit({ outfit, items, weather, occasion, recentlyWorn }),
    }))
    .filter(({ result }) => !result.excluded)
    .sort((a, b) => b.result.score - a.result.score);

  const top = ranked[0];
  if (!top || top.result.score < SAVED_OUTFIT_THRESHOLD) return null;
  return { outfit: top.outfit, score: top.result.score };
}

const BAND_PHRASE: Record<TemperatureBand, string> = {
  freezing: "Built for the cold",
  cold: "Warm enough for the cold",
  cool: "Right for a cool day",
  mild: "Easy for a mild day",
  warm: "Light enough for the warmth",
  hot: "About as light as your closet gets",
};

/** The one-liner under a saved-outfit suggestion. */
export function savedOutfitRationale(
  outfit: Outfit,
  outfitItems: ClothingItem[],
  weather: Weather
): string {
  const phrase = BAND_PHRASE[temperatureBand(weather.feelsLikeF)];
  const hasJacket = outfitItems.some((item) => item.category === "jackets");
  const rainNote = isWet(weather) && hasJacket ? ", and it can take the rain" : "";
  return `${phrase}${rainNote} — one of your saved ${outfit.vibe} looks.`;
}
