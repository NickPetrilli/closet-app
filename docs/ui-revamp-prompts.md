# Jenna's Closet — UI Revamp Prompts

A styling-only revamp, split into three sessions that must run **in order**. Written
2026-09-03 from a full audit of the styling layer (findings in the appendix, so a
fresh session doesn't have to rediscover them).

> Companion docs: `docs/enhancements-roadmap-prompts.md` (feature phases 1–8 — read its
> **Shared context** section before any phase here), `docs/PROJECT_PLAN.md` (vision).

**Start from a clean branch off `main`** once branch `enhancements-5b-5c` has merged.
These phases touch nearly every component, so they conflict with anything in flight.

**Status**

| Phase | State |
|---|---|
| A - Design foundation | Done on branch `ui-revamp-phase-a`; awaiting the user's review before merge. |
| Light/dark switch | Done, pulled forward at the user's request (2026-09-03) and included in the same branch. |
| B - Phone-first layout | Not started. |
| C - Large screens | Not started. |
| Deferred backlog | Not started. |

---

## Direction (decided with the user, 2026-09-03)

- **Same DNA, much sharper.** Keep the soft-blue editorial identity — pale-blue ground,
  blush accents, Playfair + Inter, hairline borders. Do **not** invent a new visual
  language. The problem is not the palette, it is that the design has one texture, one
  contrast level, one shape and one label style, so nothing has hierarchy.
- **Phone first.** Jenna's real use is an installed PWA on an iPhone while getting
  dressed. When phone and desktop conflict, the phone wins.
- **Build the token layer to be palette-swappable.** The user wants multiple themes
  later — light/dark plus alternates ("blue mode", "pink mode"). Phase A must make that
  a data change, not a refactor. **Ship only today's light-blue theme in Phase A** — no
  switcher UI, no second palette yet.

**Deferred to a later session — do NOT build these here:**
theme switcher UI · dark mode · alternate palettes · a full motion/transitions pass ·
a redesigned above-the-fold hero moment · promoting the outfit exploded-view into a
touch interaction. Phase A and B set all of these up; they are not in scope.

---

## Phase A — Design foundation

**Goal:** one coherent, swappable design system underneath the app. No layout changes,
no new components. This is the cheapest large visual win available: the app currently
renders its *content* in a leftover warm-beige palette inside cool blue chrome, and its
borders and secondary text are below the contrast threshold where hierarchy is possible.

```
Rebuild the design foundation of Jenna's Closet. Styling only — no feature work, no
layout restructuring, no new components. (Read the "Shared context" section of
docs/enhancements-roadmap-prompts.md first, and the appendix of
docs/ui-revamp-prompts.md for the audit findings behind each item below.)

The visual identity stays: soft-blue editorial, Playfair + Inter, hairline borders,
blush accents. Do not introduce a new visual language. The goal is that the same
identity finally has hierarchy, depth and consistency.

1. TOKEN ARCHITECTURE — built for future theme swapping
   - Restructure src/app/globals.css into two layers:
     (a) a PALETTE layer: the raw ramp for one named theme, e.g.
         --palette-blue-50 ... --palette-blue-900, plus blush and a neutral ramp.
     (b) a SEMANTIC layer that is all any component ever references:
         surface / surface-raised / surface-sunken, text / text-secondary /
         text-tertiary, border-subtle / border / border-strong, accent /
         accent-contrast, and STATE colors: success, warning, error, info.
     Semantic tokens map to palette values. Expose the semantic layer through Tailwind
     v4 `@theme` so existing utility names keep working where sensible.
   - Rule to enforce and state in a comment: components use semantic tokens only. A
     later theme is then a new palette layer + a remapping, with zero component edits.
   - Keep the current token names working (--color-ground, -cream, -card, -ink, -accent,
     -blush ...) as aliases onto the semantic layer if that avoids a churny rename — but
     the semantic names are the ones new code uses. Pick one approach and be consistent.
   - Do NOT add a second theme, a dark palette, or any switcher. One theme, structured
     so more are trivial.

2. MIGRATE THE WARM-BEIGE LAYER (the biggest single visual problem)
   The theme tokens are blue but a whole derived/art layer is still the app's previous
   warm palette, so every item tile and outfit card sits on a muddy tan gradient inside
   a cool blue app. Everything below must derive from tokens — no hardcoded hexes:
   - src/lib/color.ts `vibeGradient()` mixes toward #FBF6EC / #EDE4D2 / #6E5F4B
     (cream -> BROWN). Re-derive it from the cool surface + a cool shadow tone so a
     garment's color reads against the app instead of being greyed by it.
   - src/lib/color.ts `suggestionSwatches()` mixes toward #E7E2D9 / #7A6A55.
   - src/components/SceneBackdrop.tsx — 37 hardcoded hexes; INK = #262019,
     CREAM = #F4F1EA, and all six vibe gradients are tan/khaki. Re-tone all six vibes
     (office/evening/weekend/summer/autumn/street) into the blue-forward palette while
     keeping each vibe distinguishable from the others. They must stay faint enough
     that garments read on top.
   - src/components/ItemDetailPanel.tsx source-photo thumbnails mix toward
     #8D8478 / #57503F.
   - src/components/GarmentGlyph.tsx outline is rgba(38, 32, 25, 0.18) — a warm
     brown-black. Use a cool ink at the same weight.
   - Leave item color DATA alone (src/lib/data/mock-items.ts holds real garment colors).
   - Afterwards, a grep for 6-digit hex literals across src/components and
     src/lib/color.ts should return essentially nothing that is a *styling* color.

3. FIX CONTRAST AND SEMANTIC COLOR (measured failures, not taste)
   Current ratios against --color-ground #eaf1f8: ink 10.58 PASS - ink-soft 5.45 PASS -
   muted 3.93 FAIL - accent 2.54 FAIL - blush-deep 1.79 FAIL - line-dark 1.45 - line 1.15.
   - Every text token must reach WCAG AA on every surface it is used on: 4.5:1 for
     normal text, 3:1 for >=18.66px bold / >=24px. `muted` and `accent`-as-text both
     fail today and both carry real copy. Darken them (keep the hue) until they pass.
     Verify with a script, don't eyeball it.
   - --color-line at 1.15:1 is invisible — the cards have no perceptible edge and read
     as pale blobs. Give border-subtle / border / border-strong three genuinely
     distinguishable steps, the middle one visible on every surface.
   - ERROR STATES ARE A BUG: every error message renders in `text-blush-deep`
     at 1.79:1 — effectively invisible. Route them all to the new semantic `error`
     token (--color-danger #c73e3e already exists and passes). Fix in:
     DailySuggestionCard.tsx:226, OccasionPicker.tsx:96, AddItemButton.tsx:236,
     OutfitFormModal.tsx:337, GenerateOutfitsButton.tsx:286.
   - PRIMARY BUTTON HOVER IS BACKWARDS: `bg-ink hover:bg-accent` with `text-cream`
     goes 11.63:1 -> 2.79:1, so hovering the main CTA makes its label harder to read.
     Every primary button does this (Add Item, Wore this, Generate, Save Outfit, Find
     my location). Redesign the primary hover so contrast is maintained or improved.
   - You have a 10.58:1 ink and spend it on the <h1> and two pills. Use the full ramp:
     secondary text should be clearly secondary, not merely faint.

4. ADD THE MISSING SCALES
   - RADIUS: today it is 43 `rounded-full`, 9 `rounded-2xl`, 6 `rounded-xl`, 1
     `rounded-lg` — and ItemCard is rounded-2xl while OutfitCard has NO radius, the two
     grid empty states disagree, and both detail panels are entirely square while every
     modal is rounded-2xl. Define a radius scale (roughly: control / card / sheet /
     pill), assign each component class to one step, and apply it everywhere so the
     square "older pass" surfaces (both detail panels, OutfitCard, OutfitGrid empty
     state) join the system.
   - ELEVATION: there are 5 one-off arbitrary shadows plus shadow-sm/md/xl and no scale.
     Define 3-4 elevation tokens (resting card, hover, floating panel, modal) as tokens
     and replace every ad-hoc shadow with one.
   - MOTION: durations are only 200/300/500 with default easing and no shared token.
     Define duration + easing tokens (a fast, a base, a slow, and one standard easing
     curve) and route existing transitions through them. Do NOT add new animations,
     stagger or choreography — that is a later phase. Just make the vocabulary exist.
   - TYPOGRAPHY: `.eyebrow` (10px / 0.22em / uppercase) is doing nearly all labelling —
     60+ uses, including things that are not labels (the weather line, button text,
     result counts, item names, occasion tags). The scale is 10/12/14/18-20/36-60px:
     a hole in the middle and no rhythm. Define a proper type scale, and split
     `.eyebrow`'s jobs into distinct roles (true small-caps label vs. button label vs.
     metadata vs. body-small) so all-caps stops being the default. Playfair currently
     appears in only 4 places — give it at least one more deliberate role in the scale.

5. HIERARCHY SWEEP (no layout changes)
   Category tabs, occasion chips, the search field, the sort select, primary CTAs and
   secondary CTAs are all the same pill at the same weight, so nothing signals "this is
   the main action". Using only the new scales, establish three clear button/control
   tiers (primary / secondary / tertiary-quiet) and reassign every existing control to
   one. Positions and copy stay exactly as they are.

6. SWAPPABILITY PROOF (throwaway, not shipped)
   - The only way to know the token architecture is actually swappable is to swap it.
     Add ONE rough alternate palette layer (a dark set is the most useful stress test,
     since it inverts surface/text relationships) behind a dev-only switch — a
     `data-theme` attribute set by hand, or an env-gated class on <html>. No switcher UI,
     no persistence, not linked from anywhere in the app, and not part of the shipped
     experience.
   - Its job is to surface every place a component still hardcodes an appearance
     assumption. Fix what it exposes, then leave the alternate palette in place as a
     fixture for the later theming session.
   - Run the contrast script against it too. It is allowed to fail on polish, not on
     structure — the point is proving that changing a palette requires zero component
     edits.

7. ACCESSIBILITY BASELINE
   - There is NO focus ring anywhere: `focus:outline-none` in 7 components, and the only
     `focus-visible` in the codebase is a border change on OutfitCard. Add a single
     visible `focus-visible` treatment as a token/utility and apply it to every
     interactive element — buttons, links, inputs, selects, cards, chips, close buttons.
   - Respect the existing prefers-reduced-motion block; extend it to anything new.
   - Keep the existing sr-only live region in WardrobeControls working.
   - The film grain (body::after, opacity 0.035, z-index 90) is invisible in practice
     and stacks a fixed layer above content. Either make it actually contribute or
     remove it — do not leave it as a no-op that traps stacking context.

DO NOT
- Do not change any layout, grid, breakpoint, spacing rhythm or component structure.
  That is Phase B and C. If a fix seems to require a layout change, note it and move on.
- Do not add dark mode, a second palette, or a theme switcher.
- Do not add new animations, a hero section, or new components.
- Do not touch server actions, the data seam, Supabase, or any feature logic.
- Do not rename files or move components.

VERIFY
- A standalone script that computes WCAG ratios for every semantic text token against
  every surface token it is used on, and prints PASS/FAIL. All must pass. Commit it
  under scripts/ so later theme work can re-run it per theme.
- Grep for 6-digit hex literals in src/components and src/lib/color.ts — no styling
  colors left.
- Browser at 390px and 1440px: side-by-side before/after screenshots of the wardrobe
  grid, the daily suggestion card, the Outfits tab, both detail panels, and the Add
  Item and Generate modals. Cards must now have a visible edge; secondary text must
  read as secondary rather than faint; an error state must be legible (trigger one).
- Keyboard-tab the whole page and confirm a visible focus ring on every stop.
- Flip to the proof palette and screenshot the same surfaces. Anything that stays the
  old color is a component still hardcoding appearance — fix it, then flip back.
- tsc clean, `next build` succeeds. Small logical commits; don't push unless asked.
```

---

## Phase B — Phone-first layout

**Goal:** make the iPhone/installed-PWA experience the designed product rather than a
squeezed desktop. Today the phone opens on a weather widget with **zero wardrobe items
above the fold**, there is no persistent navigation, and item names are hover-only —
meaning on her phone she can never see what anything is called.

```
Redesign Jenna's Closet mobile-first. Layout and responsive work only — the design
system from Phase A is already in place and is the vocabulary you use. (Read the
"Shared context" section of docs/enhancements-roadmap-prompts.md, and Phase A plus
the appendix of docs/ui-revamp-prompts.md.)

Target device: iPhone at 390x844, running as an installed standalone PWA (safe-area
insets already handled in globals.css). The phone is the priority; desktop must not
regress but is Phase C's job.

Current breakpoint usage across the whole app is 73 `sm:`, 3 `lg:`, and zero `md:`,
`xl:` or `2xl:` — so most of this is genuinely undesigned.

1. FIX THE INFORMATION ORDER ABOVE THE FOLD
   - Measured at 390px: `main` has `pt-12` (48px) and the daily suggestion card fills
     the rest of the first screen, so the wardrobe is entirely below the fold. An app
     about her clothes opens on a weather widget.
   - Restructure so that on a phone the first screen shows her actual wardrobe, with
     today's suggestion present but compact — a condensed summary that expands, a
     smaller card, or a repositioning. Decide and justify one approach; the suggestion
     must stay reachable in one tap and keep every current action (Show another, Wore
     this, occasion select, tapping a thumbnail).
   - Tighten the phone spacing rhythm generally (the desktop pt-12 / px-6 / mt-8 / mt-10
     cadence is too airy for a 390px screen).

2. PERSISTENT NAVIGATION
   - There is no sticky header or tab bar, so changing category means scrolling back to
     the very top — and in a standalone PWA that is the app's entire navigation.
   - Add persistent chrome on phones: a sticky/condensing header and/or a bottom tab
     bar for the category filter. Must respect env(safe-area-inset-bottom), must not
     cover the last grid row, and must feel native rather than like a web page.
   - The category strip currently holds 7 filters and scrolls horizontally
     (CategoryTabs.tsx auto-scrolls the active tab into view — keep that behaviour).

3. MAKE THE CARDS WORK ON TOUCH
   - CRITICAL: item and outfit names are `opacity-0 group-hover:opacity-100`
     (ItemCard.tsx:42, OutfitCard.tsx:90). Touchscreens have no hover, so names are
     unreachable on her phone. Names must be visible without hover on touch devices —
     and legible over arbitrary garment photos.
   - OutfitCard's exploded-view-on-hover (OutfitCard.tsx:104, SLOT_CLASSES) is the best
     interaction in the app and is desktop-only. For now just make sure the outfit card
     is legible and tappable on a phone in its resting state; do NOT build a touch
     version of the exploded view — that is deferred to a later session.
   - Reconsider the phone grid: `grid-cols-2` at 390px with `gap-5`. Check whether two
     columns is right for scanning a wardrobe on a phone, and whether the aspect ratios
     (square items, 3/4 outfits) are earning their space.

4. TOUCH TARGETS
   - Occasion pills are `px-3.5 py-1.5` with 10px text, about 26px tall, against
     Apple's 44px minimum. Same problem on the "Set location" button, the suggestion
     thumbnails (56px, borderline), the search clear button (20px), and the modal
     close buttons.
   - Bring every interactive element on phone to a >=44px touch target — using padding
     or a hit-area expansion, without visually inflating the design.
   - At 390px the 7 occasion pills wrap to three rows. Fix that (scroll strip,
     truncation, or a different control) so the card stays compact.

5. SHEETS INSTEAD OF DIALOGS ON PHONE
   - The two detail panels are `max-w-2xl` right-side slide-overs — on a phone they are
     effectively full-screen, entered with a horizontal slide, which reads wrong.
     The modals (AddItemButton, LocationSettings, OutfitFormModal, GenerateOutfitsButton)
     are centred max-w-md / xl / 3xl dialogs with `max-h-[90vh]`.
   - On phones, present both families as bottom sheets: enter from the bottom, safe-area
     aware, scroll-locked body, and a drag/tap-to-dismiss affordance. Keep the desktop
     behaviour (side panel / centred dialog) intact at >=sm.
   - AddItemButton's photo <label> is a 176px dashed drop zone — make it feel like a
     phone camera/library action, since that is the primary path.

6. PHONE TYPE
   - The weather metadata line ("H 83 - L 68 - 82% CHANCE OF RAIN") wraps to two lines
     of 10px all-caps at 390px and reads like fine print. Using the Phase A type scale,
     make phone metadata readable — this is the general fix for all-caps-by-default on
     a narrow screen.
   - Check every heading and label for wrapping at 375px (the narrowest target), not
     just 390px. The h1 "Jenna's Closet" currently breaks to two lines with the pieces
     pill and gear floating awkwardly beside the second line (`items-end`).

DO NOT
- Do not add a hero section or new above-the-fold visual moment (deferred).
- Do not add motion choreography, stagger or view transitions (deferred).
- Do not add dark mode or theme switching (deferred).
- Do not change feature behaviour, copy meaning, or the data seam. Every action that
  works today must still work.
- Do not restyle away from the Phase A system — extend it if you need something new.

VERIFY
- Screenshots at 375, 390 and 430px of: first paint (wardrobe visible above the fold),
  the suggestion card, the Outfits tab, both detail sheets, and each modal.
- Confirm on a touch-emulated viewport that item and outfit names are readable without
  hover, and that nav is reachable from a scrolled position.
- Audit touch targets: every interactive element >=44px on phone. List them.
- Confirm 1440px desktop has not regressed (screenshot before/after).
- Test as an installed PWA if possible — safe-area insets, no browser chrome, sticky
  chrome not colliding with the home indicator. (Note: the Browser pane cannot install
  service workers — use Claude in Chrome; see the project's verification-environment
  notes.)
- tsc clean, `next build` succeeds. Small logical commits; don't push unless asked.
```

---

## Phase C — Large screens

**Goal:** stop wasting the monitor. `max-w-6xl` (1152px) caps the entire app and the
grid stops at `lg:grid-cols-4`, so on a 27" display the app is a narrow column adrift in
pale blue with four small tiles per row. This is the most under-served size in the app.

```
Design Jenna's Closet for large screens. Layout and responsive work only, on top of the
Phase A design system and the Phase B mobile layout — neither may regress. (Read the
"Shared context" section of docs/enhancements-roadmap-prompts.md and Phases A-B of
docs/ui-revamp-prompts.md.)

Targets: 1440x900 laptop, 1920x1080 and 2560x1440 monitors. The app currently uses zero
`xl:` or `2xl:` breakpoints.

1. CONTAINER AND GRID
   - `main` is `mx-auto max-w-6xl px-6 pt-12 pb-24 lg:px-10` (WardrobeView.tsx:100) and
     both grids are `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`.
   - Decide a container strategy for >=1536px — a wider max width, a fluid container with
     generous gutters, or a bounded editorial measure with the grid allowed to breathe
     wider than the text. Justify the choice; do not simply uncap it.
   - Extend both grids through `xl:` / `2xl:` so a big monitor shows more of the wardrobe
     at a comfortable tile size, and check the tile size at each step actually helps
     scanning rather than shrinking garments into stamps.

2. USE THE WIDTH STRUCTURALLY
   - On wide screens the page is a single stacked column: header, suggestion card, tabs,
     search, grid. Consider what earns the horizontal space — e.g. the daily suggestion
     beside the wardrobe rather than stacked above it, filters/sort as a persistent rail
     instead of two stacked rows, or a two-column split. Pick one and make the desktop
     read as a designed layout, not a centred phone.
   - The header is `flex items-end justify-between` with a 4xl->6xl serif h1, a pieces
     pill and a gear icon — it is small relative to the page at 1440px+. Give it presence
     using the Phase A type scale.

3. PANELS AND MODALS AT WIDTH
   - Both detail panels are `max-w-2xl` slide-overs; on a 2560px screen that is a narrow
     strip against a huge dimmed page, and their content (a 420-440px hero plus a stacked
     form) does not use the room. Re-proportion for large screens — the ItemDetailPanel's
     two-column color block and the OutfitDetailPanel's piece list can both take more.
   - GenerateOutfitsButton's picker is `max-w-3xl` with `sm:grid-cols-3`; give it more
     columns and room on large screens so choosing between generated looks is easier.

4. HOVER AND POINTER AFFORDANCES
   - Desktop is where hover exists, so make it count within the Phase A vocabulary:
     card hover elevation, the OutfitCard exploded view, panel row hovers. Keep it
     consistent — today ItemCard lifts and shadows while OutfitCard only changes border
     color.
   - Guard hover-dependent styling behind `@media (hover: hover)` so touch devices and
     hybrid laptops don't get stuck-on hover states.

DO NOT
- Do not regress the phone layout from Phase B — verify it explicitly.
- Do not add a hero section, motion choreography, dark mode or theme switching (all
  deferred).
- Do not change feature behaviour or the data seam.

VERIFY
- Screenshots at 1440, 1920 and 2560px wide, plus 390px to prove no mobile regression:
  wardrobe grid, Outfits tab, both detail panels, the generate picker.
- Confirm no horizontal scroll at any width from 320px to 2560px.
- Confirm hover states do not stick on a touch-emulated viewport.
- tsc clean, `next build` succeeds. Small logical commits; don't push unless asked.
```

---

## Deferred backlog (a later session, after A–C)

Agreed with the user on 2026-09-03 to sequence these after the foundation and layouts:

- **More palettes.** Light and dark now ship with a switcher (`src/lib/theme.ts` +
  `ThemeToggle`), pulled forward from this backlog. What remains is the user's
  alternates -- a blue mode, a pink mode -- which are now genuinely just more palette
  blocks in globals.css plus more options in the toggle. Re-run
  `node scripts/check-contrast.mjs --theme=<name>` for each before shipping it.
  Two known rough edges in dark, both deliberately deferred: the scene tones behind
  outfit cards are serviceable rather than art-directed, and garment photos shot on
  white read as bright rectangles against the dark ground (a subtle per-theme tile
  treatment would fix it).
- **Motion and transitions pass.** Grid stagger on mount, panel/sheet choreography,
  view transitions between tabs, first-load skeletons for the grid (today only modals
  have them). Phase A defines the duration/easing tokens this builds on.
- **A real above-the-fold moment.** The app currently opens with a small header and an
  info card — no focal point, and the largest garment image on a phone is a 56px
  thumbnail in an app about clothes.
- **Promote the outfit exploded-view.** OutfitCard's hover explode (OutfitCard.tsx:104)
  is the most delightful thing in the app and is currently a desktop-only hover
  easter egg on a non-default tab. Make it a touch interaction and give it prominence.

---

## Appendix — audit findings (2026-09-03)

Measured against the working tree at commit `a586fa5`, plus the running dev server at
1440x900 and 390x844.

**Two color systems.** Theme tokens are blue; the derived/art layer is the previous
warm-beige palette — `vibeGradient()` mixes toward `#FBF6EC` / `#EDE4D2` / `#6E5F4B`
(color.ts:150), `suggestionSwatches()` toward `#E7E2D9` / `#7A6A55` (color.ts:160),
SceneBackdrop.tsx holds 37 hardcoded warm hexes with `INK = #262019` and
`CREAM = #F4F1EA`, ItemDetailPanel.tsx:150 mixes toward `#8D8478` / `#57503F`, and
GarmentGlyph.tsx:30 outlines in `rgba(38, 32, 25, 0.18)`. Net effect: the content layer
is desaturated relative to the chrome, so nothing pops.

**Contrast (WCAG, against `--color-ground` #eaf1f8 / `--color-cream` / `--color-card`).**

| token | ground | cream | card | |
|---|---|---|---|---|
| ink | 10.58 | 11.63 | 10.39 | pass |
| ink-soft | 5.45 | 5.99 | 5.35 | pass |
| muted | 3.93 | 4.32 | 3.86 | **fails AA** |
| accent | 2.54 | 2.79 | 2.49 | **fails badly** |
| blush-deep | 1.79 | 1.97 | 1.76 | **fails badly — carries every error message** |
| line-dark | 1.45 | 1.59 | 1.42 | |
| line | 1.15 | 1.20 | 1.13 | **invisible card edges** |

`cream on ink` = 11.63 but `cream on accent` = 2.79, so `bg-ink hover:bg-accent` makes
every primary CTA *less* legible on hover.

**Shape.** 43 `rounded-full`, 9 `rounded-2xl`, 6 `rounded-xl`, 1 `rounded-lg`. ItemCard
is rounded-2xl, OutfitCard has no radius; ItemGrid's empty state is rounded, OutfitGrid's
is square; both detail panels are entirely square while every modal is rounded-2xl.
Five one-off arbitrary shadows plus shadow-sm/md/xl, no elevation scale.

**Type.** `.eyebrow` (10px / 0.22em / uppercase) has 60+ uses and carries labels, button
text, metadata, item names and occasion tags alike. Scale is 10/12/14/18-20/36-60px.
Playfair appears in 4 places.

**Responsive.** 73 `sm:`, 3 `lg:`, zero `md:` / `xl:` / `2xl:`. `max-w-6xl` caps
everything; grids stop at 4 columns. At 390px: `pt-12` plus a full-height suggestion card
leaves zero items above the fold, 7 occasion pills wrap to 3 rows, occasion pills are
about 26px tall, and there is no sticky nav. Item and outfit names are
`opacity-0 group-hover:opacity-100`, so they are unreachable on a touchscreen.

**Interaction.** `focus:outline-none` in 7 components and exactly one `focus-visible` in
the codebase (a border change on OutfitCard) — keyboard focus is invisible. Durations are
200/300/500 with default easing and no shared token. The film grain (`body::after`,
opacity 0.035, z-index 90) is invisible in practice but stacks a fixed layer above content.
