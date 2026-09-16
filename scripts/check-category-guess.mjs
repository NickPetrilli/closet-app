// Checks the category guesser against real product names, shop categories and
// breadcrumb trails. Pure and offline — no browser, no network, no database.
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs \
//     scripts/check-category-guess.mjs
//
// Cases marked expecting null are ones it SHOULD refuse: the preview asks
// instead, which is cheaper than a confident wrong answer.
import { guessCategory } from "@/lib/server/category-guess";

/** [description, signals, expected] */
const CASES = [
  // Real names from shops already tested.
  ["Skims tank", { name: "COTTON RIB TANK" }, "tops"],
  ["Nike shoes", { name: "Nike Air Force 1 '07 Men's Shoes" }, "shoes"],
  ["Gap jeans", { name: "Low Rise Long & Lean Jeans" }, "bottoms"],
  ["Everlane tee", { name: "The Box-Cut Tee in Essential Cotton" }, "tops"],
  ["Aritzia hoodie", { name: "Cozy Sweatfleece Perfect Hoodie" }, "tops"],
  ["lululemon pant", { name: 'lululemon Align™ High-Rise Pant 28"' }, "bottoms"],

  // The case that prompted this: a style name with no garment word, saved by
  // the shop's own breadcrumb trail.
  [
    "J.Crew rollneck (name only)",
    { name: "Eckhaus Latta X J.Crew Ribbed Rollneck™ For Women" },
    "tops",
  ],
  [
    "J.Crew via breadcrumbs",
    {
      name: "Eckhaus Latta X J.Crew Ribbed Rollneck™",
      breadcrumbs: ["Home", "Women", "Clothing", "Sweaters", "Ribbed Rollneck"],
    },
    "tops",
  ],

  // Head-noun beats modifier: the last garment word is the real one.
  ["denim jacket", { name: "The Classic Denim Jacket" }, "jackets"],
  ["sweater vest", { name: "Merino Sweater Vest" }, "tops"],
  ["shirt jacket", { name: "Wool Shirt Jacket" }, "jackets"],
  ["cargo pant", { name: "Utility Cargo Pant" }, "bottoms"],
  ["skirt set", { name: "Poplin Midi Skirt" }, "bottoms"],
  ["puffer coat", { name: "The Super Puff™ Cropped Puffer" }, "jackets"],
  ["tote bag", { name: "Leather Tote Bag" }, "accessories"],
  ["boot", { name: "Chelsea Ankle Boot" }, "shoes"],
  ["trouser short", { name: "Pleated Trouser Short" }, "bottoms"],

  // A shop's own category field is trusted first.
  [
    "ld category wins",
    { name: "The Finch", ldCategory: "outerwear" },
    "jackets",
  ],
  [
    "ld category over misleading name",
    { name: "Boat Shoe Sweater", ldCategory: "sweaters" },
    "tops",
  ],

  // Breadcrumb noise must not be read as a category.
  [
    "Skims-style noisy crumbs",
    {
      name: "COTTON RIB TANK",
      breadcrumbs: ["Home", "SKIMS Sale", "COTTON RIB TANK"],
    },
    "tops",
  ],
  [
    "sale crumbs only, garment in name",
    { name: "Ribbed Beanie", breadcrumbs: ["Home", "Sale", "Ribbed Beanie"] },
    "accessories",
  ],

  // Refusals: the app has no drawer for these, so asking is correct.
  ["dress", { name: "Women's Ultra Stretch AIRism Dress" }, null],
  ["jumpsuit", { name: "The Linen Jumpsuit" }, null],
  ["swimsuit", { name: "Ribbed One-Piece Swimsuit" }, null],
  ["nothing recognizable", { name: "The Wexley" }, null],
  ["empty", {}, null],
];

let passed = 0;
const failures = [];

for (const [label, signals, expected] of CASES) {
  const actual = guessCategory(signals);
  const ok = actual === expected;
  if (ok) passed += 1;
  else failures.push({ label, expected, actual });
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label.padEnd(34)} expected ${String(expected).padEnd(12)} got ${String(actual)}`
  );
}

console.log(`\n${passed} of ${CASES.length} passed.`);
if (failures.length > 0) process.exit(1);
