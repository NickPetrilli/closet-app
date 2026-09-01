// Recomputes primary_color_hex from each item's cutout (opaque pixels only),
// which is far more accurate than averaging the whole flat photo — that
// average was still diluted by the studio-background padding around the
// garment. Run after generate-cutouts.mjs, from the project root:
//   node --env-file=.env scripts/fix-colors-from-cutouts.mjs
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const supabase = createClient(url, serviceKey);

function toHex(n) {
  return n.toString(16).padStart(2, "0");
}

async function averageOpaqueColorHex(buffer) {
  const { data } = await sharp(buffer)
    .resize(60, 60, { fit: "inside" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let r = 0, g = 0, b = 0, count = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue; // skip transparent background pixels
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    count++;
  }
  if (count === 0) return null;
  return `#${toHex(Math.round(r / count))}${toHex(Math.round(g / count))}${toHex(Math.round(b / count))}`.toUpperCase();
}

async function main() {
  const { data: items, error } = await supabase
    .from("items")
    .select("id, name, cutout_image_url")
    .not("cutout_image_url", "is", null);
  if (error) throw new Error(`fetch items: ${error.message}`);

  for (const item of items) {
    const res = await fetch(item.cutout_image_url);
    const buffer = Buffer.from(await res.arrayBuffer());
    const hex = await averageOpaqueColorHex(buffer);
    if (!hex) {
      console.log(`⚠ ${item.name} — no opaque pixels found, skipped`);
      continue;
    }
    const { error: updateError } = await supabase
      .from("items")
      .update({ primary_color_hex: hex })
      .eq("id", item.id);
    if (updateError) throw new Error(`update ${item.name}: ${updateError.message}`);
    console.log(`✓ ${item.name} — ${hex}`);
  }
  console.log(`\nDone — recomputed colors for ${items.length} items.`);
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
