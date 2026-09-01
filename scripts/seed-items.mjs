// Seeds a mixed demo wardrobe sourced from real Aritzia product photos.
// Placeholder data for testing the real-photo pipeline — not Jenna's actual
// closet. Run with:
//   node --env-file=.env scripts/seed-items.mjs
//
// Uses the service_role key (admin-only, bypasses grants) since this is a
// one-off data-loading script, never something the running app does.
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Aritzia's CDN blocks direct server-side fetches (bot detection), so images
// are pre-fetched through a real browser and dropped here as base64 JSON
// manifests ({ [itemKey]: base64string }) before this script runs.
const IMAGE_MANIFEST_DIR = join(__dirname, "..", "scratchpad-images");
const IMAGE_BY_KEY = {};
for (const file of readdirSync(IMAGE_MANIFEST_DIR)) {
  if (!file.endsWith(".json")) continue;
  Object.assign(IMAGE_BY_KEY, JSON.parse(readFileSync(join(IMAGE_MANIFEST_DIR, file), "utf8")));
}

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const supabase = createClient(url, serviceKey);

const ITEMS = [
  // ── Tops ────────────────────────────────────────────────
  {
    key: "tee",
    name: "All-Time T-Shirt",
    category: "tops",
    silhouette: "tee",
    image: "https://assets.aritzia.com/image/upload/q_auto,f_auto,dpr_auto,w_800/s26_a01_115849_4425_on_a",
    productUrl: "https://www.aritzia.com/us/en/product/all-time-t-shirt/115849.html?color=4425",
  },
  {
    key: "hoodie",
    name: "Cozy Sweatfleece Perfect Hoodie",
    category: "tops",
    silhouette: "hoodie",
    image: "https://assets.aritzia.com/image/upload/q_auto,f_auto,dpr_auto,w_800/f26_a03_116209_37627_on_a",
    productUrl: "https://www.aritzia.com/us/en/product/cozy-sweatfleece-perfect-hoodie/116209.html?color=37627",
  },
  {
    key: "sweatshirt",
    name: "Cozy Sweatfleece Perfect Crew Sweatshirt",
    category: "tops",
    silhouette: "sweatshirt",
    image: "https://assets.aritzia.com/image/upload/q_auto,f_auto,dpr_auto,w_800/f26_a03_116210_34880_on_a",
    productUrl: "https://www.aritzia.com/us/en/product/cozy-sweatfleece-perfect-crew-sweatshirt/116210.html?color=34880",
  },
  {
    key: "cardigan",
    name: "Golightly Cardigan - Wonder Yarn",
    category: "tops",
    silhouette: "cardigan",
    image: "https://assets.aritzia.com/image/upload/q_auto,f_auto,dpr_auto,w_800/f26_a03_114360_37619_on_a",
    productUrl: "https://www.aritzia.com/us/en/product/golightly-cardigan/114360.html?color=37619",
  },
  {
    key: "sweater",
    name: "Essential Merino Wool View Sweater",
    category: "tops",
    silhouette: "sweater",
    image: "https://assets.aritzia.com/image/upload/q_auto,f_auto,dpr_auto,w_800/f26_a03_127610_37623_on_a",
    productUrl: "https://www.aritzia.com/us/en/product/essential-merino-wool-view-sweater/127610.html?color=37623",
  },
  {
    key: "blouse",
    name: "Landmark Poplin Shirt",
    category: "tops",
    silhouette: "shirt",
    image: "https://assets.aritzia.com/image/upload/q_auto,f_auto,dpr_auto,w_800/f26_a02_135713_1275_on_a",
    productUrl: "https://www.aritzia.com/us/en/product/landmark-poplin-shirt/135713.html?color=1275",
  },

  // ── Jackets ─────────────────────────────────────────────
  {
    key: "trench",
    name: "The Finch Trench Coat - City Twill",
    category: "jackets",
    silhouette: "trench",
    image: "https://assets.aritzia.com/image/upload/q_auto,f_auto,dpr_auto,w_800/f26_a05_127628_34050_on_a",
    productUrl: "https://www.aritzia.com/us/en/product/the-finch-trench-coat/127628.html?color=34050",
  },
  {
    key: "blazer",
    name: "Guild Jacket - Crepette™",
    category: "jackets",
    silhouette: "blazer",
    image: "https://assets.aritzia.com/image/upload/q_auto,f_auto,dpr_auto,w_800/f26_a04_134067_11420_on_a",
    productUrl: "https://www.aritzia.com/us/en/product/guild-jacket/134067.html?color=11420",
  },
  {
    key: "puffer",
    name: "The Super Puff™ - Hi-Gloss",
    category: "jackets",
    silhouette: "puffer",
    image: "https://assets.aritzia.com/image/upload/q_auto,f_auto,dpr_auto,w_800/f26_a05_126361_37430_on_a",
    productUrl: "https://www.aritzia.com/us/en/product/the-super-puff%E2%84%A2/126361.html?color=37430",
  },

  // ── Bottoms ─────────────────────────────────────────────
  {
    key: "straight-jean",
    name: "Denim Forum The Arlo Hi-Rise Straight Jean",
    category: "bottoms",
    silhouette: "jeans",
    image: "https://assets.aritzia.com/image/upload/q_auto,f_auto,dpr_auto,w_800/s26_a06_107269_29866_on_a",
    productUrl: "https://www.aritzia.com/us/en/product/the-arlo-hi-rise-straight-jean/107269.html?color=29866",
  },
  {
    key: "baggy-jean",
    name: "Denim Forum The '90s Iggy Lo-Rise Baggy Jean",
    category: "bottoms",
    silhouette: "jeans",
    image: "https://assets.aritzia.com/image/upload/q_auto,f_auto,dpr_auto,w_800/s26_a06_132238_30426_on_a",
    productUrl: "https://www.aritzia.com/us/en/product/the-'90s-iggy-lo-rise-baggy-jean/132238.html?color=30426",
  },
  {
    key: "trouser",
    name: "The Effortless Pant™ - Crepette™",
    category: "bottoms",
    silhouette: "wide-trousers",
    image: "https://assets.aritzia.com/image/upload/q_auto,f_auto,dpr_auto,w_800/f26_a06_77775_30751_on_a",
    productUrl: "https://www.aritzia.com/us/en/product/the-effortless-pant%E2%84%A2/77775.html?color=30751",
  },
  {
    key: "midi-skirt",
    name: "Twirl Skirt",
    category: "bottoms",
    silhouette: "midi-skirt",
    image: "https://assets.aritzia.com/image/upload/q_auto,f_auto,dpr_auto,w_800/f26_a07_130850_37627_on_a",
    productUrl: "https://www.aritzia.com/us/en/product/twirl-skirt/130850.html?color=37627",
  },
  {
    key: "denim-short",
    name: "Denim Forum The '90s Vintage Hi-Rise Mini Denim Short",
    category: "bottoms",
    silhouette: "shorts",
    image: "https://assets.aritzia.com/image/upload/q_auto,f_auto,dpr_auto,w_800/f26_a26_119435_30426_on_a",
    productUrl: "https://www.aritzia.com/us/en/product/the-'90s-vintage-hi-rise-mini-denim-short/119435.html?color=30426",
  },

  // ── Accessories ─────────────────────────────────────────
  {
    key: "belt",
    name: "Mythos Solid Brass Leather Belt",
    category: "accessories",
    silhouette: "belt",
    image: "https://assets.aritzia.com/image/upload/q_auto,f_auto,dpr_auto,w_800/f26_n04_134412_1461_on_a",
    productUrl: "https://www.aritzia.com/us/en/product/mythos-solid-brass-leather-belt/134412.html?color=1461",
  },
  {
    key: "scarf",
    name: "Vitti Silk Triangle Scarf",
    category: "accessories",
    silhouette: "scarf",
    image: "https://assets.aritzia.com/image/upload/q_auto,f_auto,dpr_auto,w_800/f26_n03_130375_31343_on_a",
    productUrl: "https://www.aritzia.com/us/en/product/vitti-silk-triangle-scarf/130375.html?color=31343",
  },
  {
    key: "cap",
    name: "New Era New York Yankees 9TWENTY Hat",
    category: "accessories",
    silhouette: "cap",
    image: "https://assets.aritzia.com/image/upload/q_auto,f_auto,dpr_auto,w_800/s26_n02_123753_33837_on_a",
    productUrl: "https://www.aritzia.com/us/en/product/new-york-yankees-9twenty-hat/114832.html?color=33837",
  },

  // ── Shoes ───────────────────────────────────────────────
  {
    key: "sneaker",
    name: "ASICS Gel-Kayano 14",
    category: "shoes",
    silhouette: "sneaker",
    image: "https://assets.aritzia.com/image/upload/q_auto,f_auto,dpr_auto,w_800/f26_n01_115938_35263_on_a",
    productUrl: "https://www.aritzia.com/us/en/product/gel-kayano-14/115938.html?color=35263",
  },
  {
    key: "loafer",
    name: "G.H.BASS x Aritzia Spence Loafer - Smooth Leather",
    category: "shoes",
    silhouette: "loafer",
    image: "https://assets.aritzia.com/image/upload/q_auto,f_auto,dpr_auto,w_800/s26_n01_131414_1274_on_a",
    productUrl: "https://www.aritzia.com/us/en/product/x-aritzia-spence-loafer/131414.html?color=1274",
  },
  {
    key: "boat-shoe",
    name: "Sperry x Aritzia AO Boat Shoe - Smooth Leather",
    category: "shoes",
    silhouette: "loafer",
    image: "https://assets.aritzia.com/image/upload/q_auto,f_auto,dpr_auto,w_800/f25_n01_126674_1274_on_a",
    productUrl: "https://www.aritzia.com/us/en/product/x-aritzia-ao-boat-shoe/126674.html?color=1274",
  },
];

