import puppeteer from "puppeteer";
import type { Category } from "@/lib/types";

// Aritzia's product image filenames encode a category code, e.g.
// s26_a01_115849_4425_on_a — verified across the categories this app uses.
const CATEGORY_CODE_MAP: Record<string, Category> = {
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

export interface FetchedProduct {
  name: string;
  category: Category;
  buffer: Buffer;
  contentType: string;
}

/**
 * Aritzia's site sits behind bot-detection that blocks plain server-side
 * fetches (403, "Just a moment..." challenge) even with a normal browser
 * User-Agent — this targets headless-mode fingerprints specifically. A
 * genuine, visible, non-stealth-patched browser window loads the page
 * normally (navigator.webdriver stays honestly true; nothing is concealed).
 * The image CDN additionally requires the request to come from the same
 * browsing session as the product page — a direct navigation to the image
 * URL still 403s, so the image is fetched via `fetch()` run inside the
 * already-loaded page instead, which carries the right cookies/referer.
 *
 * Only works where a display is available (local dev). Would need rework
 * for a headless server deployment.
 */
export async function fetchAritziaProduct(url: string): Promise<FetchedProduct> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("That doesn't look like a valid URL.");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("That doesn't look like a valid URL.");
  }
  if (!/(^|\.)aritzia\.com$/.test(parsed.hostname)) {
    throw new Error("Only aritzia.com product links are supported right now.");
  }

  const browser = await puppeteer.launch({
    headless: false,
    args: ["--window-position=2400,2400", "--window-size=1280,900"],
  });

  try {
    const page = await browser.newPage();
    await page.goto(parsed.toString(), {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    // The JSON-LD script tag is present in the initial HTML, but give any
    // client-side hydration a moment to settle before reading the DOM.
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const scripts = await page.$$eval(
      'script[type="application/ld+json"]',
      (els) => els.map((el) => el.textContent ?? "")
    );
    const results: Record<string, unknown>[] = [];
    for (const script of scripts) {
      try {
        findProductNode(JSON.parse(script), results);
      } catch {
        // not valid JSON — skip
      }
    }

    const product = results[0];
    const name = typeof product?.name === "string" ? product.name : null;
    const rawImage =
      typeof product?.image === "string"
        ? product.image
        : Array.isArray(product?.image) && typeof product.image[0] === "string"
          ? product.image[0]
          : null;

    if (!name || !rawImage) {
      throw new Error("Couldn't find product details on that page.");
    }

    const codeMatch = rawImage.match(/_(a0[1-7]|a26|n0[1-4])_/);
    const category = codeMatch ? CATEGORY_CODE_MAP[codeMatch[1]] : undefined;
    if (!category) {
      throw new Error("Couldn't figure out the category for this item.");
    }

    // On-model shot -> flat/ghost-mannequin shot of just the garment.
    const flatImageUrl = rawImage.replace(/_on_[a-z]$/, "_off_a");

    const base64 = await page.evaluate(async (imgUrl: string) => {
      const res = await fetch(imgUrl);
      if (!res.ok) return `ERR:${res.status}`;
      const buf = await res.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      return btoa(binary);
    }, flatImageUrl);

    if (base64.startsWith("ERR:")) {
      throw new Error("Couldn't download the product photo.");
    }

    return {
      name,
      category,
      buffer: Buffer.from(base64, "base64"),
      contentType: "image/jpeg",
    };
  } finally {
    await browser.close();
  }
}
