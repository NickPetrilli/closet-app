import type { ClothingItem, DailySuggestion, Outfit } from "@/lib/types";

/**
 * In-memory mock wardrobe. Replaced by a real database later —
 * nothing outside src/lib/data should import this file directly.
 */
export const MOCK_ITEMS: ClothingItem[] = [
  // ── Tops ────────────────────────────────────────────────
  {
    id: "top-01",
    name: "Ivory Oxford Shirt",
    category: "tops",
    primaryColorHex: "#EDE6D6",
    secondaryColorHex: null,
    imageUrl: "/placeholders/top-01.png",
    sourcePhotoUrls: ["/placeholders/top-01-src-1.jpg", "/placeholders/top-01-src-2.jpg"],
  },
  {
    id: "top-02",
    name: "Black Merino Crewneck",
    category: "tops",
    primaryColorHex: "#26231F",
    secondaryColorHex: null,
    imageUrl: "/placeholders/top-02.png",
    sourcePhotoUrls: ["/placeholders/top-02-src-1.jpg"],
  },
  {
    id: "top-03",
    name: "Sage Linen Camp Shirt",
    category: "tops",
    primaryColorHex: "#9AA68B",
    secondaryColorHex: null,
    imageUrl: "/placeholders/top-03.png",
    sourcePhotoUrls: ["/placeholders/top-03-src-1.jpg", "/placeholders/top-03-src-2.jpg"],
  },
  {
    id: "top-04",
    name: "Striped Breton Tee",
    category: "tops",
    primaryColorHex: "#F1ECE1",
    secondaryColorHex: "#2E3440",
    imageUrl: "/placeholders/top-04.png",
    sourcePhotoUrls: ["/placeholders/top-04-src-1.jpg"],
  },
  {
    id: "top-05",
    name: "Rust Silk Blouse",
    category: "tops",
    primaryColorHex: "#A65833",
    secondaryColorHex: null,
    imageUrl: "/placeholders/top-05.png",
    sourcePhotoUrls: ["/placeholders/top-05-src-1.jpg", "/placeholders/top-05-src-2.jpg"],
  },

  // ── Jackets ─────────────────────────────────────────────
  {
    id: "jkt-01",
    name: "Camel Wool Overcoat",
    category: "jackets",
    primaryColorHex: "#B08D57",
    secondaryColorHex: "#6B5738",
    imageUrl: "/placeholders/jkt-01.png",
    sourcePhotoUrls: ["/placeholders/jkt-01-src-1.jpg", "/placeholders/jkt-01-src-2.jpg"],
  },
  {
    id: "jkt-02",
    name: "Washed Denim Trucker",
    category: "jackets",
    primaryColorHex: "#6E87A0",
    secondaryColorHex: null,
    imageUrl: "/placeholders/jkt-02.png",
    sourcePhotoUrls: ["/placeholders/jkt-02-src-1.jpg"],
  },
  {
    id: "jkt-03",
    name: "Espresso Leather Jacket",
    category: "jackets",
    primaryColorHex: "#4A342A",
    secondaryColorHex: null,
    imageUrl: "/placeholders/jkt-03.png",
    sourcePhotoUrls: ["/placeholders/jkt-03-src-1.jpg", "/placeholders/jkt-03-src-2.jpg"],
  },

  // ── Bottoms ─────────────────────────────────────────────
  {
    id: "btm-01",
    name: "Raw Selvedge Jeans",
    category: "bottoms",
    primaryColorHex: "#3C4A5C",
    secondaryColorHex: null,
    imageUrl: "/placeholders/btm-01.png",
    sourcePhotoUrls: ["/placeholders/btm-01-src-1.jpg"],
  },
  {
    id: "btm-02",
    name: "Pleated Wool Trousers",
    category: "bottoms",
    primaryColorHex: "#6E675C",
    secondaryColorHex: null,
    imageUrl: "/placeholders/btm-02.png",
    sourcePhotoUrls: ["/placeholders/btm-02-src-1.jpg", "/placeholders/btm-02-src-2.jpg"],
  },
  {
    id: "btm-03",
    name: "Cream Wide-Leg Chinos",
    category: "bottoms",
    primaryColorHex: "#E4DCC8",
    secondaryColorHex: null,
    imageUrl: "/placeholders/btm-03.png",
    sourcePhotoUrls: ["/placeholders/btm-03-src-1.jpg"],
  },
  {
    id: "btm-04",
    name: "Olive Cargo Pants",
    category: "bottoms",
    primaryColorHex: "#6B6B4F",
    secondaryColorHex: null,
    imageUrl: "/placeholders/btm-04.png",
    sourcePhotoUrls: ["/placeholders/btm-04-src-1.jpg", "/placeholders/btm-04-src-2.jpg"],
  },

  // ── Accessories ─────────────────────────────────────────
  {
    id: "acc-01",
    name: "Tobacco Leather Belt",
    category: "accessories",
    primaryColorHex: "#8A5A33",
    secondaryColorHex: "#C8A24B",
    imageUrl: "/placeholders/acc-01.png",
    sourcePhotoUrls: ["/placeholders/acc-01-src-1.jpg"],
  },
  {
    id: "acc-02",
    name: "Oat Cashmere Scarf",
    category: "accessories",
    primaryColorHex: "#D9CDB8",
    secondaryColorHex: null,
    imageUrl: "/placeholders/acc-02.png",
    sourcePhotoUrls: ["/placeholders/acc-02-src-1.jpg", "/placeholders/acc-02-src-2.jpg"],
  },
  {
    id: "acc-03",
    name: "Waxed Canvas Tote",
    category: "accessories",
    primaryColorHex: "#CBBFA5",
    secondaryColorHex: "#4A342A",
    imageUrl: "/placeholders/acc-03.png",
    sourcePhotoUrls: ["/placeholders/acc-03-src-1.jpg"],
  },

  // ── Shoes ───────────────────────────────────────────────
  {
    id: "sho-01",
    name: "White Leather Sneakers",
    category: "shoes",
    primaryColorHex: "#F2EFE8",
    secondaryColorHex: "#B9AE99",
    imageUrl: "/placeholders/sho-01.png",
    sourcePhotoUrls: ["/placeholders/sho-01-src-1.jpg", "/placeholders/sho-01-src-2.jpg"],
  },
  {
    id: "sho-02",
    name: "Chestnut Penny Loafers",
    category: "shoes",
    primaryColorHex: "#7A4A2B",
    secondaryColorHex: null,
    imageUrl: "/placeholders/sho-02.png",
    sourcePhotoUrls: ["/placeholders/sho-02-src-1.jpg"],
  },
  {
    id: "sho-03",
    name: "Black Chelsea Boots",
    category: "shoes",
    primaryColorHex: "#211E1B",
    secondaryColorHex: null,
    imageUrl: "/placeholders/sho-03.png",
    sourcePhotoUrls: ["/placeholders/sho-03-src-1.jpg", "/placeholders/sho-03-src-2.jpg"],
  },
];

export const MOCK_OUTFITS: Outfit[] = [
  {
    id: "out-01",
    name: "Weekend Classic",
    itemIds: ["top-04", "btm-01", "sho-01"],
  },
  {
    id: "out-02",
    name: "Office Standard",
    itemIds: ["top-01", "jkt-01", "btm-02", "sho-02"],
  },
  {
    id: "out-03",
    name: "Evening Out",
    itemIds: ["top-02", "jkt-03", "btm-01", "sho-03"],
  },
  {
    id: "out-04",
    name: "Summer Stroll",
    itemIds: ["top-03", "btm-03", "sho-01"],
  },
  {
    id: "out-05",
    name: "Autumn Layers",
    itemIds: ["top-05", "jkt-02", "btm-04", "sho-02", "acc-02"],
  },
  {
    id: "out-06",
    name: "Market Run",
    itemIds: ["top-02", "btm-04", "sho-01", "acc-03"],
  },
];

export const MOCK_DAILY_SUGGESTION: DailySuggestion = {
  weather: { tempF: 72, condition: "Clear" },
  occasion: "Work",
  itemIds: ["top-01", "btm-02", "sho-02"],
};
