import type { OutfitVibe } from "@/lib/types";

/**
 * Atmospheric scene backdrops for outfits, keyed by vibe. Hand-drawn SVG
 * placeholders in the app's muted palette — later replaced by AI-generated
 * scenes keyed off the same vibe value. Shapes are kept faint so the model
 * figure and garments always read on top.
 */
export function SceneBackdrop({
  vibe,
  className = "",
}: {
  vibe: OutfitVibe;
  className?: string;
}) {
  const scene = SCENES[vibe];
  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 overflow-hidden ${className}`}
      style={{ background: scene.gradient }}
    >
      <svg
        viewBox="0 0 400 300"
        preserveAspectRatio="xMidYMax slice"
        className="h-full w-full"
      >
        {scene.art}
      </svg>
    </div>
  );
}

export function vibeLabel(vibe: OutfitVibe): string {
  return SCENES[vibe].label;
}

/** Scene linework and highlight, from the theme's scene tokens. */
const LINE = "var(--scene-ink)";
const LIGHT = "var(--scene-light)";

const SCENES: Record<
  OutfitVibe,
  { label: string; gradient: string; art: React.ReactNode }
> = {
  /* Soft interior light, window mullions, a long floor line. */
  office: {
    label: "Office",
    gradient:
      "linear-gradient(180deg, var(--scene-office-1) 0%, var(--scene-office-2) 55%, var(--scene-office-3) 100%)",
    art: (
      <g>
        <g stroke={LINE} strokeWidth="1.5" opacity="0.07">
          <path d="M24 0 V236" />
          <path d="M52 0 V236" />
          <path d="M80 0 V236" />
          <path d="M320 0 V236" />
          <path d="M348 0 V236" />
          <path d="M376 0 V236" />
        </g>
        <g stroke={LINE} strokeWidth="1" opacity="0.06">
          <path d="M0 60 H108" />
          <path d="M0 130 H108" />
          <path d="M292 60 H400" />
          <path d="M292 130 H400" />
        </g>
        <path d="M0 240 H400" stroke={LINE} strokeWidth="1.5" opacity="0.14" />
        <path d="M0 252 H400" stroke={LINE} strokeWidth="1" opacity="0.07" />
      </g>
    ),
  },

  /* Dusk sky, moon, skyline silhouette with a few lit windows. */
  evening: {
    label: "Evening",
    gradient:
      "linear-gradient(180deg, var(--scene-evening-1) 0%, var(--scene-evening-2) 55%, var(--scene-evening-3) 100%)",
    art: (
      <g>
        <circle cx="312" cy="56" r="20" fill={LIGHT} opacity="0.75" />
        <g fill={LINE} opacity="0.22">
          <rect x="0" y="196" width="52" height="104" />
          <rect x="52" y="216" width="38" height="84" />
          <rect x="90" y="180" width="30" height="120" />
          <rect x="286" y="206" width="42" height="94" />
          <rect x="328" y="186" width="34" height="114" />
          <rect x="362" y="222" width="38" height="78" />
        </g>
        <g fill="var(--scene-sun)" opacity="0.5">
          <rect x="14" y="212" width="5" height="7" />
          <rect x="32" y="230" width="5" height="7" />
          <rect x="100" y="196" width="5" height="7" />
          <rect x="298" y="222" width="5" height="7" />
          <rect x="340" y="200" width="5" height="7" />
          <rect x="340" y="226" width="5" height="7" />
        </g>
        <path d="M0 300 H400" stroke={LINE} strokeWidth="1" opacity="0.2" />
      </g>
    ),
  },

  /* Morning park — low sun, horizon, soft tree canopies. */
  weekend: {
    label: "Weekend",
    gradient:
      "linear-gradient(180deg, var(--scene-weekend-1) 0%, var(--scene-weekend-2) 55%, var(--scene-weekend-3) 100%)",
    art: (
      <g>
        <circle cx="72" cy="78" r="24" fill={LIGHT} opacity="0.7" />
        <path d="M0 238 H400" stroke={LINE} strokeWidth="1.5" opacity="0.12" />
        <g fill={LINE} opacity="0.08">
          <circle cx="36" cy="206" r="30" />
          <circle cx="66" cy="216" r="20" />
          <circle cx="352" cy="196" r="36" />
          <circle cx="316" cy="214" r="22" />
        </g>
        <g stroke={LINE} strokeWidth="1.5" opacity="0.12">
          <path d="M40 236 V218" />
          <path d="M350 238 V214" />
        </g>
      </g>
    ),
  },

  /* Bright sky, high sun, a band of sea at the horizon. */
  summer: {
    label: "Summer",
    gradient:
      "linear-gradient(180deg, var(--scene-summer-1) 0%, var(--scene-summer-2) 55%, var(--scene-summer-3) 100%)",
    art: (
      <g>
        <circle cx="318" cy="66" r="32" fill="var(--scene-sun)" opacity="0.85" />
        <circle cx="318" cy="66" r="44" fill="var(--scene-sun)" opacity="0.25" />
        <rect x="0" y="224" width="400" height="16" fill="var(--scene-water)" opacity="0.4" />
        <path d="M0 224 H400" stroke={LINE} strokeWidth="1" opacity="0.1" />
        <g stroke={LIGHT} strokeWidth="1.5" opacity="0.6">
          <path d="M24 250 q10 -4 20 0 q10 4 20 0" />
          <path d="M330 258 q10 -4 20 0 q10 4 20 0" />
        </g>
      </g>
    ),
  },

  /* Amber light, a bare branch, leaves drifting down. */
  autumn: {
    label: "Autumn",
    gradient:
      "linear-gradient(180deg, var(--scene-autumn-1) 0%, var(--scene-autumn-2) 55%, var(--scene-autumn-3) 100%)",
    art: (
      <g>
        <g stroke={LINE} strokeWidth="1.5" opacity="0.18" fill="none">
          <path d="M0 34 Q60 44 104 30 Q140 20 158 34" />
          <path d="M64 40 Q74 52 70 64" />
          <path d="M120 28 Q132 38 130 52" />
        </g>
        <g fill="var(--scene-rust)" opacity="0.4">
          <ellipse cx="84" cy="96" rx="6" ry="3.5" transform="rotate(-24 84 96)" />
          <ellipse cx="132" cy="140" rx="6" ry="3.5" transform="rotate(18 132 140)" />
          <ellipse cx="58" cy="182" rx="6" ry="3.5" transform="rotate(-40 58 182)" />
          <ellipse cx="338" cy="120" rx="6" ry="3.5" transform="rotate(30 338 120)" />
        </g>
        <g fill="var(--scene-amber)" opacity="0.45">
          <ellipse cx="310" cy="70" rx="6" ry="3.5" transform="rotate(-15 310 70)" />
          <ellipse cx="366" cy="176" rx="6" ry="3.5" transform="rotate(24 366 176)" />
          <ellipse cx="106" cy="228" rx="6" ry="3.5" transform="rotate(8 106 228)" />
        </g>
        <rect x="0" y="248" width="400" height="52" fill="var(--scene-earth)" opacity="0.16" />
        <path d="M0 248 H400" stroke={LINE} strokeWidth="1" opacity="0.12" />
      </g>
    ),
  },

  /* Market street — striped awning, arched wall, planters. */
  street: {
    label: "Street",
    gradient:
      "linear-gradient(180deg, var(--scene-street-1) 0%, var(--scene-street-2) 55%, var(--scene-street-3) 100%)",
    art: (
      <g>
        <g opacity="0.35">
          <rect x="0" y="0" width="400" height="22" fill={LIGHT} />
          <rect x="0" y="0" width="34" height="22" fill="var(--scene-rust)" opacity="0.4" />
          <rect x="66" y="0" width="34" height="22" fill="var(--scene-rust)" opacity="0.4" />
          <rect x="132" y="0" width="34" height="22" fill="var(--scene-rust)" opacity="0.4" />
          <rect x="198" y="0" width="34" height="22" fill="var(--scene-rust)" opacity="0.4" />
          <rect x="264" y="0" width="34" height="22" fill="var(--scene-rust)" opacity="0.4" />
          <rect x="330" y="0" width="34" height="22" fill="var(--scene-rust)" opacity="0.4" />
        </g>
        <path d="M0 22 H400" stroke={LINE} strokeWidth="1" opacity="0.15" />
        <g stroke={LINE} strokeWidth="1.5" opacity="0.09" fill="none">
          <path d="M30 236 V150 Q56 122 82 150 V236" />
          <path d="M318 236 V150 Q344 122 370 150 V236" />
        </g>
        <g opacity="0.3">
          <circle cx="106" cy="216" r="12" fill="var(--scene-foliage)" />
          <rect x="98" y="224" width="16" height="14" fill="var(--scene-terracotta)" />
          <circle cx="294" cy="216" r="12" fill="var(--scene-foliage)" />
          <rect x="286" y="224" width="16" height="14" fill="var(--scene-terracotta)" />
        </g>
        <path d="M0 240 H400" stroke={LINE} strokeWidth="1.5" opacity="0.13" />
      </g>
    ),
  },
};
