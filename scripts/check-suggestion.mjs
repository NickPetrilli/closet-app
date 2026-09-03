// Phase 3 suggestion check — scores the real saved outfits against synthetic
// weather and occasions, so the ranking can be judged without touching the
// Gemini quota or needing a wear_log row. Run with:
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs --env-file=.env scripts/check-suggestion.mjs
//
// Imports src/lib/server/suggest-outfit-core.ts directly (relative imports and
// type-only imports throughout, so Node's type stripping can load it) — this
// exercises the real scoring code, not a copy.
import { createClient } from "@supabase/supabase-js";
import {
  SAVED_OUTFIT_THRESHOLD,
  bestSavedOutfit,
  savedOutfitRationale,
  scoreOutfit,
} from "@/lib/server/suggest-outfit-core";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY.");
  process.exit(1);
}
const supabase = createClient(url, key);

const { data: itemRows, error: itemError } = await supabase
  .from("items")
  .select("id, name, category, silhouette, primary_color_hex");
if (itemError) {
  console.error(`items: ${itemError.message}`);
  process.exit(1);
}
const items = itemRows.map((r) => ({
  id: r.id,
  name: r.name,
  category: r.category,
  silhouette: r.silhouette ?? undefined,
  primaryColorHex: r.primary_color_hex,
  secondaryColorHex: null,
  imageUrl: "",
  sourcePhotoUrls: [],
}));

const { data: outfitRows, error: outfitError } = await supabase
  .from("outfits")
  .select("id, name, vibe, outfit_items(item_id, position)");
if (outfitError) {
  console.error(`outfits: ${outfitError.message}`);
  process.exit(1);
}
const outfits = outfitRows.map((r) => ({
  id: r.id,
  name: r.name,
  vibe: r.vibe,
  itemIds: [...r.outfit_items]
    .sort((a, b) => a.position - b.position)
    .map((oi) => oi.item_id),
}));

console.log(`${items.length} items, ${outfits.length} saved outfits.\n`);

const weathers = {
  "cold + rainy": {
    tempF: 41, feelsLikeF: 36, hiF: 45, loF: 38, precipProbability: 80,
    windMph: 14, code: 63, condition: "Rain", icon: "rain", isDay: true,
  },
  "warm + dry": {
    tempF: 81, feelsLikeF: 83, hiF: 86, loF: 68, precipProbability: 5,
    windMph: 6, code: 0, condition: "Clear", icon: "sun", isDay: true,
  },
};

function report(weatherLabel, weather, occasion, recentlyWorn = new Set()) {
  const ranked = outfits
    .map((outfit) => ({
      outfit,
      result: scoreOutfit({ outfit, items, weather, occasion, recentlyWorn }),
    }))
    .sort((a, b) => b.result.score - a.result.score);

  console.log(`── ${weatherLabel} · occasion "${occasion}" ──`);
  for (const { outfit, result } of ranked.slice(0, 5)) {
    const flag = result.excluded ? ` [${result.excluded}]` : "";
    console.log(
      `  ${result.score.toFixed(2)}  ${outfit.vibe.padEnd(8)} ${outfit.name}${flag}`
    );
  }

  const best = bestSavedOutfit({ outfits, items, weather, occasion, recentlyWorn });
  if (best) {
    const outfitItems = best.outfit.itemIds
      .map((id) => items.find((i) => i.id === id))
      .filter(Boolean);
    console.log(`  → PICK: "${best.outfit.name}" (${best.score.toFixed(2)})`);
    console.log(`    ${savedOutfitRationale(best.outfit, outfitItems, weather)}`);
  } else {
    console.log(
      `  → no saved outfit clears ${SAVED_OUTFIT_THRESHOLD} — would ask Gemini.`
    );
  }
  console.log();
  return best;
}

report("cold + rainy", weathers["cold + rainy"], "work");
report("warm + dry", weathers["warm + dry"], "gym");
report("warm + dry", weathers["warm + dry"], "date");

// Recently-worn exclusion: take the winning pick and mark its items as worn.
const pick = report("cold + rainy", weathers["cold + rainy"], "casual");
if (pick) {
  console.log("── same day, after logging that pick as worn ──");
  const worn = new Set(pick.outfit.itemIds);
  const after = bestSavedOutfit({
    outfits,
    items,
    weather: weathers["cold + rainy"],
    occasion: "casual",
    recentlyWorn: worn,
  });
  console.log(
    after
      ? `  → now picks "${after.outfit.name}" (${after.score.toFixed(2)})`
      : "  → nothing else clears the threshold; would ask Gemini."
  );
  console.log(
    `  previous pick excluded: ${
      scoreOutfit({
        outfit: pick.outfit,
        items,
        weather: weathers["cold + rainy"],
        occasion: "casual",
        recentlyWorn: worn,
      }).excluded ?? "NO — still eligible"
    }`
  );
}
