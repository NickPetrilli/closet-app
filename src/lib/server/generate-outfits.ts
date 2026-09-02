import { GoogleGenAI, Type } from "@google/genai";
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

  const ai = new GoogleGenAI({ apiKey });

  const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [
    { text: buildPrompt(items, existingOutfits, count) },
  ];
  for (const item of items) {
    const url = item.cutoutImageUrl ?? item.imageUrl;
    const image = await fetchAndResize(url);
    parts.push({ text: `ITEM id=${item.id} category=${item.category} name=${item.name}` });
    if (image) parts.push({ inlineData: image });
  }

  let responseText: string | undefined;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: [{ role: "user", parts }],
      config: {
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
      },
    });
    responseText = response.text;
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Couldn't reach the outfit generator.",
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
