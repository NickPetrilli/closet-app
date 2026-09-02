import { ApiError, GoogleGenAI, Type } from "@google/genai";
import sharp from "sharp";
import type { Category, ClothingItem, Outfit, OutfitVibe } from "@/lib/types";

const VIBES: OutfitVibe[] = [
  "office",
  "evening",
  "weekend",
  "summer",
  "autumn",
  "street",
];

const REQUIRED_CATEGORIES: Category[] = ["tops", "bottoms", "shoes"];

export interface OutfitCandidate {
  name: string;
  vibe: OutfitVibe;
  itemIds: string[];
}

export interface GenerateOutfitsResult {
  candidates?: OutfitCandidate[];
  error?: string;
}

/** Downscaled so a full wardrobe's worth of images stays a reasonable request size. */
async function fetchAndResize(
  url: string
): Promise<{ data: string; mimeType: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const resized = await sharp(buffer)
      .resize(400, 400, { fit: "inside" })
      .png()
      .toBuffer();
    return { data: resized.toString("base64"), mimeType: "image/png" };
  } catch {
    return null;
  }
}

function buildPrompt(
  items: ClothingItem[],
  existingOutfits: Outfit[],
  count: number
): string {
  const existingSets = existingOutfits.map((o) => o.itemIds);
  return `You are a fashion stylist working from a real wardrobe. Below, each item is introduced by a line "ITEM id=<id> category=<category> name=<name>" immediately followed by its photo. Propose ${count} complete, stylistically coherent outfits.

RULES
- Every outfit needs exactly one top, one bottom, and one pair of shoes (by category). A jacket and/or 1-2 accessories are optional additions, not required.
- Reference items ONLY by the "id" values given below — never invent an id, never use a name in place of an id.
- Favor complementary, analogous, or tonal/monochrome color coordination. Avoid combinations that clash rather than intentionally contrast.
- Avoid pairing two "loud" pieces (bold pattern, bright statement color) in the same outfit — let one piece lead.
- Match the "vibe" field to the actual pieces (e.g. don't call a chunky wool sweater + boots outfit "summer"; don't call linen + sandals "office" unless it genuinely reads that way). Valid vibes: ${VIBES.join(", ")}.
- Reusing individual items across multiple outfits is normal for a real wardrobe and fine, but never propose the exact same set of items twice within your response.
- Do not recreate any of these EXISTING saved outfits (each is a set of item ids that must not be exactly repeated): ${JSON.stringify(existingSets)}
- Give each outfit a short, natural name (not generic like "Outfit 1") reflecting its vibe or a standout piece.

Return a JSON array of up to ${count} outfits, each an object with: name (string), vibe (string, one of the valid vibes), itemIds (array of item id strings).`;
}

interface RawCandidate {
  name?: unknown;
  vibe?: unknown;
  itemIds?: unknown;
}

function validateCandidates(
  raw: unknown,
  items: ClothingItem[],
  existingOutfits: Outfit[]
): OutfitCandidate[] {
  if (!Array.isArray(raw)) return [];

  const validIds = new Set(items.map((i) => i.id));
  const categoryById = new Map(items.map((i) => [i.id, i.category]));
  const existingSets = existingOutfits.map((o) => new Set(o.itemIds));
  const seenInThisBatch = new Set<string>();
  const candidates: OutfitCandidate[] = [];

  for (const entry of raw as RawCandidate[]) {
    if (
      !entry ||
      typeof entry.name !== "string" ||
      typeof entry.vibe !== "string" ||
      !Array.isArray(entry.itemIds)
    ) {
      continue;
    }
    if (!VIBES.includes(entry.vibe as OutfitVibe)) continue;

    const rawIds = entry.itemIds;
    if (!rawIds.every((id): id is string => typeof id === "string" && validIds.has(id))) {
      continue; // a bad/invented id invalidates the whole candidate
    }
    const itemIds = [...new Set(rawIds as string[])];

    const categoriesPresent = new Set(itemIds.map((id) => categoryById.get(id)));
    if (!REQUIRED_CATEGORIES.every((c) => categoriesPresent.has(c))) continue;

    const key = [...itemIds].sort().join(",");
    if (seenInThisBatch.has(key)) continue;
    const duplicatesExisting = existingSets.some(
      (set) => set.size === itemIds.length && itemIds.every((id) => set.has(id))
    );
    if (duplicatesExisting) continue;
    seenInThisBatch.add(key);

    candidates.push({
      name: entry.name.trim() || "Untitled Outfit",
      vibe: entry.vibe as OutfitVibe,
      itemIds,
    });
  }

  return candidates;
}

