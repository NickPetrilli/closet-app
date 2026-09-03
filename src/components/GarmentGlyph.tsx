import type { Category, Silhouette } from "@/lib/types";

/**
 * Minimal garment silhouettes used as image placeholders until real
 * item photos exist. The shape is chosen by the item's `silhouette`
 * (so a tank, cami, blazer, skirt, heel, tote, etc. each look distinct);
 * if none is set it falls back to a generic per-category shape.
 * Every shape is filled with the item's primary color so the card still
 * reads as the right color.
 */
export function GarmentGlyph({
  category,
  silhouette,
  colorHex,
  className = "",
}: {
  category: Category;
  silhouette?: Silhouette;
  colorHex: string;
  className?: string;
}) {
  const shape =
    (silhouette && SILHOUETTES[silhouette]) ?? CATEGORY_FALLBACK[category];

  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      style={
        {
          color: colorHex,
          // Seam strokes below read this. Defined here rather than per-shape so
          // the whole glyph set follows the theme's ink.
          "--seam": "color-mix(in srgb, var(--color-ink) 30%, transparent)",
          stroke: "color-mix(in srgb, var(--color-ink) 18%, transparent)",
        } as React.CSSProperties
      }
      strokeWidth="1"
      aria-hidden="true"
    >
      {shape}
    </svg>
  );
}

/**
 * Subtle seam/detail stroke that reads on light and mid-tone fills. Resolves
 * to the `--seam` custom property set on the root <svg>, so it follows the
 * theme's ink instead of a baked-in warm grey.
 */
const DETAIL = "var(--seam)";

