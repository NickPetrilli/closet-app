import type { ClothingItem, DailySuggestion, Outfit } from "@/lib/types";

/**
 * Retired now that wardrobe-repository.ts reads from Supabase — no longer
 * imported anywhere. Kept as a reference/demo dataset (e.g. to reseed a
 * fresh dev project) rather than deleted.
 *
 * Sample set: trendy women's pieces (placeholder for Jenna's real
 * uploads). Skirts live under "bottoms" for now — a dedicated
 * "dresses" category/glyph is a natural follow-up. The previous
 * menswear sample set is preserved, commented out, at the bottom.
 */
export const MOCK_ITEMS: ClothingItem[] = [
  // ── Tops ────────────────────────────────────────────────
  {
    id: "top-01",
    name: "Cropped Baby Tee",
    category: "tops",
    silhouette: "tee",
    primaryColorHex: "#F4F1EA",
    secondaryColorHex: null,
    imageUrl: "/placeholders/top-01.png",
    sourcePhotoUrls: ["/placeholders/top-01-src-1.jpg", "/placeholders/top-01-src-2.jpg"],
  },
  {
    id: "top-02",
    name: "Ribbed Tank Top",
    category: "tops",
    silhouette: "tank",
    primaryColorHex: "#A7C7E7",
    secondaryColorHex: null,
    imageUrl: "/placeholders/top-02.png",
    sourcePhotoUrls: ["/placeholders/top-02-src-1.jpg"],
  },
  {
    id: "top-03",
    name: "Oversized Poplin Shirt",
    category: "tops",
    silhouette: "shirt",
    primaryColorHex: "#DCE7F2",
    secondaryColorHex: "#9DB4CE",
    imageUrl: "/placeholders/top-03.png",
    sourcePhotoUrls: ["/placeholders/top-03-src-1.jpg", "/placeholders/top-03-src-2.jpg"],
  },
  {
    id: "top-04",
    name: "Cropped Cable Cardigan",
    category: "tops",
    silhouette: "cardigan",
    primaryColorHex: "#EBC6CE",
    secondaryColorHex: null,
    imageUrl: "/placeholders/top-04.png",
    sourcePhotoUrls: ["/placeholders/top-04-src-1.jpg"],
  },
  {
    id: "top-05",
    name: "Sky Satin Cami",
    category: "tops",
    silhouette: "cami",
    primaryColorHex: "#9FB8D6",
    secondaryColorHex: null,
    imageUrl: "/placeholders/top-05.png",
    sourcePhotoUrls: ["/placeholders/top-05-src-1.jpg", "/placeholders/top-05-src-2.jpg"],
  },
  {
    id: "top-06",
    name: "Black Corset Bustier",
    category: "tops",
    silhouette: "corset",
    primaryColorHex: "#201D22",
    secondaryColorHex: null,
    imageUrl: "/placeholders/top-06.png",
    sourcePhotoUrls: ["/placeholders/top-06-src-1.jpg"],
  },
  {
    id: "top-07",
    name: "Lilac Off-Shoulder Knit",
    category: "tops",
    silhouette: "offshoulder",
    primaryColorHex: "#C7BBDD",
    secondaryColorHex: null,
    imageUrl: "/placeholders/top-07.png",
    sourcePhotoUrls: ["/placeholders/top-07-src-1.jpg", "/placeholders/top-07-src-2.jpg"],
  },

  // ── Jackets ─────────────────────────────────────────────
  {
    id: "jkt-01",
    name: "Cropped Denim Jacket",
    category: "jackets",
    silhouette: "denim-jacket",
    primaryColorHex: "#6E8CAE",
    secondaryColorHex: null,
    imageUrl: "/placeholders/jkt-01.png",
    sourcePhotoUrls: ["/placeholders/jkt-01-src-1.jpg", "/placeholders/jkt-01-src-2.jpg"],
  },
  {
    id: "jkt-02",
    name: "Powder Blue Oversized Blazer",
    category: "jackets",
    silhouette: "blazer",
    primaryColorHex: "#A9BFD8",
    secondaryColorHex: null,
    imageUrl: "/placeholders/jkt-02.png",
    sourcePhotoUrls: ["/placeholders/jkt-02-src-1.jpg"],
  },
  {
    id: "jkt-03",
    name: "Leather Moto Jacket",
    category: "jackets",
    silhouette: "moto",
    primaryColorHex: "#1F1B1D",
    secondaryColorHex: null,
    imageUrl: "/placeholders/jkt-03.png",
    sourcePhotoUrls: ["/placeholders/jkt-03-src-1.jpg", "/placeholders/jkt-03-src-2.jpg"],
  },
  {
    id: "jkt-04",
    name: "Classic Trench Coat",
    category: "jackets",
    silhouette: "trench",
    primaryColorHex: "#D6C6A8",
    secondaryColorHex: "#B39E78",
    imageUrl: "/placeholders/jkt-04.png",
    sourcePhotoUrls: ["/placeholders/jkt-04-src-1.jpg"],
  },
  {
    id: "jkt-05",
    name: "Baby Blue Cropped Puffer",
    category: "jackets",
    silhouette: "puffer",
    primaryColorHex: "#B9D0E6",
    secondaryColorHex: null,
    imageUrl: "/placeholders/jkt-05.png",
    sourcePhotoUrls: ["/placeholders/jkt-05-src-1.jpg", "/placeholders/jkt-05-src-2.jpg"],
  },

  // ── Bottoms ─────────────────────────────────────────────
  {
    id: "btm-01",
    name: "High-Waist Straight Jeans",
    category: "bottoms",
    silhouette: "jeans",
    primaryColorHex: "#8DA6C4",
    secondaryColorHex: null,
    imageUrl: "/placeholders/btm-01.png",
    sourcePhotoUrls: ["/placeholders/btm-01-src-1.jpg"],
  },
  {
    id: "btm-02",
    name: "Wide-Leg Trousers",
    category: "bottoms",
    silhouette: "wide-trousers",
    primaryColorHex: "#E7DEC9",
    secondaryColorHex: null,
    imageUrl: "/placeholders/btm-02.png",
    sourcePhotoUrls: ["/placeholders/btm-02-src-1.jpg", "/placeholders/btm-02-src-2.jpg"],
  },
  {
    id: "btm-03",
    name: "Denim Mini Skirt",
    category: "bottoms",
    silhouette: "mini-skirt",
    primaryColorHex: "#6E8CAE",
    secondaryColorHex: null,
    imageUrl: "/placeholders/btm-03.png",
    sourcePhotoUrls: ["/placeholders/btm-03-src-1.jpg"],
  },
  {
    id: "btm-04",
    name: "Powder Pleated Midi Skirt",
    category: "bottoms",
    silhouette: "midi-skirt",
    primaryColorHex: "#A7C1DE",
    secondaryColorHex: null,
    imageUrl: "/placeholders/btm-04.png",
    sourcePhotoUrls: ["/placeholders/btm-04-src-1.jpg", "/placeholders/btm-04-src-2.jpg"],
  },
  {
    id: "btm-05",
    name: "Faux Leather Leggings",
    category: "bottoms",
    silhouette: "leggings",
    primaryColorHex: "#211E1F",
    secondaryColorHex: null,
    imageUrl: "/placeholders/btm-05.png",
    sourcePhotoUrls: ["/placeholders/btm-05-src-1.jpg"],
  },
  {
    id: "btm-06",
    name: "Blush Tailored Shorts",
    category: "bottoms",
    silhouette: "shorts",
    primaryColorHex: "#E7C4CC",
    secondaryColorHex: null,
    imageUrl: "/placeholders/btm-06.png",
    sourcePhotoUrls: ["/placeholders/btm-06-src-1.jpg", "/placeholders/btm-06-src-2.jpg"],
  },

  // ── Accessories ─────────────────────────────────────────
  {
    id: "acc-01",
    name: "Quilted Shoulder Bag",
    category: "accessories",
    silhouette: "shoulder-bag",
    primaryColorHex: "#E9E0D0",
    secondaryColorHex: "#C8A24B",
    imageUrl: "/placeholders/acc-01.png",
    sourcePhotoUrls: ["/placeholders/acc-01-src-1.jpg"],
  },
  {
    id: "acc-02",
    name: "Gold Hoop Earrings",
    category: "accessories",
    silhouette: "earrings",
    primaryColorHex: "#C9A24B",
    secondaryColorHex: null,
    imageUrl: "/placeholders/acc-02.png",
    sourcePhotoUrls: ["/placeholders/acc-02-src-1.jpg", "/placeholders/acc-02-src-2.jpg"],
  },
  {
    id: "acc-03",
    name: "Navy Baseball Cap",
    category: "accessories",
    silhouette: "cap",
    primaryColorHex: "#2E3A4E",
    secondaryColorHex: null,
    imageUrl: "/placeholders/acc-03.png",
    sourcePhotoUrls: ["/placeholders/acc-03-src-1.jpg"],
  },
  {
    id: "acc-04",
    name: "Canvas Tote Bag",
    category: "accessories",
    silhouette: "tote",
    primaryColorHex: "#D8CBB0",
    secondaryColorHex: "#6E8CAE",
    imageUrl: "/placeholders/acc-04.png",
    sourcePhotoUrls: ["/placeholders/acc-04-src-1.jpg", "/placeholders/acc-04-src-2.jpg"],
  },
  {
    id: "acc-05",
    name: "Layered Gold Necklace",
    category: "accessories",
    silhouette: "necklace",
    primaryColorHex: "#C9A24B",
    secondaryColorHex: null,
    imageUrl: "/placeholders/acc-05.png",
    sourcePhotoUrls: ["/placeholders/acc-05-src-1.jpg"],
  },
  {
    id: "acc-06",
    name: "Cat-Eye Sunglasses",
    category: "accessories",
    silhouette: "sunglasses",
    primaryColorHex: "#6B4A2F",
    secondaryColorHex: "#2A2016",
    imageUrl: "/placeholders/acc-06.png",
    sourcePhotoUrls: ["/placeholders/acc-06-src-1.jpg"],
  },

  // ── Shoes ───────────────────────────────────────────────
  {
    id: "sho-01",
    name: "White Low-Top Sneakers",
    category: "shoes",
    silhouette: "sneaker",
    primaryColorHex: "#F2EFE8",
    secondaryColorHex: "#C9D3DE",
    imageUrl: "/placeholders/sho-01.png",
    sourcePhotoUrls: ["/placeholders/sho-01-src-1.jpg", "/placeholders/sho-01-src-2.jpg"],
  },
  {
    id: "sho-02",
    name: "Chunky Loafers",
    category: "shoes",
    silhouette: "loafer",
    primaryColorHex: "#201D1B",
    secondaryColorHex: null,
    imageUrl: "/placeholders/sho-02.png",
    sourcePhotoUrls: ["/placeholders/sho-02-src-1.jpg"],
  },
  {
    id: "sho-03",
    name: "Tan Knee-High Boots",
    category: "shoes",
    silhouette: "tall-boot",
    primaryColorHex: "#9A6B43",
    secondaryColorHex: null,
    imageUrl: "/placeholders/sho-03.png",
    sourcePhotoUrls: ["/placeholders/sho-03-src-1.jpg", "/placeholders/sho-03-src-2.jpg"],
  },
  {
    id: "sho-04",
    name: "Berry Ankle Boots",
    category: "shoes",
    silhouette: "ankle-boot",
    primaryColorHex: "#6E3B4A",
    secondaryColorHex: null,
    imageUrl: "/placeholders/sho-04.png",
    sourcePhotoUrls: ["/placeholders/sho-04-src-1.jpg"],
  },
  {
    id: "sho-05",
    name: "Powder Ballet Flats",
    category: "shoes",
    silhouette: "flat",
    primaryColorHex: "#B4C8E0",
    secondaryColorHex: null,
    imageUrl: "/placeholders/sho-05.png",
    sourcePhotoUrls: ["/placeholders/sho-05-src-1.jpg", "/placeholders/sho-05-src-2.jpg"],
  },
  {
    id: "sho-06",
    name: "Platform Sandals",
    category: "shoes",
    silhouette: "sandal",
    primaryColorHex: "#C29B70",
    secondaryColorHex: null,
    imageUrl: "/placeholders/sho-06.png",
    sourcePhotoUrls: ["/placeholders/sho-06-src-1.jpg"],
  },
];

