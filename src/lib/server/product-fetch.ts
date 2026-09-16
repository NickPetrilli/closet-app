import type { Category } from "@/lib/types";

// Imported lazily inside fetchProductFromUrl(), not at module scope: this
// package is deliberately excluded from the deployed Vercel bundle (see
// next.config.ts), and a top-level import would throw the moment this
// file loads — breaking the sibling photo-upload action too, since both
// are exported from the same "use server" file.

/**
 * Pulls a garment's name and photo from a retailer's product page.
 *
 * WHY A REAL BROWSER: retailers' bot-detection blocks plain server-side
 * fetches, and targets headless-mode fingerprints specifically. A genuine,
 * visible, non-stealth-patched window loads the page normally (webdriver stays
 * honestly true; nothing is concealed). Image CDNs also tend to require the
 * request to come from the same browsing session as the page, so the photo is
 * downloaded by `fetch()` running INSIDE the loaded page, which carries the
 * right cookies and referer. Both facts mean this only works where a display
 * exists — local development, never the deployed site.
 *
 * WHAT IS GENERIC: every retailer checked publishes schema.org Product data as
 * JSON-LD plus Open Graph tags, so name and image come from those. Measured on
 * 2026-09-15 against Aritzia, Nike and Skims: all three loaded without being
 * blocked and all three yielded a usable name and a real photo.
 *
 * WHAT IS NOT: the category. Aritzia encodes one in its image filenames; Nike
 * publishes none and Skims' breadcrumbs say things like "SKIMS Sale". So the
 * category is BEST-EFFORT — the Add Item form lets it be chosen, and anything
 * guessed here is only a default.
 */

/** Site-specific handling, kept small and additive. */
interface SiteRule {
  matches: (hostname: string) => boolean;
  /** A cleaner or more useful image than the page's default, if one exists. */
  preferredImage?: (rawImage: string) => string;
  /** A category the site's own data makes unambiguous. */
  category?: (rawImage: string, ldCategory: string | null) => Category | null;
}

// Aritzia's product image filenames encode a category code, e.g.
// s26_a01_115849_4425_on_a — verified across the categories this app uses.
const ARITZIA_CATEGORY_CODES: Record<string, Category> = {
  a01: "tops", // tees
  a02: "tops", // shirts
  a03: "tops", // sweaters
  a04: "jackets",
  a05: "jackets", // outerwear
  a06: "bottoms", // pants
  a07: "bottoms", // skirts
  a26: "bottoms", // shorts
  n01: "shoes",
  n02: "accessories", // hats
  n03: "accessories", // scarves
  n04: "accessories", // belts
};

const SITE_RULES: SiteRule[] = [
  {
    matches: (host) => /(^|\.)aritzia\.com$/.test(host),
    // On-model shot -> flat/ghost-mannequin shot of just the garment, which is
    // what the rest of the app's photos look like.
    preferredImage: (raw) => raw.replace(/_on_[a-z]$/, "_off_a"),
    category: (raw) => {
      const code = raw.match(/_(a0[1-7]|a26|n0[1-4])_/);
      return code ? (ARITZIA_CATEGORY_CODES[code[1]] ?? null) : null;
    },
  },
];

/**
 * A last-resort guess from the words in the product's name. Deliberately
 * conservative: a wrong guess silently files a coat under shoes, so anything
 * ambiguous returns null and the form asks instead.
 */
const CATEGORY_KEYWORDS: [RegExp, Category][] = [
  [/\b(sneaker|shoe|boot|loafer|heel|sandal|flat|trainer|clog|mule)s?\b/i, "shoes"],
  [
    /\b(jacket|coat|blazer|parka|puffer|trench|windbreaker|anorak|bomber)s?\b/i,
    "jackets",
  ],
  [
    /\b(jean|trouser|pant|legging|short|skirt|chino|jogger|sweatpant)s?\b/i,
    "bottoms",
  ],
  [
    /\b(tee|t-shirt|shirt|top|tank|cami|blouse|sweater|hoodie|sweatshirt|cardigan|jumper|bodysuit|polo)s?\b/i,
    "tops",
  ],
  [
    /\b(bag|tote|belt|scarf|hat|cap|beanie|sunglasses|necklace|earring|glove|sock)s?\b/i,
    "accessories",
  ],
];

function guessCategoryFromName(name: string): Category | null {
  for (const [pattern, category] of CATEGORY_KEYWORDS) {
    if (pattern.test(name)) return category;
  }
  return null;
}

