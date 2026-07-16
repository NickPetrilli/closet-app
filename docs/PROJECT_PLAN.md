# Project Plan — Armoire (working name)

Personal wardrobe/outfit app, built in deliberate passes. End goal: every
piece and outfit rendered photorealistically *on the user* (from their own
uploaded photos) against AI-generated scene backgrounds that match the
outfit's vibe — inspired by the app **aetsy**.

Companion doc: [wardrobe-app-build-prompts.md](./wardrobe-app-build-prompts.md)
contains the exact build prompts for the remaining passes. Target stack for
those passes: Supabase (Postgres + Auth + Storage), Claude API for garment
identification/dedup, `rembg` for background removal, an image-gen model
(gpt-image or Gemini, TBD after prototyping) for virtual try-on, OpenWeather
for weather.

_Last updated: 2026-07-15_

---

## ✅ Implemented (Pass 1 — UI scaffold, complete)

All UI-only, mock data, client-side state. No backend, auth, or real images.

**Foundation**
- Next.js (App Router) + TypeScript + Tailwind CSS v4, no external UI kit
- Warm editorial design system: taupe/cream palette, hairline borders,
  small-caps letter-spaced labels, Fraunces serif + Instrument Sans, film
  grain overlay (`src/app/globals.css`)
- App name in one constant (`src/lib/config.ts`) — rename in one place

**Data layer** (the API swap seam)
- Types: `ClothingItem`, `Outfit` (with `vibe`), `DailySuggestion`,
  categories (`src/lib/types.ts`)
- 18 mock items across all categories + 6 mock outfits
  (`src/lib/data/mock-items.ts`)
- Async repository — `fetchItems` / `fetchOutfits` / `fetchDailySuggestion`
  (`src/lib/data/wardrobe-repository.ts`). **UI never touches mocks
  directly; Pass 2 swaps this file's internals for Supabase queries.**
- Color utilities: hex mixing, suggestion swatches, color-derived
  `vibeGradient` backdrops (`src/lib/color.ts`)

**Wardrobe view**
- Header with piece count, category filter tabs (active = solid dark),
  responsive 4-col grid, empty states
- Image-only item cards on color-derived vibe backgrounds, hover name chip
- Garment silhouette SVG glyphs as image placeholders
  (`src/components/GarmentGlyph.tsx`)
- Daily suggestion card (static mock): weather + occasion tag + clickable
  outfit thumbnails

**Item detail panel**
- Slide-in overlay from right, dimmed backdrop, Escape/backdrop-click close
- Full-bleed hero: model figure "wearing" the item, editable name chip,
  floating cutout, source-photo thumbnails with active state
- Form: name, category dropdown, primary color (SELECTED + hex), 5
  suggestion swatches (click to apply), "Pick primary color from image"
  stub, secondary color add/remove flow, helper text
- Edits persist in memory (lost on refresh — expected until Pass 2)

**Outfits**
- Outfits tab: outfit cards rendered on the model figure; hover fades the
  scene and explodes the garments so each piece reads individually; pieces
  are clickable through to their item detail
- Outfit detail panel: full look on the model in its scene, editable name,
  vibe + piece-count chip, clickable "In this outfit" piece list that hands
  off to the item panel
- Vibe scene backdrops (`src/components/SceneBackdrop.tsx`): six hand-drawn
  SVG scenes keyed by `OutfitVibe` — office, evening, weekend, summer,
  autumn, street. AI-generated scenes later key off the same value.

---

## 🔜 Still to implement (in order — see build prompts doc)

1. **Complete style revamp using the `ui-ux-pro-max` skill.** Full UI/UX
   pass over the existing scaffold — re-evaluate style direction, palette,
   font pairing, spacing, and interaction polish using the skill's design
   intelligence (styles/palettes/font-pairing/stack guidance) before the
   backend work begins. The component structure stays; the skin and UX
   details get professionally rebuilt.
2. **Prompt 2 — Supabase setup.** Postgres schema (`items`, `outfits`,
   `outfit_items`, `wear_log`, occasion tags), RLS per user, minimal
   email/password auth (no public signup), `item-images` +
   `source-photos` storage buckets, and swap the repository internals from
   mocks to real queries without touching components.
3. **Prompt 3 — Photo upload + garment extraction pipeline.** Add-item
   upload flow (camera + batch), Claude vision for garment identification
   (category/name/color/identifying details), `rembg` background removal to
   transparent cutouts, Claude-judged dedup against existing items, batch
   review screen, graceful skip of unusable photos.
4. **Prompt 4 — Daily outfit suggestions.** OpenWeather integration with
   cached daily weather, occasion tagging (custom tags allowed), Claude
   suggestion calls (weather + occasion + wardrobe, excluding
   recently-worn), wear logging and re-suggest from the suggestion card.
5. **Prompt 5 — AI-rendered outfit try-on.** Base-photo settings, "Render
   on me" via chosen image model (prototype on an isolated test route
   first), render caching keyed by base photo + item set, lookbook/favorites.
6. **Replace placeholder art with real imagery** as passes 3/5 land:
   garment glyphs → real cutouts; model figure → the user's rendered photo;
   SVG scene backdrops → AI-generated scenes keyed by the same vibe values.

**Carry-over TODOs from the scaffold**
- "Pick primary color from image" is a stub (needs Pass 3 images)
- Source-photo thumbnails are visual-only (active state, no real swap)
- In-memory edits don't persist (needs Pass 2)
- Outfits can't be created/edited/deleted in the UI yet (builder needed —
  natural fit alongside Pass 2/4)
- No add-item flow yet (arrives with Pass 3 upload)

---

## 💡 Future enhancements (beyond current scope)

Ideas that build on the planned features — none scheduled, roughly grouped.

**Wardrobe intelligence**
- Wear analytics: most/least worn, cost-per-wear (add purchase price),
  "you haven't worn this in 6 months" nudges
- Declutter/donate suggestions driven by wear-log data
- Gap analysis: Claude reviews the wardrobe and suggests missing versatile
  basics ("you have no light jacket for 50–60° days")
- Closet color-palette analysis: how cohesive is the wardrobe, what colors
  pair with the most pieces

**Outfits & styling**
- Outfit builder with live model preview (drag pieces on/off)
- AI stylist chat: "what should I wear to a rooftop dinner?" answered from
  the actual wardrobe
- Outfit history calendar — what was worn when, searchable by occasion
- Lookbook export / share a rendered outfit as an image
- Seasonal capsules: archive off-season pieces, plan a capsule per season

**Planning & life integration**
- Calendar integration: read tomorrow's events to pre-suggest outfits
- Trip packing lists: date range + destination weather → capsule packing
  list from owned items
- Laundry tracking: mark pieces "in the wash," excluded from suggestions
- Special-occasion planner: assign outfits to future dates

**Platform & polish**
- PWA install + offline read of the wardrobe (native Expo app later, per
  build-prompts notes)
- Dark mode variant of the editorial theme
- Multi-user support (partner/stylist view, shared household wardrobe)
- Resale helper: generate a listing (photos + description) from an item's
  data when retiring it
- Insurance inventory export (item list + photos + estimated values)