const OUTFITS = [
  { name: "Coffee Run", vibe: "weekend", itemKeys: ["tee", "straight-jean", "sneaker", "cap"] },
  { name: "Campus Layers", vibe: "autumn", itemKeys: ["sweater", "trench", "straight-jean", "loafer"] },
  { name: "Cozy Day", vibe: "weekend", itemKeys: ["hoodie", "baggy-jean", "sneaker"] },
  { name: "Work Blazer Look", vibe: "office", itemKeys: ["blouse", "blazer", "trouser", "loafer", "belt"] },
  { name: "Weekend Skirt Set", vibe: "summer", itemKeys: ["cardigan", "midi-skirt", "boat-shoe", "scarf"] },
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

function loadImage(key) {
  const entry = IMAGE_BY_KEY[key];
  if (!entry) throw new Error(`no pre-fetched image for key "${key}" in ${IMAGE_MANIFEST_DIR}`);
  const base64 = typeof entry === "string" ? entry : entry.base64;
  const contentType = typeof entry === "string" ? "image/jpeg" : entry.contentType ?? "image/jpeg";
  return { buffer: Buffer.from(base64, "base64"), contentType };
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

function extFromContentType(contentType) {
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("png")) return "png";
  return "jpg";
}

async function seedItem(item) {
  const { buffer, contentType } = loadImage(item.key);
  const primaryColorHex = await averageColorHex(buffer);
  const ext = extFromContentType(contentType);
  const path = `${item.key}-${slugify(item.name)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("item-images")
    .upload(path, buffer, { contentType, upsert: true });
  if (uploadError) throw new Error(`upload ${path}: ${uploadError.message}`);

  const { data: publicUrlData } = supabase.storage
    .from("item-images")
    .getPublicUrl(path);

  const { data: inserted, error: insertError } = await supabase
    .from("items")
    .insert({
      name: item.name,
      category: item.category,
      silhouette: item.silhouette,
      primary_color_hex: primaryColorHex,
      secondary_color_hex: null,
      image_url: publicUrlData.publicUrl,
      source_photo_urls: [],
      product_url: item.productUrl,
    })
    .select("id")
    .single();
  if (insertError) throw new Error(`insert ${item.name}: ${insertError.message}`);

  console.log(`✓ ${item.name} — ${primaryColorHex}`);
  return inserted.id;
}

async function main() {
  const idByKey = {};
  for (const item of ITEMS) {
    idByKey[item.key] = await seedItem(item);
  }

  for (const outfit of OUTFITS) {
    const { data: insertedOutfit, error: outfitError } = await supabase
      .from("outfits")
      .insert({ name: outfit.name, vibe: outfit.vibe })
      .select("id")
      .single();
    if (outfitError) throw new Error(`insert outfit ${outfit.name}: ${outfitError.message}`);

    const rows = outfit.itemKeys.map((key, position) => ({
      outfit_id: insertedOutfit.id,
      item_id: idByKey[key],
      position,
    }));
    const { error: outfitItemsError } = await supabase.from("outfit_items").insert(rows);
    if (outfitItemsError) throw new Error(`insert outfit_items for ${outfit.name}: ${outfitItemsError.message}`);

    console.log(`✓ Outfit: ${outfit.name}`);
  }

  console.log(`\nDone — ${ITEMS.length} items, ${OUTFITS.length} outfits.`);
}

main().catch((err) => {
  console.error("Seeding failed:", err.message);
  process.exit(1);
});