const SILHOUETTES: Record<Silhouette, React.ReactNode> = {
  // ── Tops ────────────────────────────────────────────────
  tee: (
    <g>
      <path
        fill="currentColor"
        d="M35 24 Q43 24 44 26 Q50 33 56 26 Q57 24 65 24 L82 34 L74 44 L74 78 L26 78 L26 44 L18 34 Z"
      />
      <path
        fill="none"
        stroke={DETAIL}
        strokeWidth="1.4"
        d="M44 26 Q50 33 56 26"
      />
    </g>
  ),
  tank: (
    <g>
      <path
        fill="currentColor"
        d="M37 15 L44 15 L46 30 Q50 34 54 30 L56 15 L63 15 L68 78 L32 78 Z"
      />
      <path
        fill="none"
        stroke={DETAIL}
        strokeWidth="1.4"
        d="M46 30 Q50 34 54 30"
      />
    </g>
  ),
  cami: (
    <g>
      <path
        fill="currentColor"
        d="M39 14 L42 14 L50 42 L58 14 L61 14 L59 34 L67 80 L33 80 L41 34 Z"
      />
      <path fill="none" stroke={DETAIL} strokeWidth="1.4" d="M42 14 L50 42 L58 14" />
    </g>
  ),
  shirt: (
    <g>
      <path
        fill="currentColor"
        d="M34 22 L42 20 L50 31 L58 20 L66 22 L82 34 L74 43 L74 80 L26 80 L26 43 L18 34 Z"
      />
      <path
        fill="none"
        stroke={DETAIL}
        strokeWidth="1.4"
        d="M42 21 L50 32 L58 21 M50 32 L50 78"
      />
      <g fill={DETAIL}>
        <circle cx="50" cy="44" r="1.6" />
        <circle cx="50" cy="56" r="1.6" />
        <circle cx="50" cy="68" r="1.6" />
      </g>
    </g>
  ),
  cardigan: (
    <g>
      <path
        fill="currentColor"
        d="M32 22 L43 18 L50 37 L57 18 L68 22 L78 36 L70 45 L70 80 L30 80 L30 45 L22 36 Z"
      />
      <path
        fill="none"
        stroke={DETAIL}
        strokeWidth="1.4"
        d="M50 37 L50 80 M32 71 L68 71 M32 76 L68 76"
      />
      <g fill={DETAIL}>
        <circle cx="50" cy="46" r="1.7" />
        <circle cx="50" cy="55" r="1.7" />
        <circle cx="50" cy="64" r="1.7" />
      </g>
    </g>
  ),
  corset: (
    <g>
      <path
        fill="currentColor"
        d="M30 34 Q39 27 44 34 Q47 39 50 39 Q53 39 56 34 Q61 27 70 34 L65 74 L35 74 Z"
      />
      <path
        fill="none"
        stroke={DETAIL}
        strokeWidth="1.3"
        d="M41 37 L39 72 M50 39 L50 74 M59 37 L61 72"
      />
    </g>
  ),
  offshoulder: (
    <g>
      <path
        fill="currentColor"
        d="M20 42 Q24 34 32 36 Q50 28 68 36 Q76 34 80 42 L74 50 L72 80 L28 80 L26 50 Z"
      />
      <path
        fill="none"
        stroke={DETAIL}
        strokeWidth="1.4"
        d="M32 36 Q50 30 68 36"
      />
    </g>
  ),
  hoodie: (
    <g>
      <path
        fill="currentColor"
        d="M31 24 L42 20 Q50 30 58 20 L69 24 L80 36 L72 45 L72 80 L28 80 L28 45 L20 36 Z"
      />
      <path
        fill="currentColor"
        d="M37 22 Q50 12 63 22 Q58 26 50 26 Q42 26 37 22 Z"
      />
      <path
        fill="none"
        stroke={DETAIL}
        strokeWidth="1.4"
        d="M42 20 Q50 30 58 20"
      />
      <path
        fill="none"
        stroke={DETAIL}
        strokeWidth="1.3"
        d="M36 56 Q50 50 64 56 L64 66 Q50 60 36 66 Z"
      />
    </g>
  ),
  sweatshirt: (
    <g>
      <path
        fill="currentColor"
        d="M33 22 L44 19 Q50 28 56 19 L67 22 L79 35 L71 43 L71 80 L29 80 L29 43 L21 35 Z"
      />
      <path
        fill="none"
        stroke={DETAIL}
        strokeWidth="1.4"
        d="M44 19 Q50 28 56 19 M29 26 L29 43 M71 26 L71 43"
      />
    </g>
  ),
  sweater: (
    <g>
      <path
        fill="currentColor"
        d="M34 23 L44 20 Q50 27 56 20 L66 23 L76 35 L69 42 L69 80 L31 80 L31 42 L24 35 Z"
      />
      <path
        fill="none"
        stroke={DETAIL}
        strokeWidth="1.4"
        d="M44 20 Q50 27 56 20 M31 71 L69 71"
      />
      <g fill={DETAIL}>
        <circle cx="42" cy="48" r="1.3" />
        <circle cx="50" cy="48" r="1.3" />
        <circle cx="58" cy="48" r="1.3" />
        <circle cx="42" cy="58" r="1.3" />
        <circle cx="50" cy="58" r="1.3" />
        <circle cx="58" cy="58" r="1.3" />
      </g>
    </g>
  ),

  // ── Jackets ─────────────────────────────────────────────
  "denim-jacket": (
    <g>
      <path
        fill="currentColor"
        d="M30 20 L43 18 L50 27 L57 18 L70 20 L80 33 L73 41 L73 76 L27 76 L27 41 L20 33 Z"
      />
      <path
        fill="none"
        stroke={DETAIL}
        strokeWidth="1.4"
        d="M43 19 L50 28 L57 19 M50 28 L50 76"
      />
      <g fill="none" stroke={DETAIL} strokeWidth="1.3">
        <rect x="34" y="46" width="10" height="9" rx="1.5" />
        <rect x="56" y="46" width="10" height="9" rx="1.5" />
      </g>
    </g>
  ),
  blazer: (
    <g>
      <path
        fill="currentColor"
        d="M30 20 L45 18 L50 30 L55 18 L70 20 L80 34 L72 43 L72 84 L28 84 L28 43 L20 34 Z"
      />
      <path
        fill="none"
        stroke={DETAIL}
        strokeWidth="1.5"
        d="M45 19 L50 54 L55 19 M50 30 L44 44 M50 30 L56 44"
      />
      <circle fill={DETAIL} cx="50" cy="62" r="1.8" />
    </g>
  ),
  moto: (
    <g>
      <path
        fill="currentColor"
        d="M30 22 L44 18 L50 26 L56 18 L70 22 L79 34 L72 42 L72 78 L28 78 L28 42 L21 34 Z"
      />
      <path
        fill="none"
        stroke={DETAIL}
        strokeWidth="1.6"
        d="M42 30 L58 74 M44 22 L52 26"
      />
    </g>
  ),
  trench: (
    <g>
      <path
        fill="currentColor"
        d="M30 18 L45 15 L50 28 L55 15 L70 18 L80 32 L72 41 L72 90 L28 90 L28 41 L20 32 Z"
      />
      <path
        fill="none"
        stroke={DETAIL}
        strokeWidth="1.5"
        d="M45 16 L50 30 L55 16 M28 56 L72 56"
      />
      <g fill={DETAIL}>
        <circle cx="44" cy="42" r="1.6" />
        <circle cx="56" cy="42" r="1.6" />
        <circle cx="44" cy="50" r="1.6" />
        <circle cx="56" cy="50" r="1.6" />
      </g>
    </g>
  ),
  puffer: (
    <g>
      <path
        fill="currentColor"
        d="M32 28 Q31 19 41 19 L59 19 Q69 19 68 28 L73 38 Q75 43 71 46 L71 72 Q71 78 63 78 L37 78 Q29 78 29 72 L29 46 Q25 43 27 38 Z"
      />
      <path
        fill="none"
        stroke={DETAIL}
        strokeWidth="1.4"
        d="M50 20 L50 78 M31 36 L69 36 M30 50 L70 50 L70 50 M31 64 L69 64"
      />
    </g>
  ),

  // ── Bottoms ─────────────────────────────────────────────
  jeans: (
    <g>
      <path
        fill="currentColor"
        d="M33 16 L67 16 L70 88 L54 88 L50 40 L46 88 L30 88 Z"
      />
      <path
        fill="none"
        stroke={DETAIL}
        strokeWidth="1.4"
        d="M33 24 L67 24 M50 24 L50 40"
      />
    </g>
  ),
  "wide-trousers": (
    <g>
      <path
        fill="currentColor"
        d="M32 16 L68 16 L77 88 L53 88 L50 44 L47 88 L23 88 Z"
      />
      <path
        fill="none"
        stroke={DETAIL}
        strokeWidth="1.4"
        d="M32 23 L68 23 M40 30 L35 86 M60 30 L65 86"
      />
    </g>
  ),
  leggings: (
    <path
      fill="currentColor"
      d="M38 16 L62 16 L59 88 L52 88 L50 46 L48 88 L41 88 Z"
    />
  ),
  shorts: (
    <g>
      <path
        fill="currentColor"
        d="M33 20 L67 20 L69 56 L53 56 L50 38 L47 56 L31 56 Z"
      />
      <path
        fill="none"
        stroke={DETAIL}
        strokeWidth="1.4"
        d="M33 27 L67 27 M50 27 L50 38"
      />
    </g>
  ),
  "mini-skirt": (
    <g>
      <path fill="currentColor" d="M35 24 L65 24 L71 54 L29 54 Z" />
      <path fill="none" stroke={DETAIL} strokeWidth="1.4" d="M35 31 L65 31" />
    </g>
  ),
  "midi-skirt": (
    <g>
      <path fill="currentColor" d="M35 22 L65 22 L75 78 L25 78 Z" />
      <path
        fill="none"
        stroke={DETAIL}
        strokeWidth="1.2"
        d="M35 29 L65 29 M42 30 L38 78 M50 30 L50 78 M58 30 L62 78"
      />
    </g>
  ),

  // ── Accessories ─────────────────────────────────────────
  "shoulder-bag": (
    <g>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        d="M38 40 Q38 20 50 20 Q62 20 62 40"
      />
      <path
        fill="currentColor"
        d="M33 40 Q33 37 36 37 L64 37 Q67 37 67 40 L67 72 Q67 76 63 76 L37 76 Q33 76 33 72 Z"
      />
      <path
        fill="none"
        stroke={DETAIL}
        strokeWidth="1.3"
        d="M33 50 L67 50 M44 44 L38 56 M56 44 L62 56"
      />
    </g>
  ),
  tote: (
    <g>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        d="M40 44 Q40 28 48 28 M60 44 Q60 28 52 28"
      />
      <path fill="currentColor" d="M31 42 L69 42 L65 80 L35 80 Z" />
    </g>
  ),
  earrings: (
    <g>
      <g fill="none" stroke="currentColor" strokeWidth="6">
        <circle cx="37" cy="58" r="15" />
        <circle cx="63" cy="58" r="15" />
      </g>
      <g fill="currentColor">
        <circle cx="37" cy="39" r="3.4" />
        <circle cx="63" cy="39" r="3.4" />
      </g>
    </g>
  ),
  necklace: (
    <g>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        d="M28 30 Q50 76 72 30"
      />
      <circle fill="currentColor" cx="50" cy="62" r="7.5" />
    </g>
  ),
  cap: (
    <g fill="currentColor">
      <path d="M30 60 Q30 34 50 34 Q70 34 70 60 Z" />
      <path d="M66 60 Q85 59 87 67 Q72 67 66 63 Z" />
      <circle cx="50" cy="35" r="2.6" />
    </g>
  ),
  sunglasses: (
    <g>
      <path
        fill="currentColor"
        d="M18 46 Q18 42 24 42 L43 42 Q47 42 46 47 Q45 56 35 57 Q23 58 20 51 Q18 49 18 46 Z"
      />
      <path
        fill="currentColor"
        d="M82 46 Q82 42 76 42 L57 42 Q53 42 54 47 Q55 56 65 57 Q77 58 80 51 Q82 49 82 46 Z"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        d="M46 45 Q50 43 54 45 M18 45 L13 43 M82 45 L87 43"
      />
    </g>
  ),
  belt: (
    <g>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        d="M14 50 Q50 40 86 50"
      />
      <rect
        x="41"
        y="42"
        width="18"
        height="16"
        rx="2.5"
        fill="currentColor"
      />
      <rect
        x="45"
        y="46"
        width="10"
        height="8"
        rx="1.5"
        fill="none"
        stroke={DETAIL}
        strokeWidth="1.4"
      />
    </g>
  ),
  scarf: (
    <g>
      <path
        fill="currentColor"
        d="M20 30 Q50 20 80 30 Q78 40 66 42 Q60 44 62 52 L58 74 L50 74 L52 48 Q52 42 44 40 Q26 38 20 30 Z"
      />
      <path
        fill="none"
        stroke={DETAIL}
        strokeWidth="1.3"
        d="M30 31 Q50 26 70 31"
      />
    </g>
  ),

  // ── Shoes ───────────────────────────────────────────────
  sneaker: (
    <g>
      <path
        fill="currentColor"
        d="M16 60 Q28 57 39 49 Q47 43 57 47 Q68 51 78 56 Q86 60 86 66 L86 69 L16 69 Z"
      />
      <path
        fill="none"
        stroke={DETAIL}
        strokeWidth="1.4"
        d="M16 66 L86 66 M46 52 L52 60 M53 49 L59 58 M60 48 L66 57"
      />
    </g>
  ),
  loafer: (
    <g>
      <path
        fill="currentColor"
        d="M14 71 Q14 63 23 61 Q29 60 34 61 L41 61 Q45 61 48 63 Q55 67 63 62 Q73 56 81 61 Q88 64 88 71 Z"
      />
      <path
        fill="none"
        stroke={DETAIL}
        strokeWidth="1.5"
        strokeLinecap="round"
        d="M15 71 L87 71 M23 61 Q30 58 41 60 M50 61 Q57 58 64 61"
      />
    </g>
  ),
  "tall-boot": (
    <g>
      <path
        fill="currentColor"
        d="M55 14 L40 14 Q34 35 38 55 L38 72 L80 72 Q87 72 86 63 Q85 60 67 58 Q59 57 55 55 Z"
      />
      <path
        fill="none"
        stroke={DETAIL}
        strokeWidth="1.5"
        strokeLinecap="round"
        d="M41 17 L54 17 M38 66 L50 66 M39 72 L80 72"
      />
    </g>
  ),
  "ankle-boot": (
    <g>
      {/* short shaft + foot */}
      <path
        fill="currentColor"
        d="M54 33 L40 33 Q36 44 38 55 L38 72 L80 72 Q86 72 85 64 Q84 61 67 59 Q59 58 54 55 Z"
      />
      {/* low block heel */}
      <path fill="currentColor" d="M39 72 L39 79 L48 79 L48 72 Z" />
      <path
        fill="none"
        stroke={DETAIL}
        strokeWidth="1.5"
        strokeLinecap="round"
        d="M40 36 L54 36 M39 72 L80 72 M38 65 L50 65"
      />
    </g>
  ),
  flat: (
    <g>
      <path
        fill="currentColor"
        d="M14 71 L14 66 Q15 61 23 60 Q28 60 31 62 Q42 69 54 64 Q69 58 81 63 Q88 65 88 71 Z"
      />
      <path
        fill="none"
        stroke={DETAIL}
        strokeWidth="1.6"
        strokeLinecap="round"
        d="M24 61 Q41 70 56 63"
      />
      <g fill="currentColor">
        <path d="M52 59 L58 63 L52 67 Z" />
        <path d="M64 59 L58 63 L64 67 Z" />
        <circle cx="58" cy="63" r="2" />
      </g>
    </g>
  ),
  sandal: (
    <g>
      <path
        fill="currentColor"
        d="M15 70 Q15 66 21 66 L81 66 Q88 66 88 71 L88 76 Q88 78 82 78 L20 78 Q15 78 15 74 Z"
      />
      <path
        fill="none"
        stroke={DETAIL}
        strokeWidth="1.4"
        d="M15 71 L88 71"
      />
      <g fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round">
        <path d="M39 66 Q50 54 62 66" />
        <path d="M25 66 Q24 56 32 53" />
      </g>
    </g>
  ),
};

const CATEGORY_FALLBACK: Record<Category, React.ReactNode> = {
  tops: SILHOUETTES.tee,
  jackets: SILHOUETTES.blazer,
  bottoms: SILHOUETTES.jeans,
  accessories: SILHOUETTES.tote,
  shoes: SILHOUETTES.sneaker,
  outfits: (
    <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <path d="M50 22 Q58 22 58 15 Q58 8 50 8 Q43 8 43 14" />
      <path d="M50 22 L50 32 L88 58 L12 58 Z" strokeLinejoin="round" />
    </g>
  ),
};

/** Faint sketched figure used behind the "rendered on model" placeholder. */
export function ModelFigure({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 200"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="60" cy="22" r="10" />
      <path d="M60 32 V42" />
      <path d="M36 50 Q60 40 84 50" />
      <path d="M36 50 C34 80 36 100 40 118" />
      <path d="M84 50 C86 80 84 100 80 118" />
      <path d="M40 118 Q60 125 80 118" />
      <path d="M48 122 L44 190" />
      <path d="M72 122 L76 190" />
    </svg>
  );
}