export const MOCK_OUTFITS: Outfit[] = [
  {
    id: "out-01",
    name: "Coffee Run",
    vibe: "weekend",
    itemIds: ["top-01", "btm-01", "sho-01", "acc-04"],
  },
  {
    id: "out-02",
    name: "Studio to Street",
    vibe: "office",
    itemIds: ["top-03", "jkt-02", "btm-02", "sho-02"],
  },
  {
    id: "out-03",
    name: "Date Night",
    vibe: "evening",
    itemIds: ["top-05", "jkt-03", "btm-05", "sho-04", "acc-01"],
  },
  {
    id: "out-04",
    name: "Sunday Brunch",
    vibe: "summer",
    itemIds: ["top-07", "btm-04", "sho-05", "acc-02"],
  },
  {
    id: "out-05",
    name: "Autumn Layers",
    vibe: "autumn",
    itemIds: ["top-04", "jkt-04", "btm-01", "sho-03", "acc-05"],
  },
  {
    id: "out-06",
    name: "City Errands",
    vibe: "street",
    itemIds: ["top-02", "jkt-01", "btm-03", "sho-01", "acc-03"],
  },
  {
    id: "out-07",
    name: "Rooftop Evening",
    vibe: "evening",
    itemIds: ["top-06", "btm-06", "sho-04", "acc-06"],
  },
  {
    id: "out-08",
    name: "Weekend Wander",
    vibe: "weekend",
    itemIds: ["jkt-05", "top-01", "btm-02", "sho-06"],
  },
];

