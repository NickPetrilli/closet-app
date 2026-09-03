import { Type } from "@google/genai";
import { generateJson, isGeminiConfigured } from "@/lib/server/gemini";
import {
  bestSavedOutfit,
  savedOutfitRationale,
} from "@/lib/server/suggest-outfit-core";
import { isWet, temperatureBand } from "@/lib/weather-bands";
import type {
  Category,
  ClothingItem,
  DailySuggestion,
  Outfit,
  Weather,
} from "@/lib/types";

/**
 * Picks today's outfit: a saved outfit whenever one fits, an AI-composed
 * combination only when none does. Scoring lives in suggest-outfit-core.ts;
 * this module owns the Gemini fallback and assembles the DailySuggestion.
 */

const REQUIRED_CATEGORIES: Category[] = ["tops", "bottoms", "shoes"];

/** Top, bottom, shoes, plus a jacket and a couple of accessories at most. */
const MAX_ITEMS = 6;

export interface SuggestionInput {
  items: ClothingItem[];
  outfits: Outfit[];
  weather: Weather | null;
  occasion: string | null;
  recentlyWorn: Set<string>;
  /** Outfits already shown — "Show another" passes what it's replacing. */
  excludeOutfitIds?: string[];
  /** Items already shown in an AI pick this session. */
  excludeItemIds?: string[];
}

export interface SuggestionResult {
  suggestion: DailySuggestion;
  /** Set when the AI fallback failed; the suggestion is still usable. */
  error?: string;
}

function hasEveryRequiredCategory(items: ClothingItem[]): boolean {
  const present = new Set(items.map((item) => item.category));
  return REQUIRED_CATEGORIES.every((category) => present.has(category));
}

/** First item per core category — the last-resort pick, as in Phase 1. */
function fallbackItemIds(items: ClothingItem[]): string[] {
  const picks = REQUIRED_CATEGORIES.map((category) =>
    items.find((item) => item.category === category)
  ).filter((item): item is ClothingItem => item !== undefined);
  return (picks.length > 0 ? picks : items.slice(0, 3)).map((item) => item.id);
}

function describeWeather(weather: Weather): string {
  const precip =
    weather.precipProbability > 0
      ? `, ${weather.precipProbability}% chance of precipitation`
      : "";
  return (
    `${weather.tempF}°F (feels like ${weather.feelsLikeF}°F), ` +
    `high ${weather.hiF}°, low ${weather.loF}°, ${weather.condition}` +
    `${precip}, wind ${weather.windMph} mph`
  );
}

function buildPrompt(
  candidates: ClothingItem[],
  weather: Weather,
  occasionLabel: string | null
): string {
  const lines = candidates.map(
    (item) =>
      `- id=${item.id} category=${item.category} name="${item.name}" color=${item.primaryColorHex}` +
      (item.silhouette ? ` silhouette=${item.silhouette}` : "")
  );

  return [
    "Pick ONE outfit from this real wardrobe for today.",
    "",
    `WEATHER: ${describeWeather(weather)}.`,
    `OCCASION: ${occasionLabel ?? "no particular plans"}.`,
    "",
    "Choose exactly one top, one bottom and one pair of shoes. You may also add",
    "one jacket and up to two accessories. Pick pieces that work together in",
    "color and formality AND that suit the weather and occasion above — a",
    "jacket when it is cold or wet, nothing heavy when it is hot.",
    "",
    "Return JSON with:",
    '  itemIds  - the exact id strings, ordered top, bottom, shoes, then extras',
    '  rationale - ONE short sentence, at most 14 words, on why this suits today.',
    "             Mention the weather or the occasion, not the garment names.",
    "",
    "AVAILABLE ITEMS:",
    ...lines,
  ].join("\n");
}

const RESPONSE_CONFIG = {
  responseMimeType: "application/json",
  responseSchema: {
    type: Type.OBJECT,
    properties: {
      itemIds: { type: Type.ARRAY, items: { type: Type.STRING } },
      rationale: { type: Type.STRING },
    },
    required: ["itemIds", "rationale"],
  },
};

interface AiPick {
  itemIds: string[];
  rationale: string;
}

