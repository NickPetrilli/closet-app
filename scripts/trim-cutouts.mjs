// Crops each cutout to its opaque bounding box — background removal keeps
// the full source canvas, so garments were floating small in a sea of
// transparent padding (~30% of the frame). Run from the project root:
//   node --env-file=.env scripts/trim-cutouts.mjs
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const supabase = createClient(url, serviceKey);

async function main() {
  const { data: items, error } = await supabase
    .from("items")
    .select("id, name, cutout_image_url")
    .not("cutout_image_url", "is", null);
  if (error) throw new Error(`fetch items: ${error.message}`);

  for (const item of items) {
    const res = await fetch(item.cutout_image_url);
    const buffer = Buffer.from(await res.arrayBuffer());
    const trimmed = await sharp(buffer)
      .trim({ threshold: 10 })
      .toBuffer();

    // Re-upload to the same path (upsert) — same public URL, no DB change needed.
    const path = new URL(item.cutout_image_url).pathname.split("/item-images/")[1];
    const { error: uploadError } = await supabase.storage
      .from("item-images")
      .upload(path, trimmed, { contentType: "image/png", upsert: true });
    if (uploadError) throw new Error(`upload ${path}: ${uploadError.message}`);

    console.log(`✓ ${item.name}`);
  }
  console.log(`\nDone — trimmed ${items.length} cutouts.`);
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