export const MOCK_DAILY_SUGGESTION: DailySuggestion = {
  weather: {
    tempF: 72,
    feelsLikeF: 73,
    hiF: 76,
    loF: 61,
    precipProbability: 5,
    windMph: 6,
    code: 0,
    condition: "Clear",
    icon: "sun",
    isDay: true,
  },
  occasion: "Brunch",
  itemIds: ["top-07", "btm-04", "sho-05"],
};

/* ─────────────────────────────────────────────────────────────
 * LEGACY sample set (original menswear scaffold) — kept for
 * reference. Safe to delete once the women's set is finalized.
 * ─────────────────────────────────────────────────────────────
 *
 * MOCK_ITEMS:
 *   top-01 Ivory Oxford Shirt        #EDE6D6
 *   top-02 Black Merino Crewneck     #26231F
 *   top-03 Sage Linen Camp Shirt     #9AA68B
 *   top-04 Striped Breton Tee        #F1ECE1 / #2E3440
 *   top-05 Rust Silk Blouse          #A65833
 *   jkt-01 Camel Wool Overcoat       #B08D57 / #6B5738
 *   jkt-02 Washed Denim Trucker      #6E87A0
 *   jkt-03 Espresso Leather Jacket   #4A342A
 *   btm-01 Raw Selvedge Jeans        #3C4A5C
 *   btm-02 Pleated Wool Trousers     #6E675C
 *   btm-03 Cream Wide-Leg Chinos     #E4DCC8
 *   btm-04 Olive Cargo Pants         #6B6B4F
 *   acc-01 Tobacco Leather Belt      #8A5A33 / #C8A24B
 *   acc-02 Oat Cashmere Scarf        #D9CDB8
 *   acc-03 Waxed Canvas Tote         #CBBFA5 / #4A342A
 *   sho-01 White Leather Sneakers    #F2EFE8 / #B9AE99
 *   sho-02 Chestnut Penny Loafers    #7A4A2B
 *   sho-03 Black Chelsea Boots       #211E1B
 *
 * MOCK_OUTFITS: Weekend Classic, Office Standard, Evening Out,
 *   Summer Stroll, Autumn Layers, Market Run
 *
 * Full original definitions are recoverable from git history
 * (commit before the women's-wardrobe fill).
 * ───────────────────────────────────────────────────────────── */