/** Keeps only real ids, in order, and insists on the three core categories. */
function validateAiPick(raw: unknown, candidates: ClothingItem[]): AiPick | null {
  if (typeof raw !== "object" || raw === null) return null;
  const value = raw as { itemIds?: unknown; rationale?: unknown };
  if (!Array.isArray(value.itemIds)) return null;

  const byId = new Map(candidates.map((item) => [item.id, item]));
  const seen = new Set<string>();
  const picked: ClothingItem[] = [];

  for (const id of value.itemIds) {
    if (typeof id !== "string" || seen.has(id)) continue;
    const item = byId.get(id);
    if (!item) continue;
    seen.add(id);
    picked.push(item);
    if (picked.length === MAX_ITEMS) break;
  }

  if (!hasEveryRequiredCategory(picked)) return null;

  const rationale =
    typeof value.rationale === "string" ? value.rationale.trim() : "";
  return { itemIds: picked.map((item) => item.id), rationale };
}

/** A serviceable one-liner when the model's own is missing or unusable. */
function genericRationale(weather: Weather, occasionLabel: string | null): string {
  const band = temperatureBand(weather.feelsLikeF);
  const wet = isWet(weather) ? " and the wet" : "";
  const forWhat = occasionLabel ? ` for ${occasionLabel.toLowerCase()}` : "";
  return `Put together for the ${band}${wet}${forWhat}.`;
}

export async function chooseSuggestion(
  input: SuggestionInput,
  occasionLabel: string | null
): Promise<SuggestionResult> {
  const {
    items,
    outfits,
    weather,
    occasion,
    recentlyWorn,
    excludeOutfitIds = [],
    excludeItemIds = [],
  } = input;

  const base = {
    weather,
    occasion,
    outfitId: null,
    outfitName: null,
    rationale: "",
    source: "none" as const,
    loggedToday: false,
  };

  if (items.length === 0) {
    return { suggestion: { ...base, itemIds: [] } };
  }

  // No location yet — Phase 1's card already asks for one; don't spend a
  // model call guessing what the weather might be.
  if (!weather) {
    return {
      suggestion: {
        ...base,
        itemIds: fallbackItemIds(items),
        rationale: "Set your location and this will fit the weather.",
      },
    };
  }

  // 1. A saved outfit, if any of them genuinely fits.
  const saved = bestSavedOutfit({
    outfits,
    items,
    weather,
    occasion,
    recentlyWorn,
    excludeOutfitIds,
  });

  if (saved) {
    const outfitItems = saved.outfit.itemIds
      .map((id) => items.find((item) => item.id === id))
      .filter((item): item is ClothingItem => item !== undefined);

    return {
      suggestion: {
        ...base,
        outfitId: saved.outfit.id,
        outfitName: saved.outfit.name,
        itemIds: saved.outfit.itemIds,
        rationale: savedOutfitRationale(saved.outfit, outfitItems, weather),
        source: "saved",
      },
    };
  }

  // 2. Nothing saved fits — compose something new.
  const excluded = new Set([...recentlyWorn, ...excludeItemIds]);
  let candidates = items.filter((item) => !excluded.has(item.id));
  // Excluding recently-worn pieces must never leave her with no outfit at all.
  if (!hasEveryRequiredCategory(candidates)) candidates = items;

  if (!hasEveryRequiredCategory(candidates)) {
    return {
      suggestion: {
        ...base,
        itemIds: fallbackItemIds(items),
        rationale: "Add a top, a bottom and shoes to get a real suggestion.",
      },
    };
  }

  if (!isGeminiConfigured()) {
    return {
      suggestion: {
        ...base,
        itemIds: fallbackItemIds(candidates),
        rationale: genericRationale(weather, occasionLabel),
      },
    };
  }

  // Text only, no photos: this runs on every occasion change and every "Show
  // another", and a full-wardrobe vision call would be both slow and the
  // expensive half of the free-tier quota. Names, colors and silhouettes are
  // enough to pick a coherent outfit.
  const { text, error } = await generateJson({
    parts: [{ text: buildPrompt(candidates, weather, occasionLabel) }],
    config: RESPONSE_CONFIG,
    label: "outfit suggestions",
  });

  if (error || !text) {
    return {
      suggestion: {
        ...base,
        itemIds: fallbackItemIds(candidates),
        rationale: genericRationale(weather, occasionLabel),
      },
      error,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = null;
  }

  const pick = validateAiPick(parsed, candidates);
  if (!pick) {
    return {
      suggestion: {
        ...base,
        itemIds: fallbackItemIds(candidates),
        rationale: genericRationale(weather, occasionLabel),
      },
      error: "The suggestion came back in a shape we couldn't use.",
    };
  }

  return {
    suggestion: {
      ...base,
      itemIds: pick.itemIds,
      rationale: pick.rationale || genericRationale(weather, occasionLabel),
      source: "ai",
    },
  };
}
