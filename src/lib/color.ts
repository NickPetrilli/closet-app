/**
 * Small hex-color helpers used to derive mock "image suggestion" swatches.
 * Later, real suggestions will come from color extraction on source photos.
 */

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

/** Mix `hex` toward `toward` by amount t (0..1). */
export function mixHex(hex: string, toward: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(hex);
  const [r2, g2, b2] = hexToRgb(toward);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

/**
 * Derive an atmospheric backdrop gradient from an item's color, so the
 * scene "vibe" follows the garment: creams/whites read summery and bright,
 * browns/olives read autumnal, blues read cool and coastal. Later this is
 * replaced by real AI-rendered scenes; the same color-driven idea applies.
 */
export function vibeGradient(hex: string): string {
  const sky = mixHex(hex, "#FBF6EC", 0.8);
  const mid = mixHex(hex, "#EDE4D2", 0.62);
  const ground = mixHex(hex, "#6E5F4B", 0.4);
  return `linear-gradient(180deg, ${sky} 0%, ${mid} 55%, ${ground} 100%)`;
}

/**
 * Derive a stable row of suggestion swatches from a base color.
 * Stands in for photo-derived palette suggestions.
 */
export function suggestionSwatches(baseHex: string): string[] {
  return [
    mixHex(baseHex, "#FFFFFF", 0.3),
    mixHex(baseHex, "#000000", 0.28),
    mixHex(baseHex, "#E7E2D9", 0.5),
    mixHex(baseHex, "#7A6A55", 0.4),
    mixHex(baseHex, "#3D4A52", 0.38),
  ];
}
