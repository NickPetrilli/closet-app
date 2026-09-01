// One-time fixup + cutout generation for the 20 seeded demo items:
//   1. Replace each item's on-model photo with the flat/ghost-mannequin
//      "off_a" shot (pre-fetched through the browser into scratchpad-images/
//      off-batch*.json — Aritzia's CDN blocks direct server-side fetches).
//   2. Recompute primary_color_hex from the flat photo (the on-model shot's
//      average leaned gray from the studio background).
//   3. Run local background removal on the flat photo (via a child process —
//      see remove-bg-worker.mjs; sharp and @imgly/background-removal-node
//      segfault when loaded in the same Node process on this Windows setup).
// Run with:
//   node --env-file=.env scripts/generate-cutouts.mjs
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const WORKER_SCRIPT = join("scripts", "remove-bg-worker.mjs");

// Relative paths only: @imgly/background-removal-node segfaults on Windows
// when given an absolute path or a file:// URL (native image-decode crash),
// but works cleanly with a plain path relative to the current working
// directory — so this script must always be run from the project root.
const MANIFEST_DIR = "scratchpad-images";
const TEMP_DIR = join(MANIFEST_DIR, "cutout-batch-tmp");
mkdirSync(TEMP_DIR, { recursive: true });

const IMAGE_BY_KEY = {};
for (const file of readdirSync(MANIFEST_DIR)) {
  if (!file.startsWith("off-batch") || !file.endsWith(".json")) continue;
  Object.assign(IMAGE_BY_KEY, JSON.parse(readFileSync(join(MANIFEST_DIR, file), "utf8")));
}

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const supabase = createClient(url, serviceKey);

const ITEMS = [
  { key: "tee", name: "All-Time T-Shirt" },
  { key: "hoodie", name: "Cozy Sweatfleece Perfect Hoodie" },
  { key: "sweatshirt", name: "Cozy Sweatfleece Perfect Crew Sweatshirt" },
  { key: "cardigan", name: "Golightly Cardigan - Wonder Yarn" },
  { key: "sweater", name: "Essential Merino Wool View Sweater" },
  { key: "blouse", name: "Landmark Poplin Shirt" },
  { key: "trench", name: "The Finch Trench Coat - City Twill" },
  { key: "blazer", name: "Guild Jacket - Crepette™" },
  { key: "puffer", name: "The Super Puff™ - Hi-Gloss" },
  { key: "straight-jean", name: "Denim Forum The Arlo Hi-Rise Straight Jean" },
  { key: "baggy-jean", name: "Denim Forum The '90s Iggy Lo-Rise Baggy Jean" },
  { key: "trouser", name: "The Effortless Pant™ - Crepette™" },
  { key: "midi-skirt", name: "Twirl Skirt" },
  { key: "denim-short", name: "Denim Forum The '90s Vintage Hi-Rise Mini Denim Short" },
  { key: "belt", name: "Mythos Solid Brass Leather Belt" },
  { key: "scarf", name: "Vitti Silk Triangle Scarf" },
  { key: "cap", name: "New Era New York Yankees 9TWENTY Hat" },
  { key: "sneaker", name: "ASICS Gel-Kayano 14" },
  { key: "loafer", name: "G.H.BASS x Aritzia Spence Loafer - Smooth Leather" },
  { key: "boat-shoe", name: "Sperry x Aritzia AO Boat Shoe - Smooth Leather" },
];

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[™®]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function toHex(n) {
  return n.toString(16).padStart(2, "0");
}

async function averageColorHex(buffer) {
  const { data } = await sharp(buffer)
    .resize(1, 1, { fit: "cover" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const [r, g, b] = data;
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

async function processItem(item) {
  const entry = IMAGE_BY_KEY[item.key];
  if (!entry) throw new Error(`no pre-fetched flat image for "${item.key}"`);
  const flatBuffer = Buffer.from(entry.base64, "base64");
  const contentType = entry.contentType ?? "image/jpeg";
  const slug = slugify(item.name);

  // 1. Look up the existing row by name (already seeded).
  const { data: existing, error: findError } = await supabase
    .from("items")
    .select("id")
    .eq("name", item.name)
    .single();
  if (findError) throw new Error(`lookup ${item.name}: ${findError.message}`);

  // 2. Recompute color from the flat photo.
  const primaryColorHex = await averageColorHex(flatBuffer);

  // 3. Upload the flat photo under a new path (avoids stale-cache collisions
  // with the old on-model file at the original path).
  const flatPath = `${item.key}-${slug}-flat.jpg`;
  const { error: uploadError } = await supabase.storage
    .from("item-images")
    .upload(flatPath, flatBuffer, { contentType, upsert: true });
  if (uploadError) throw new Error(`upload flat ${flatPath}: ${uploadError.message}`);
  const { data: flatPublicUrl } = supabase.storage.from("item-images").getPublicUrl(flatPath);

  // 4. Run local background removal in a child process (see WORKER_SCRIPT
  // comment — can't share a process with sharp on this setup).
  const tempInPath = join(TEMP_DIR, `${item.key}.jpg`);
  const tempOutPath = join(TEMP_DIR, `${item.key}.png`);
  writeFileSync(tempInPath, flatBuffer);
  execFileSync("node", [WORKER_SCRIPT, tempInPath, tempOutPath], { stdio: "inherit" });
  const cutoutBuffer = readFileSync(tempOutPath);

  const cutoutPath = `cutouts/${item.key}-${slug}.png`;
  const { error: cutoutUploadError } = await supabase.storage
    .from("item-images")
    .upload(cutoutPath, cutoutBuffer, { contentType: "image/png", upsert: true });
  if (cutoutUploadError) throw new Error(`upload cutout ${cutoutPath}: ${cutoutUploadError.message}`);
  const { data: cutoutPublicUrl } = supabase.storage.from("item-images").getPublicUrl(cutoutPath);

  // 5. Update the row.
  const { error: updateError } = await supabase
    .from("items")
    .update({
      image_url: flatPublicUrl.publicUrl,
      cutout_image_url: cutoutPublicUrl.publicUrl,
      primary_color_hex: primaryColorHex,
    })
    .eq("id", existing.id);
  if (updateError) throw new Error(`update ${item.name}: ${updateError.message}`);

  console.log(`✓ ${item.name} — ${primaryColorHex}`);
}

async function main() {
  for (const item of ITEMS) {
    await processItem(item);
  }
  console.log(`\nDone — ${ITEMS.length} items updated with flat photos + cutouts.`);
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