export async function generateOutfitCandidates(
  items: ClothingItem[],
  existingOutfits: Outfit[],
  count: number
): Promise<GenerateOutfitsResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { error: "Outfit generation isn't configured yet." };
  if (items.length === 0) {
    return { error: "Add some items to the wardrobe first." };
  }

  // The SDK's own default retry policy is up to 5 attempts with backoff up
  // to 60s between them — fine for a long-running script, but this call
  // runs inside a Vercel Server Action capped at 60s total (see maxDuration
  // in src/app/page.tsx), and each attempt against the full wardrobe's
  // images already takes ~10-15s on its own. Retrying the SAME model when
  // it's reporting itself overloaded just burns that budget for nothing —
  // disabling the SDK's retry and going straight to the fallback model
  // below (measured: succeeded in ~7s while the primary model was actively
  // failing) gets a real second attempt in far less time.
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      retryOptions: { attempts: 1 },
    },
  });

  const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [
    { text: buildPrompt(items, existingOutfits, count) },
  ];
  for (const item of items) {
    const url = item.cutoutImageUrl ?? item.imageUrl;
    const image = await fetchAndResize(url);
    parts.push({ text: `ITEM id=${item.id} category=${item.category} name=${item.name}` });
    if (image) parts.push({ inlineData: image });
  }

  const config = {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          vibe: { type: Type.STRING, enum: VIBES },
          itemIds: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["name", "vibe", "itemIds"],
      },
    },
  };

  // "-latest" aliases route to whichever model is currently getting the
  // most traffic, which is exactly what makes them prone to real, live
  // 503 "high demand" responses on the free tier (confirmed directly:
  // gemini-flash-latest returned one while gemini-flash-lite-latest
  // succeeded on the same request seconds later). Falling back to the
  // lite model on a server error trades a little sophistication for
  // actually finishing — worth it for a task this size (matching colors
  // and categories, not deep reasoning).
  const MODEL_FALLBACK_CHAIN = ["gemini-flash-latest", "gemini-flash-lite-latest"];

  let responseText: string | undefined;
  let lastError: unknown;
  for (const model of MODEL_FALLBACK_CHAIN) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts }],
        config,
      });
      responseText = response.text;
      lastError = undefined;
      break;
    } catch (err) {
      lastError = err;
      // 429 (quota exceeded) is tracked per model on the free tier, not
      // shared across them, so a fallback model can genuinely still have
      // headroom even when the primary is rate-limited — worth trying,
      // same as a 5xx overload.
      if (err instanceof ApiError && (err.status >= 500 || err.status === 429)) {
        continue;
      }
      break; // anything else (bad key, bad request) won't be fixed by switching models
    }
  }

  if (lastError !== undefined) {
    if (lastError instanceof ApiError && lastError.status === 429) {
      return {
        error:
          "Today's free outfit-generation quota has been used up across both models — it resets on Google's usual daily cycle, no charge either way. Try again later or tomorrow.",
      };
    }
    if (lastError instanceof ApiError && lastError.status >= 500) {
      return {
        error:
          "Google's outfit-generation models are temporarily overloaded (a known free-tier hiccup, not something wrong on our end) — please try again in a moment.",
      };
    }
    return {
      error:
        lastError instanceof Error ? lastError.message : "Couldn't reach the outfit generator.",
    };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(responseText ?? "[]");
  } catch {
    return { error: "The outfit generator returned something unexpected. Try again." };
  }

  const candidates = validateCandidates(raw, items, existingOutfits);
  if (candidates.length === 0) {
    return {
      error:
        "Couldn't generate any valid new outfit combinations — try adding more items across categories.",
    };
  }

  return { candidates };
}