/**
 * Retailers put variant noise in the JSON-LD name because each size and color
 * is its own Product node: "…Men's Shoes - White/White - Size 6" (Nike),
 * "COTTON RIB TANK | BONE | XXS" (Skims). Open Graph titles are usually the
 * clean product name, so those win; this tidies whatever is left.
 */
function cleanProductName(raw: string): string {
  let name = raw.trim();
  // Trailing size/color segments after a pipe: "NAME | BONE | XXS".
  const parts = name.split("|").map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1) name = parts[0];
  // "… - Size 6", "… - White/White - Size 6".
  name = name.replace(/\s*[-–]\s*size\s+[\w.]+\s*$/i, "");
  // A trailing " | Nike" / " - SKIMS" style site suffix.
  name = name.replace(/\s*[-–|]\s*(nike|skims|aritzia)\s*$/i, "");
  return name.replace(/\s+/g, " ").trim();
}

function findProductNode(node: unknown, results: Record<string, unknown>[]) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const n of node) findProductNode(n, results);
    return;
  }
  const obj = node as Record<string, unknown>;
  const type = obj["@type"];
  if (type === "Product" || (Array.isArray(type) && type.includes("Product"))) {
    results.push(obj);
  }
  if (obj["@graph"]) findProductNode(obj["@graph"], results);
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") findProductNode(value, results);
  }
}

/** The first string that looks like an image URL, whatever shape it arrives in. */
function firstImageUrl(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = firstImageUrl(entry);
      if (found) return found;
    }
    return null;
  }
  if (value && typeof value === "object") {
    const url = (value as Record<string, unknown>).url;
    return typeof url === "string" ? url : null;
  }
  return null;
}

/**
 * Waits until the page actually exposes product metadata, or gives up. Polling
 * beats a fixed sleep in both directions: a fast page is not made slow, and a
 * slow one is not read empty.
 */
