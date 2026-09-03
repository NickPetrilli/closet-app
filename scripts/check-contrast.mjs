#!/usr/bin/env node
/**
 * Verifies the semantic color tokens in src/app/globals.css meet WCAG AA.
 *
 * It parses the real stylesheet rather than keeping its own copy of the
 * values, so it cannot drift from what ships. Run it after touching any
 * palette or semantic token — and once per theme when more themes exist:
 *
 *     node scripts/check-contrast.mjs
 *
 * Exits non-zero if any pairing fails, so it can gate a build if wanted.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(root, "src/app/globals.css"), "utf8");

/** Which theme to check. `--theme=dark` overlays that theme's palette block. */
const themeArg = process.argv.find((a) => a.startsWith("--theme="));
const theme = themeArg ? themeArg.split("=")[1] : null;

/* ---------- parse + resolve custom properties ---------- */

/**
 * Split the stylesheet into top-level blocks so a theme's overrides are not
 * mistaken for the default palette. Without this, adding a second palette
 * would silently mix both themes' values together.
 */
function topLevelBlocks(rawSource) {
  // Strip comments first: a block's selector is the text preceding its "{",
  // which would otherwise include any comment sitting above it.
  const source = rawSource.replace(/\/\*[\s\S]*?\*\//g, "");
  const blocks = [];
  let depth = 0;
  let start = 0;
  let selectorStart = 0;
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") {
      if (depth === 0) {
        // A selector is the text before "{", after any preceding at-rule
        // statement (e.g. `@import "tailwindcss";`) has ended.
        const raw = source.slice(selectorStart, i);
        const selector = raw.slice(raw.lastIndexOf(";") + 1).trim();
        blocks.push({ selector });
        start = i + 1;
      }
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        blocks[blocks.length - 1].body = source.slice(start, i);
        selectorStart = i + 1;
      }
    }
  }
  return blocks.filter((b) => b.body !== undefined);
}

/** Every `--name: value;` in a chunk of CSS, last declaration winning. */
function declarationsIn(source) {
  const out = new Map();
  const re = /(--[\w-]+)\s*:\s*([^;}]+)[;}]/g;
  let m;
  while ((m = re.exec(source)) !== null) out.set(m[1], m[2].trim());
  return out;
}

/**
 * Base tokens come from the bare `:root` and `@theme` blocks. A named theme
 * then overlays only the palette values it redefines — which is the whole
 * claim being tested: a theme should be a palette swap, nothing more.
 */
function readCustomProperties(source, themeName) {
  const blocks = topLevelBlocks(source);
  const out = new Map();
  const isBase = (sel) => sel === ":root" || sel.startsWith("@theme");
  for (const b of blocks) {
    if (isBase(b.selector)) {
      for (const [k, v] of declarationsIn(b.body)) out.set(k, v);
    }
  }
  if (themeName) {
    const sel = `:root[data-theme="${themeName}"]`;
    const themeBlocks = blocks.filter((b) => b.selector === sel);
    if (themeBlocks.length === 0) {
      console.log(`
No block found for ${sel}
`);
      process.exit(1);
    }
    for (const b of themeBlocks) {
      for (const [k, v] of declarationsIn(b.body)) out.set(k, v);
    }
  }
  return out;
}

/** Follow `var(--x)` chains until we reach a literal. */
function resolve(name, props, seen = new Set()) {
  if (seen.has(name)) throw new Error(`circular var reference at ${name}`);
  seen.add(name);
  const raw = props.get(name);
  if (raw === undefined) throw new Error(`undefined token ${name}`);
  const varMatch = raw.match(/^var\(\s*(--[\w-]+)\s*\)$/);
  return varMatch ? resolve(varMatch[1], props, seen) : raw;
}

/* ---------- color math ---------- */

