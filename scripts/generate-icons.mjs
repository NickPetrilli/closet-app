// Renders the brand "J" mark to the PNG sizes a PWA install needs.
// Run with: node scripts/generate-icons.mjs
//
// The mark itself is the same artwork as src/app/icon.svg — kept here as a
// string rather than read from that file so the three variants (rounded,
// full-bleed, safe-zone-padded) can share one source without the SVG needing
// to carry three sets of transforms.
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const BLUE = "#6C9BD2"; // --color-accent
const BOX = 64; // the mark's own coordinate space

/** The "J": a crossbar and a hooked descender, both rounded strokes. */
const MARK = `
  <path d="M28 16 H48" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round"/>
  <path d="M38 16 V40 Q38 50 27 50 Q18 50 17 41" stroke="#FFFFFF" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
`;

/**
 * @param rounded  rounded-rect background (standalone icon) vs full-bleed
 *                 square (Apple and maskable, where the OS applies its own mask)
 * @param scale    shrinks the mark about the centre — maskable icons must keep
 *                 their content inside a circle 80% of the icon's width, so the
 *                 mark is pulled in well clear of any crop the launcher applies.
 */
function svg({ rounded = true, scale = 1 } = {}) {
  const offset = (BOX * (1 - scale)) / 2;
  return `<svg viewBox="0 0 ${BOX} ${BOX}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${BOX}" height="${BOX}"${rounded ? ' rx="16"' : ""} fill="${BLUE}"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})">${MARK}</g>
</svg>`;
}

const targets = [
  { file: "public/icons/icon-192.png", size: 192, svg: svg() },
  { file: "public/icons/icon-512.png", size: 512, svg: svg() },
  {
    file: "public/icons/icon-maskable-512.png",
    size: 512,
    svg: svg({ rounded: false, scale: 0.72 }),
  },
  // Replaces the old apple-icon, whose transparent corners composited to
  // black on the iOS home screen. iOS rounds it for us, so go full-bleed.
  { file: "src/app/apple-icon.png", size: 180, svg: svg({ rounded: false }) },
];

await mkdir("public/icons", { recursive: true });

for (const target of targets) {
  const png = await sharp(Buffer.from(target.svg))
    .resize(target.size, target.size)
    .png()
    .toBuffer();
  await writeFile(target.file, png);
  console.log(`${target.file}  ${target.size}×${target.size}`);
}
