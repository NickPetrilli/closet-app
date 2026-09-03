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

export interface Hsl {
  /** Degrees, 0-360. */
  h: number;
  /** 0-1. */
  s: number;
  /** 0-1. */
  l: number;
}

export function hexToHsl(hex: string): Hsl {
  const [r255, g255, b255] = hexToRgb(hex);
  const r = r255 / 255;
  const g = g255 / 255;
  const b = b255 / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) return { h: 0, s: 0, l };

  const s = delta / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = ((g - b) / delta) % 6;
  else if (max === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;

  h *= 60;
  if (h < 0) h += 360;
  return { h, s, l };
}

/** Below this saturation a color reads as a neutral, whatever its hue. */
const NEUTRAL_SATURATION = 0.12;

/**
 * Words a person might type when searching for this color. Returns several
 * per color on purpose — someone looking for a navy trouser is as likely to
 * type "blue" as "navy", and "beige" and "tan" are the same shelf.
 */
export function colorTerms(hex: string): string[] {
  const { h, s, l } = hexToHsl(hex);

  if (s < NEUTRAL_SATURATION) {
    if (l < 0.14) return ["black", "dark"];
    if (l < 0.35) return ["charcoal", "grey", "gray", "dark"];
    if (l < 0.7) return ["grey", "gray"];
    if (l < 0.9) return ["light grey", "grey", "gray", "silver"];
    return ["white", "light"];
  }

  const dark = l < 0.3;
  const light = l > 0.75;
  const muted = s < 0.3;

  if (h < 15 || h >= 345) {
    if (light) return ["pink", "blush", "rose"];
    if (dark) return ["maroon", "burgundy", "red", "dark"];
    return ["red"];
  }
  if (h < 40) {
    // Dark orange is just brown, whatever the saturation says — leather and
    // chocolate knits kept coming back as "orange" without this.
    if (dark || (muted && !light)) return ["brown", "chocolate", "tan"];
    // Barely-saturated and pale is ivory, not peach.
    if (light) {
      return muted
        ? ["cream", "ivory", "beige", "tan"]
        : ["peach", "tan", "beige"];
    }
    return ["rust", "orange", "amber", "brown"];
  }
  if (h < 65) {
    if (muted || light) return ["cream", "beige", "sand", "tan"];
    return ["yellow", "mustard", "gold"];
  }
  if (h < 100) return ["olive", "green", "khaki"];
  if (h < 165) {
    if (dark) return ["forest", "green", "dark"];
    return ["green", "sage"];
  }
  if (h < 195) return ["teal", "aqua", "turquoise", "blue", "green"];
  if (h < 255) {
    if (dark) return ["navy", "blue", "dark"];
    if (light) return ["sky", "light blue", "blue"];
    return ["blue"];
  }
  if (h < 290) return ["purple", "violet", "plum"];
  return ["pink", "magenta", "mauve", "plum"];
}

/**
 * Sort key that walks the spectrum and then the neutrals, so a "by color"
 * sort reads red → orange → … → purple, then white → grey → black rather
 * than scattering the greys through the rainbow.
 */
export function colorSortKey(hex: string): number {
  const { h, s, l } = hexToHsl(hex);
  // Neutrals sort after every hue (1000+), lightest first.
  if (s < NEUTRAL_SATURATION) return 1000 + (1 - l) * 100;
  // Within a hue, lighter shades first so tones group together.
  return h + (1 - l) * 0.5;
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