async function waitForProductData(
  page: import("puppeteer").Page,
  timeoutMs = 20000
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ready = await page.evaluate(
      () =>
        Boolean(document.querySelector('meta[property="og:title"]')) ||
        document.querySelectorAll('script[type="application/ld+json"]').length > 0
    );
    if (ready) {
      // Metadata has appeared; give the rest of the hydration a beat to finish
      // adding the image tags alongside it.
      await new Promise((resolve) => setTimeout(resolve, 600));
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

/** Anything under this is a placeholder or a spacer, not a garment photo. */
const MIN_PHOTO_BYTES = 10 * 1024;

/**
 * Downloads the product photo two ways, because neither works everywhere.
 *
 * `fetch()` from inside the page carries the session's cookies and referer,
 * which some image CDNs insist on (Aritzia 403s without them). But it is
 * subject to CORS, and a CDN that sends no CORS headers makes it throw
 * (Uniqlo), or hands back a placeholder (lululemon returned 1 KB).
 *
 * Navigating a tab to the image has no CORS rules to obey and still sends the
 * cookies, but loses the referer. So: try the in-page fetch, then navigation,
 * and keep whichever actually produced a real image.
 */
async function downloadPhoto(
  page: import("puppeteer").Page,
  imageUrl: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  let best: { buffer: Buffer; contentType: string } | null = null;

  const inPage = await page.evaluate(async (url: string) => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      return { base64: btoa(binary), type: res.headers.get("content-type") };
    } catch {
      return null;
    }
  }, imageUrl);

  if (inPage) {
    best = {
      buffer: Buffer.from(inPage.base64, "base64"),
      contentType: inPage.type ?? "image/jpeg",
    };
  }

  if (!best || best.buffer.length < MIN_PHOTO_BYTES) {
    // A separate tab: navigating the product page itself to an image would
    // throw away the DOM, and an image that fails to load would leave nothing
    // to fall back to.
    const tab = await page.browser().newPage();
    try {
      const response = await tab.goto(imageUrl, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      const body = response ? Buffer.from(await response.buffer()) : null;
      if (body && (!best || body.length > best.buffer.length)) {
        best = {
          buffer: body,
          contentType: response?.headers()["content-type"] ?? "image/jpeg",
        };
      }
    } catch {
      // Keep whatever the in-page fetch managed, if anything.
    } finally {
      await tab.close();
    }
  }

  if (!best || best.buffer.length < MIN_PHOTO_BYTES) return null;
  return normalizeForPipeline(best.buffer, best.contentType);
}

/**
 * remove.bg accepts JPEG, PNG and WebP. Shops increasingly serve AVIF (Uniqlo
 * does), so anything else is transcoded to JPEG here rather than failing later
 * in the pipeline with a less obvious error.
 */
async function normalizeForPipeline(
  buffer: Buffer,
  contentType: string
): Promise<{ buffer: Buffer; contentType: string }> {
  const type = contentType.split(";")[0].trim().toLowerCase();
  if (type === "image/jpeg" || type === "image/png" || type === "image/webp") {
    return { buffer, contentType: type };
  }
  const { default: sharp } = await import("sharp");
  const jpeg = await sharp(buffer).jpeg({ quality: 92 }).toBuffer();
  return { buffer: jpeg, contentType: "image/jpeg" };
}

export interface FetchedProduct {
  name: string;
  /** Null when the page gives nothing reliable — the form asks in that case. */
  category: Category | null;
  buffer: Buffer;
  contentType: string;
}

export async function fetchProductFromUrl(url: string): Promise<FetchedProduct> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("That doesn't look like a valid URL.");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("That doesn't look like a valid URL.");
  }

  const rule = SITE_RULES.find((r) => r.matches(parsed.hostname));

  const { default: puppeteer } = await import("puppeteer");
  const browser = await puppeteer.launch({
    headless: false,
    args: ["--window-position=2400,2400", "--window-size=1280,900"],
  });

  try {
    const page = await browser.newPage();
    const response = await page.goto(parsed.toString(), {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });

    // Worth checking explicitly: a shop's bot mitigation answers with an error
    // status rather than a challenge page (lululemon starts returning 400 after
    // a few automated visits), and a dead link 404s or 410s. Both would
    // otherwise surface as the vaguer "couldn't read the details" below.
    const status = response?.status() ?? 0;
    if (status >= 400) {
      throw new Error(
        status === 404 || status === 410
          ? "That product page doesn't exist any more — check the link."
          : `That shop turned the request away (HTTP ${status}). It may be rate-limiting automated visits; try again later, or save the photo and use Upload a Photo.`
      );
    }
    // Some shops ship the JSON-LD in the initial HTML; others add it (and even
    // the <title>) from client-side JavaScript. lululemon took ~10s to publish
    // any of it, so wait for the data rather than for a fixed delay.
    await waitForProductData(page);

    const pageTitle = await page.title();
    if (/just a moment|access denied|attention required|are you a robot/i.test(pageTitle)) {
      throw new Error(
        "That shop blocked the request. Save the photo and add it with Upload a Photo instead."
      );
    }

    const meta = await page.evaluate(() => ({
      ogTitle:
        document
          .querySelector('meta[property="og:title"]')
          ?.getAttribute("content") ?? null,
      ogImage:
        document
          .querySelector('meta[property="og:image"]')
          ?.getAttribute("content") ?? null,
    }));

    const scripts = await page.$$eval(
      'script[type="application/ld+json"]',
      (els) => els.map((el) => el.textContent ?? "")
    );
    const products: Record<string, unknown>[] = [];
    for (const script of scripts) {
      try {
        findProductNode(JSON.parse(script), products);
      } catch {
        // not valid JSON — skip
      }
    }

    // Variant nodes carry longer, noisier names than the parent product, so
    // the shortest name is the closest thing to the real one.
    const named = products
      .map((p) => (typeof p.name === "string" ? p.name : null))
      .filter((n): n is string => Boolean(n))
      .sort((a, b) => a.length - b.length);

    const name = cleanProductName(meta.ogTitle ?? named[0] ?? "");
    const rawImage =
      firstImageUrl(products.find((p) => p.image)?.image) ?? meta.ogImage;

    if (!name || !rawImage) {
      throw new Error(
        "Couldn't read that page's product details. Save the photo and add it with Upload a Photo instead."
      );
    }

    const ldCategory = products.find((p) => typeof p.category === "string")
      ?.category as string | undefined;

    const category =
      rule?.category?.(rawImage, ldCategory ?? null) ??
      guessCategoryFromName(name);

    // Shops disagree about which of their image URLs actually serves a full
    // photo: lululemon's JSON-LD one returns a 1 KB placeholder while its
    // og:image is the real thing, and Aritzia's rule-built flat shot beats
    // both. Try them in order of preference and keep the first real one.
    const candidates = [
      rule?.preferredImage?.(rawImage),
      rawImage,
      meta.ogImage,
    ].filter((c): c is string => Boolean(c));

    let photo: { buffer: Buffer; contentType: string } | null = null;
    for (const candidate of [...new Set(candidates)]) {
      photo = await downloadPhoto(page, candidate);
      if (photo) break;
    }
    if (!photo) {
      throw new Error(
        "Couldn't download that shop's product photo. Save it and add it with Upload a Photo instead."
      );
    }

    return { name, category, ...photo };
  } finally {
    await browser.close();
  }
}
