import type { Category } from "@/lib/types";

/**
 * Works out which drawer a fetched product belongs in.
 *
 * Pure and network-free on purpose, so it can be checked against a table of
 * real product names with `scripts/check-category-guess.mjs` rather than by
 * opening shops. product-fetch.ts supplies the raw material.
 *
 * It is allowed — encouraged — to answer null. The Add Item preview shows the
 * guess and lets it be changed, so "not sure" costs one tap, while a confident
 * wrong answer files a coat under shoes and is only noticed later.
 */

/**
 * Garment words per drawer. Matching is whole-word and case-insensitive, and
 * plurals are handled by the trailing `s?`, so only singulars are listed.
 *
 * Deliberately absent: dresses, jumpsuits, rompers and swimwear. The app has
 * five categories and none of them is right for a dress, so guessing one would
 * be worse than asking.
 */
const CATEGORY_WORDS: Record<Category, string[]> = {
  shoes: [
    "shoe", "sneaker", "trainer", "boot", "bootie", "loafer", "heel", "pump",
    "sandal", "slide", "mule", "clog", "espadrille", "moccasin", "oxford",
    "derby", "wedge", "slipper", "flip-flop", "ballet flat", "runner",
  ],
  jackets: [
    "jacket", "coat", "blazer", "parka", "puffer", "trench", "windbreaker",
    "anorak", "bomber", "overcoat", "peacoat", "raincoat", "shacket",
    "overshirt", "gilet", "outerwear",
  ],
  bottoms: [
    "jean", "trouser", "pant", "legging", "short", "skirt", "chino", "jogger",
    "sweatpant", "culotte", "capri", "cargo", "slack", "bermuda", "tight",
    "denim", "bottom",
  ],
  tops: [
    "tee", "t-shirt", "shirt", "top", "tank", "cami", "camisole", "blouse",
    "sweater", "hoodie", "sweatshirt", "cardigan", "jumper", "bodysuit",
    "polo", "turtleneck", "rollneck", "mockneck", "crewneck", "henley",
    "pullover", "knit", "corset", "bustier", "vest", "sweatfleece",
  ],
  accessories: [
    "bag", "tote", "purse", "clutch", "backpack", "belt", "scarf", "hat",
    "cap", "beanie", "sunglasses", "necklace", "earring", "bracelet",
    "glove", "mitten", "sock", "wallet", "headband", "hair clip", "watch",
    "accessory",
  ],
  // Never guessed: "outfits" is a UI grouping, not something a shop sells.
  outfits: [],
};

/** Escapes a word for use in a regex, since a few contain hyphens. */
function wordPattern(word: string): RegExp {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}s?\\b`, "i");
}

const COMPILED: [RegExp, Category][] = (
  Object.entries(CATEGORY_WORDS) as [Category, string[]][]
).flatMap(([category, words]) =>
  words.map((word) => [wordPattern(word), category] as [RegExp, Category])
);

/**
 * The best match within one piece of text, or null.
 *
 * The LAST match wins, because English puts the head noun last: a "denim
 * jacket" is a jacket, a "shirt dress" is not a shirt, and a "sweater vest" is
 * the vest. Scanning for the first match instead would get all three wrong.
 */
function categoryFromText(text: string): Category | null {
  let best: { category: Category; at: number } | null = null;

  for (const [pattern, category] of COMPILED) {
    const match = pattern.exec(text);
    if (!match) continue;
    const at = match.index;
    if (!best || at > best.at) best = { category, at };
  }

  return best?.category ?? null;
}

/**
 * Crumbs that describe the shop rather than the garment. Without this,
 * "Home / Sale / Tops" is as likely to match on the wrong word, and Skims'
 * "SKIMS Sale" would be read as a category at all.
 */
const CRUMB_NOISE =
  /^(home|shop|shop all|all|view all|sale|clearance|new|new arrivals?|best ?sellers?|featured|gifts?|women|womens|women's|men|mens|men's|kids|clothing|all clothing|products?|collections?)$/i;

export interface CategorySignals {
  /** The product's name, as shown to the user. */
  name?: string | null;
  /** schema.org `category`, when a shop publishes one. */
  ldCategory?: string | null;
  /** BreadcrumbList entries, outermost first. */
  breadcrumbs?: string[] | null;
}

/**
 * Reads the signals in order of trustworthiness: a shop's own category field,
 * then its breadcrumb trail, then the product name. The first that yields an
 * answer wins, so a shop that files something as "Sweaters & Cardigans" is
 * believed over a name that happens to contain another garment word.
 */
export function guessCategory(signals: CategorySignals): Category | null {
  const { name, ldCategory, breadcrumbs } = signals;

  if (ldCategory) {
    const fromLd = categoryFromText(ldCategory);
    if (fromLd) return fromLd;
  }

  if (breadcrumbs && breadcrumbs.length > 0) {
    // The last crumb is nearly always the product itself, which the name
    // covers better; the useful crumbs are the section headings above it.
    const sections = breadcrumbs
      .slice(0, -1)
      .map((crumb) => crumb.trim())
      .filter((crumb) => crumb && !CRUMB_NOISE.test(crumb));

    // Innermost first: "Women / Clothing / Sweaters" is most specific at the end.
    for (const crumb of [...sections].reverse()) {
      const fromCrumb = categoryFromText(crumb);
      if (fromCrumb) return fromCrumb;
    }
  }

  if (name) {
    const fromName = categoryFromText(name);
    if (fromName) return fromName;
  }

  return null;
}