function toRgb(hex) {
  const clean = hex.replace("#", "").trim();
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  if (!/^[0-9a-f]{6}$/i.test(full)) throw new Error(`not a hex color: ${hex}`);
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function relativeLuminance(hex) {
  const channel = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = toRgb(hex).map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/* ---------- what must hold ---------- */

const SURFACES = ["--color-surface", "--color-surface-raised", "--color-surface-sunken"];

/** Normal-size text needs 4.5:1 against every surface it can sit on. */
const TEXT_ON_SURFACES = [
  "--color-ink",
  "--color-ink-secondary",
  "--color-ink-tertiary",
  "--color-accent",
  "--color-accent-strong",
  "--color-error",
  "--color-error-strong",
  "--color-success",
  "--color-warning",
  "--color-blush-strong",
];

/**
 * Borders are non-text. 3:1 is the WCAG threshold for a boundary that carries
 * meaning; the subtler steps only have to be perceptible, which is the whole
 * point of the fix — the previous hairline sat at 1.15:1 and was invisible.
 */
const EDGES = [
  { token: "--color-edge-subtle", min: 1.6 },
  { token: "--color-edge", min: 2.4 },
  { token: "--color-edge-strong", min: 3.0 },
];

/** Foreground/background pairs used together as fills. */
const PAIRS = [
  { fg: "--color-on-accent", bg: "--color-accent", min: 4.5, label: "primary button (rest)" },
  { fg: "--color-on-accent", bg: "--color-accent-strong", min: 4.5, label: "primary button (hover)" },
  { fg: "--color-on-accent", bg: "--color-ink", min: 4.5, label: "ink fill" },
  { fg: "--color-on-accent", bg: "--color-error", min: 4.5, label: "destructive button" },
  { fg: "--color-on-accent", bg: "--color-error-strong", min: 4.5, label: "destructive (hover)" },
];

/**
 * Interaction must never reduce legibility. The bug this encodes: the old
 * primary button was `bg-ink hover:bg-accent`, which dropped 11.63 -> 2.79.
 */
const HOVER_MUST_NOT_DEGRADE = [
  {
    label: "primary button",
    fg: "--color-on-accent",
    rest: "--color-accent",
    hover: "--color-accent-strong",
  },
  {
    label: "destructive button",
    fg: "--color-on-accent",
    rest: "--color-error",
    hover: "--color-error-strong",
  },
];

/* ---------- run ---------- */

const props = readCustomProperties(css, theme);
console.log(`
Theme: ${theme ?? "default (blue, light)"}`);
const hex = (token) => resolve(token, props);
const short = (token) => token.replace("--color-", "");
const fmt = (n) => n.toFixed(2).padStart(6);

let failures = 0;
const fail = (msg) => {
  failures += 1;
  console.log(`  FAIL  ${msg}`);
};

console.log("\nText on surfaces — need 4.5:1\n");
console.log(
  "  " + "token".padEnd(18) + SURFACES.map((s) => short(s).padStart(16)).join("")
);
for (const token of TEXT_ON_SURFACES) {
  const ratios = SURFACES.map((s) => contrast(hex(token), hex(s)));
  const worst = Math.min(...ratios);
  const mark = worst >= 4.5 ? "ok  " : "FAIL";
  console.log(
    "  " + short(token).padEnd(18) + ratios.map((r) => fmt(r).padStart(16)).join("") + "   " + mark
  );
  if (worst < 4.5) {
    failures += 1;
  }
}

console.log("\nEdges on surfaces\n");
for (const { token, min } of EDGES) {
  const ratios = SURFACES.map((s) => contrast(hex(token), hex(s)));
  const worst = Math.min(...ratios);
  console.log(
    "  " +
      short(token).padEnd(18) +
      ratios.map((r) => fmt(r).padStart(16)).join("") +
      `   min ${min}  ` +
      (worst >= min ? "ok" : "FAIL")
  );
  if (worst < min) failures += 1;
}

console.log("\nFill pairs\n");
for (const { fg, bg, min, label } of PAIRS) {
  const r = contrast(hex(fg), hex(bg));
  console.log("  " + label.padEnd(26) + fmt(r) + `   min ${min}  ` + (r >= min ? "ok" : "FAIL"));
  if (r < min) failures += 1;
}

console.log("\nHover must not reduce contrast\n");
for (const { label, fg, rest, hover } of HOVER_MUST_NOT_DEGRADE) {
  const a = contrast(hex(fg), hex(rest));
  const b = contrast(hex(fg), hex(hover));
  const ok = b >= a;
  console.log(
    "  " + label.padEnd(26) + `${fmt(a)} -> ${fmt(b)}   ` + (ok ? "ok" : "FAIL (degrades)")
  );
  if (!ok) fail(`${label}: hover drops contrast from ${a.toFixed(2)} to ${b.toFixed(2)}`);
}

if (failures > 0) {
  console.log(`\n${failures} contrast check(s) failed.\n`);
  process.exit(1);
}
console.log("\nAll contrast checks passed.\n");
