import type { Category } from "@/lib/types";

/**
 * Minimal garment silhouettes used as image placeholders until real
 * item photos exist. Tinted with the item's primary color.
 */
export function GarmentGlyph({
  category,
  colorHex,
  className = "",
}: {
  category: Category;
  colorHex: string;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      style={{ color: colorHex }}
      stroke="rgba(38, 32, 25, 0.18)"
      strokeWidth="1"
      aria-hidden="true"
    >
      {GLYPHS[category]}
    </svg>
  );
}

const GLYPHS: Record<Category, React.ReactNode> = {
  tops: (
    <path
      fill="currentColor"
      d="M32 20 L43 14 Q50 21 57 14 L68 20 L82 36 L70 45 L70 85 L30 85 L30 45 L18 36 Z"
    />
  ),
  jackets: (
    <g fill="currentColor">
      <path d="M30 16 L44 11 L48 20 L46 88 L28 88 L28 43 L15 35 Z" />
      <path d="M70 16 L56 11 L52 20 L54 88 L72 88 L72 43 L85 35 Z" />
    </g>
  ),
  bottoms: (
    <path
      fill="currentColor"
      d="M34 12 L66 12 L71 88 L56 88 L50 38 L44 88 L29 88 Z"
    />
  ),
  accessories: (
    <g>
      <path
        d="M40 42 Q50 20 60 42"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path fill="currentColor" d="M31 42 L69 42 L75 84 L25 84 Z" />
    </g>
  ),
  shoes: (
    <path
      fill="currentColor"
      d="M17 63 Q30 59 40 49 Q48 41 58 45 Q67 48 75 53 Q85 58 85 67 L85 72 L15 72 L15 67 Q15 64 17 63 Z"
    />
  ),
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
