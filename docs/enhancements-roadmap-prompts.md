# Jenna's Closet — Enhancements Roadmap & Build Prompts

Phased plan for the next round of work, written so each phase can be handed to a
fresh Claude Code session (Opus) on its own. Run them **in order** — later phases
assume the tables and helpers from earlier ones exist.

**Agreed order:** Phase 1 (weather: location + conditions) → Phase 2 (PWA) →
Phase 3 (weather: occasion + wear log + smart suggestion) → Phase 4 (real garment
identification on upload). Phases 5+ are smaller / optional and unordered.

> Companion docs: `docs/PROJECT_PLAN.md` (original vision), `docs/wardrobe-app-build-prompts.md`
> (Prompts 1–6, already built), `docs/DEPLOYMENT.md` (Vercel setup). This file
> supersedes Prompt 4 in the older doc.

---

## Shared context — read before any phase

Paste this block (or point the session at this section) at the top of every phase
prompt. It is current as of 2026-09-02.

```
PROJECT
- "Jenna's Closet" — a personal wardrobe/outfit app for one user (Jenna). Next.js 15
  App Router, TypeScript, Tailwind CSS v4 (no UI kit — custom components), deployed
  to Vercel, auto-deploys from `main`.
- App name/tagline: src/lib/config.ts. Aesthetic: soft blue editorial — pale-blue
  ground, blush accents, Playfair Display headings + Inter body, `.eyebrow` small-caps
  labels, hairline borders, gentle shadows. Palette tokens + keyframes in
  src/app/globals.css (--color-ground, -cream, -card, -ink, -accent, -blush, etc.).
  Match this; do not introduce a new visual language.

BACKEND — Supabase, NO AUTH
- Single trusted server-side client: src/lib/supabase/client.ts (`supabase`). Reads
  SUPABASE_URL / SUPABASE_ANON_KEY (deliberately NOT NEXT_PUBLIC_ — the key must never
  reach the browser). NEVER import this module from a "use client" component.
- RLS is OFF on the app's own tables. Schema: supabase/schema.sql (items, outfits,
  outfit_items). IMPORTANT: this Supabase project does NOT auto-grant table access,
  so every new table needs, in schema.sql:
      alter table <t> disable row level security;
      grant all on <t> to anon, authenticated, service_role;
  Migrations are applied by hand in the Supabase SQL editor — put new DDL in
  schema.sql AND give the user the exact SQL to run.

DATA SEAM — do not break it
- UI components never touch Supabase directly. They call functions in
  src/lib/data/wardrobe-repository.ts (fetchItems/fetchOutfits/fetchDailySuggestion),
  which return the camelCase types in src/lib/types.ts (ClothingItem, Outfit,
  DailySuggestion, Category, OutfitVibe). Add new reads there or in a sibling module.
- Mutations are Server Actions in src/lib/actions/* ("use server"), called from client
  components via useActionState/useTransition. See src/lib/actions/outfits.ts and
  src/lib/actions/add-item.ts for the established shape (return { error?: string }).

KEY FILES
- src/app/page.tsx — server component, `export const dynamic = "force-dynamic"`
  (page always reflects the live DB), `export const maxDuration = 60`, passes
  `canFetchFromLink={!process.env.VERCEL}`. Composes <WardrobeView>.
- src/components/WardrobeView.tsx — top-level client component, holds all view state
  (filter, selected item/outfit), renders header + DailySuggestionCard + CategoryTabs +
  grids + detail panels.
- src/components/DailySuggestionCard.tsx — currently renders a hardcoded suggestion.
- src/lib/data/wardrobe-repository.ts — `fetchDailySuggestion()` is a STUB (hardcoded
  72°F "Clear", first-item-per-category). Replacing it is the point of Phases 1 & 3.
- src/lib/server/generate-outfits.ts — Gemini call via `@google/genai`, free tier,
  `GEMINI_API_KEY`. Has a MODEL_FALLBACK_CHAIN (gemini-flash-latest →
  gemini-flash-lite-latest on 5xx/429) and disables the SDK's own retry. Reuse this
  pattern for any new Gemini call; consider extracting the fallback loop into a shared
  helper (src/lib/server/gemini.ts) the first time you need it twice.
- src/lib/server/item-pipeline.ts — shared add-item pipeline: HEIC→JPEG normalise →
  remove.bg background removal → sharp trim → average-opaque-pixel color → upload to
  the `item-images` bucket → insert `items` row.

ENV VARS (Vercel → Settings → Environment Variables — all three environments)
- SUPABASE_URL, SUPABASE_ANON_KEY, REMOVE_BG_API_KEY, GEMINI_API_KEY,
  PUPPETEER_SKIP_DOWNLOAD=true. Any NEW env var a phase needs must be added here and
  noted in docs/DEPLOYMENT.md (its env table is currently missing GEMINI_API_KEY — fix
  that while you're there).

CONSTRAINTS
- Puppeteer / the Aritzia link-fetch mode cannot run on Vercel (see docs/DEPLOYMENT.md
  and the closet-app-deployment-constraints memory) — don't build on it for anything
  server-side. Photo upload works everywhere.
- Prefer no-card, free-tier external services. Weather = Open-Meteo (no key, no signup).
  AI = Gemini free tier.
- Free Gemini quota is per-model per-day (resets midnight Pacific). Full-wardrobe
  vision calls are the expensive ones — don't loop them in tests.

WORKING STYLE (from the closet-app-working-style memory)
- One thing at a time; verify before moving on. Frontend polish is priority #1 — this
  is for the user's girlfriend and must look pretty on phone and desktop.
- Test new pipeline/data logic with a standalone script against real data (see
  scripts/*.mjs) before wiring it into the UI.
- Verify UI via the browser preview: read_page / computed styles / JS measurement
  (screenshots need the pane visible). Test at 375px (phone) and desktop.
- Commit in small logical commits; only commit/push when the user asks.
```

---

## Phase 1 — Weather: location + today's conditions

**Goal:** replace the hardcoded weather in `DailySuggestionCard` with the real
forecast for a location Jenna sets once. No occasion logic, no wear log, no AI —
just accurate weather on the card. (Occasion + smart suggestions are Phase 3.)

```
Build Phase 1 of the weather feature for Jenna's Closet. (Read the "Shared context"
section of docs/enhancements-roadmap-prompts.md first.)

SCOPE: a location setting + real current weather on the daily suggestion card.
Do NOT touch occasion tagging, wear logging, or the outfit-picking logic yet — those
are Phase 3. The card should keep showing SOME outfit (leave the existing
first-item-per-category pick in place for now) but with real weather around it.

1. SCHEMA (add to supabase/schema.sql + give the user the SQL to run)
   - `app_settings`: a single-row table.
       id text primary key default 'singleton' check (id = 'singleton'),
       location_label text,          -- e.g. "Boston, Massachusetts"
       latitude double precision,
       longitude double precision,
       timezone text,                -- IANA tz from geocoding, e.g. "America/New_York"
       updated_at timestamptz not null default now()
   - `weather_cache`: avoid refetching on every page load (the page is force-dynamic).
       location_key text not null,   -- `${lat.toFixed(2)},${lon.toFixed(2)}`
       fetched_for date not null,    -- the local date the payload is for
       payload jsonb not null,       -- normalised weather object (see step 3)
       fetched_at timestamptz not null default now(),
       primary key (location_key, fetched_for)
   - Both tables: `alter table ... disable row level security;` and
     `grant all on ... to anon, authenticated, service_role;` (this project needs the
     explicit grants — see schema.sql's existing note).

2. LOCATION SETTINGS UI
   - Add a settings entry point in the WardrobeView header — a small gear icon button
     next to the "N pieces" pill (match the existing icon-button style). Opens a modal
     (reuse the modal pattern from AddItemButton: fixed overlay, bg-ink/25 backdrop,
     max-w-md cream dialog, p-5 sm:p-8, translate/opacity transition, close on
     backdrop/X, mobile padding p-3 sm:p-6).
   - One field: a text input "Your location" (city, or "city, state"). On submit, call
     Open-Meteo geocoding server-side:
       GET https://geocoding-api.open-meteo.com/v1/search?name=<q>&count=5&language=en&format=json
     Show the top matches as a short pick list (name + admin1 + country_code) if there's
     more than one; on pick, save { location_label, latitude, longitude, timezone } to
     app_settings via a Server Action. If exactly one result, save it directly.
   - Pre-fill the input with the current app_settings.location_label if set. First-run
     (no setting): optionally pre-fill the input from Vercel's IP headers
     (`x-vercel-ip-city`, `x-vercel-ip-country-region`) as a guess the user confirms —
     never save an IP guess silently.
   - Errors (no geocoding match, network) → inline message, no crash.

3. WEATHER FETCH (server-only, e.g. src/lib/server/weather.ts)
   - If app_settings has no lat/lon, return null (card shows a "Set your location" state).
   - Compute location_key. If weather_cache has a row for (location_key, today-in-tz),
     use its payload. Otherwise fetch Open-Meteo forecast:
       GET https://api.open-meteo.com/v1/forecast
         ?latitude=<lat>&longitude=<lon>
         &current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m
         &daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code
         &temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch
         &timezone=auto&forecast_days=1
   - Normalise to a stable shape and upsert into weather_cache:
       { tempF, feelsLikeF, hiF, loF, precipProbability, windMph, code, condition, isDay }
   - Map the WMO `weather_code` to a `condition` label + an icon key. Codes:
       0 Clear · 1–2 Mostly clear · 3 Overcast · 45/48 Fog · 51–57 Drizzle ·
       61–67 Rain · 71–77 Snow · 80–82 Rain showers · 85–86 Snow showers ·
       95–99 Thunderstorm. Build a small lookup (code → { label, icon }). Add 2–3 more
       weather icons in the existing hand-drawn SVG style (there's a SunIcon in
       DailySuggestionCard already) — at least sun, cloud, rain, snow.
   - Open-Meteo needs no API key and no card. Non-commercial free tier is 10k calls/day;
     with the cache this is ~1–2 calls/day. Handle a failed fetch by falling back to the
     last cached payload if any, else null.

4. TYPES + REPOSITORY
   - Extend src/lib/types.ts: add `AppSettings` and a `Weather` interface; change
     `DailySuggestion.weather` to the richer `Weather` shape (update the stub and the
     card together). Keep `occasion` and `itemIds` for now.
   - Add `fetchAppSettings()` / `fetchWeather()` to the data layer. `fetchDailySuggestion()`
     now composes real weather + the existing dumb item pick.
   - page.tsx already Promise.all's these — add the settings/weather reads there.

5. DAILY SUGGESTION CARD
   - Real temp, condition + icon, hi/lo, and "X% chance of rain" when precipProbability
     is meaningful (>= ~20%). Keep the editorial one-liner but make it reflect reality
     (cold/mild/warm/hot band + wet/dry). Keep the thumbnail row.
   - No-location state: a gentle "Set your location to see today's weather" with a button
     that opens the settings modal.

EDGE CASES / DO NOT
- Do not put lat/lon in any client-visible URL or the page HTML beyond what the card
  needs (temp/condition are fine; precise coords are not).
- Do not add a weather API key env var — Open-Meteo needs none.
- Do not build the occasion selector or wear log (Phase 3).
- Do not call Open-Meteo from a client component — it must be server-side and cached.

VERIFY
- Standalone script: geocode "Boston, MA", fetch its forecast, print the normalised
  object. Then a second run to confirm the cache hit path.
- Browser at 375px and desktop: no-location state, set a location, card shows real
  weather, reload doesn't refetch (check server logs / a fetched_at timestamp).
- tsc clean. Commit in small logical commits; don't push unless asked.
```

---

## Phase 2 — Progressive Web App (installable on phone)

**Goal:** Jenna can "Add to Home Screen" and the app opens fullscreen like a native
app, with an icon, splash, and a minimal offline shell. We just did the mobile
layout pass — this makes it feel like a real phone app.

```
Make Jenna's Closet an installable PWA. (Read the "Shared context" section of
docs/enhancements-roadmap-prompts.md first.)

1. MANIFEST
   - Add src/app/manifest.ts (Next 15 metadata route) returning a MetadataRoute.Manifest:
     name "Jenna's Closet", short_name "Closet", description, start_url "/",
     display "standalone", orientation "portrait", background_color and theme_color
     from the palette (--color-ground / --color-ink — use the resolved hex),
     categories ["lifestyle"], icons (see step 2).

2. ICONS + APPLE META
   - Generate app icons from the brand "J" mark / favicon in the app's style:
     192×192, 512×512, and a 512×512 maskable (safe-zone padded) PNG. Put them in
     /public (e.g. /public/icons/). A small script that renders the SVG "J" on the
     --color-ground blue at each size with `sharp` is fine — commit the PNGs.
   - Add to the root layout's `metadata`/`viewport` exports: themeColor (light + dark
     if the app has a dark treatment — it currently doesn't, so one value), appleWebApp
     { capable: true, statusBarStyle: "default", title: "Closet" }, and a 180×180
     apple-touch-icon.
   - `export const viewport` with `themeColor` and `width: "device-width, initial-scale=1,
     viewport-fit=cover"` so it respects the notch; add `env(safe-area-inset-*)` padding
     to the sticky header / any bottom-fixed UI if needed.

3. SERVICE WORKER (minimal — installability + graceful offline, not full offline)
   - Use @serwist/next (the maintained successor to next-pwa) OR a hand-written SW if
     that's lighter for this app. Requirements:
     - Precache the app shell (built static assets, the icons).
     - Runtime cache: StaleWhileRevalidate for Supabase image CDN URLs (item photos /
       cutouts) so a previously-viewed wardrobe still shows images offline.
     - NetworkFirst with a short timeout for the page document; on failure show a
       simple branded offline fallback page (/offline) — do NOT try to make the
       force-dynamic data fully work offline, just don't show the browser dino.
     - Register the SW only in production.
   - Confirm the SW doesn't break the existing Server Actions / add-item flow (don't
     cache POSTs or action responses).

4. Do NOT: add push notifications, background sync, or an install-prompt nag banner.
   Keep it to: manifest + icons + a lean SW.

VERIFY
- Chrome DevTools → Application: manifest parses, icons load, SW registers, "Installable".
- Lighthouse PWA / installability checks pass.
- Emulated mobile: install, launch from home screen, confirm standalone (no browser
  chrome), safe-area insets look right, offline shows the fallback not the dino.
- tsc clean, `next build` succeeds (SW generation runs at build). Small commits.
```

---

## Phase 3 — Weather: occasion, wear log, and a smart daily suggestion

**Goal:** the daily card becomes genuinely useful — pick today's occasion, get an
outfit that fits the weather AND the occasion, log what you wore, ask for another.

```
Build Phase 3 of the weather feature for Jenna's Closet. (Read the "Shared context"
section of docs/enhancements-roadmap-prompts.md, and note Phase 1 already added
app_settings, weather_cache, fetchWeather(), and the richer Weather type.)

1. SCHEMA (schema.sql + SQL for the user; remember the RLS-off + grant lines)
   - `wear_log`:
       id uuid primary key default gen_random_uuid(),
       outfit_id uuid references outfits (id) on delete set null,
       item_ids uuid[] not null default '{}',   -- for ad-hoc (non-saved) combos
       worn_on date not null default current_date,
       occasion_tag text,
       created_at timestamptz not null default now()
   - `occasion_tags` (optional, for custom-tag persistence): id text primary key
     (the slug), label text. Seed a few: work, gym, date, casual, travel, errands.
     If you'd rather keep it simple, store distinct occasion_tag strings and derive
     the suggestion list in the app layer — either is fine, don't hardcode a closed
     enum in the DB.

2. OCCASION SELECTOR (on the DailySuggestionCard)
   - A compact pill row / dropdown: the seeded tags + any custom ones the user has
     used before + an "＋ add" affordance for a new one. Selecting one is a client
     action that re-requests a suggestion (step 4). Persist "today's occasion" so a
     reload keeps it (a wear_log row isn't written until she taps "Wore this" — track
     the pending selection in app state or a lightweight `daily_state` row keyed by date).

3. RECENTLY-WORN EXCLUSION
   - `fetchRecentlyWornItemIds(days = 5)` — item ids appearing in wear_log within N
     days (via outfit_items for logged outfits, plus item_ids for ad-hoc). Configurable
     constant, default 5.

4. SUGGESTION LOGIC (rewrite fetchDailySuggestion / add getDailySuggestion)
   Given today's weather + chosen occasion + wardrobe:
   - FIRST try to match a SAVED outfit: score Jenna's existing outfits by
     (vibe ↔ weather fit) and (vibe ↔ occasion fit), excluding any whose items are
     mostly in the recently-worn set. If a good match exists, suggest that outfit
     (return its outfit_id, name, itemIds, and a one-line "why").
   - FALLBACK to Gemini for a fresh combo only when no saved outfit fits: reuse the
     generate-outfits.ts model-fallback pattern (extract the shared helper if not
     already done). Send weather (tempF, hi/lo, condition, precip), the occasion, and
     the available items (id, category, name, color, cutout image optional) minus
     recently-worn; ask for ONE outfit (top+bottom+shoes, optional jacket/accessories)
     with a one-line rationale, as JSON schema output. Validate item ids like
     generate-outfits does.
   - This keeps the common case free (no API call) and surfaces her curated outfits.
     Confirm the (a)-vs-(b) preference with the user if unsure — default is
     "saved outfit first, AI fallback".

5. CARD INTERACTIONS
   - Show: weather (from Phase 1), occasion selector, the suggested outfit's item
     thumbnails, its name (if saved) and the one-line rationale.
   - "Wore this" → writes a wear_log row (outfit_id or item_ids, worn_on = today,
     occasion_tag), then shows a subtle confirmed state.
   - "Show another" → re-run the suggestion, excluding the one just shown (and honoring
     recently-worn). Loading state while it thinks (reuse the shimmer/sparkle pattern
     from GenerateOutfitsButton's GeneratingState if an AI call is involved).

6. Do NOT: build wear analytics dashboards, calendar integration, or try-on here —
   those are later. Just: occasion + suggestion + log + reshuffle.

VERIFY
- Script: seed a couple of wear_log rows, confirm recently-worn exclusion, run the
  suggestion for a cold/rainy day + "work" and a warm/dry day + "gym", print results.
- Browser 375px + desktop: pick occasions, "Wore this" persists across reload,
  "Show another" changes the pick, no-saved-outfit path hits Gemini and returns.
- tsc clean. Small commits, push only when asked.
```

---

## Phase 4 — Real garment identification on photo upload (Prompt 3, revised)

**Goal:** when Jenna uploads her own photos, auto-detect name / category / silhouette
/ color so she isn't typing metadata for every piece. This is what turns the app
from demo data into her real closet.

```
Build automatic garment identification for the Add Item photo flow in Jenna's Closet.
(Read the "Shared context" section of docs/enhancements-roadmap-prompts.md. This
revises "Prompt 3" in docs/wardrobe-app-build-prompts.md — that doc assumed the Claude
API and a separate review screen; we're using Gemini for consistency + free tier, and
the upload flow already exists in AddItemButton.tsx + item-pipeline.ts.)

1. VISION CALL (src/lib/server/identify-garment.ts)
   - Input: the uploaded image buffer (already HEIC-normalised in item-pipeline).
   - Gemini call (reuse the shared model-fallback helper from generate-outfits.ts —
     extract it to src/lib/server/gemini.ts if not done yet), JSON schema output:
       { category: one of tops|jackets|bottoms|accessories|shoes,
         name: short natural name e.g. "Sage Linen Camp Shirt",
         silhouette: one of the Silhouette union in types.ts, or null,
         primaryColorHex: best-guess hex,
         details: short string — pattern / hardware / construction (for future dedup) }
   - Prompt it to return category/silhouette from the fixed lists only, and a concise
     retail-style name (no sentences).

2. WIRE INTO ADD ITEM (photo mode only — link mode already has metadata)
   - On file select, kick off identification in the background (Server Action) while
     the user is still in the modal. Show a small "Identifying…" state on the form.
   - Pre-fill Name / Category (and silhouette if the field exists / add a hidden one)
     with the AI result; leave them editable — the user confirms or corrects before
     "Add to Closet". If identification fails, just leave the fields blank as today
     (don't block the upload).
   - The pixel-derived color from item-pipeline's averageOpaqueColorHex stays the
     source of truth for primary_color_hex; the AI hex is only a pre-fill hint if the
     pipeline hasn't run yet. Do not regress the existing color extraction.

3. BATCH UPLOAD (multi-file)
   - Allow selecting multiple photos. Process sequentially through the existing
     pipeline; show per-photo progress + the identified name/category.
   - After the batch, a review list: each new item with its editable name/category and
     a remove toggle, then one "Add all" that commits. Skip unusable photos (not
     clothing / too blurry — let Gemini flag `category: null`) with a noted "skipped".

4. DEDUP (optional for v1 — implement only if time allows, else leave a TODO)
   - Before inserting, ask Gemini whether the new item's `details` + category + color
     match an existing item in the same category closely enough to be the same physical
     piece. If yes, attach the new source photo to the existing item's
     source_photo_urls instead of inserting.

5. Do NOT: change the link-fetch (Aritzia) mode, the background-removal step, or the
   storage layout. Do NOT switch providers to Claude.

VERIFY
- Script: run identify-garment.ts against 3–4 real garment photos (flat-lay and
  on-hanger), print results; confirm category/silhouette stay within the unions.
- Browser: single upload pre-fills correctly and stays editable; a non-clothing photo
  is skipped gracefully; batch of 3 produces a review list that commits.
- Watch Gemini quota — each identify call is 1 image, cheap, but don't loop the test.
- tsc clean. Small commits.
```

---

## Phase 5+ — smaller enhancements (unordered, pick up any time)

Lighter prompts — each is a session or less. No strict order.

### 5a. Laundry / unavailable toggle
```
Add an "in the wash / unavailable" toggle to items in Jenna's Closet. Schema: add
`unavailable boolean not null default false` to items (schema.sql + SQL for the user).
UI: a toggle in ItemDetailPanel with a clear on-state. Behaviour: unavailable items
are dimmed with a small badge in the grid, and are EXCLUDED from Generate Outfits
candidates (src/lib/server/generate-outfits.ts) and the daily suggestion
(Phase 3 logic). Manual outfit creation can still include them (with a hint). tsc
clean, small commits. Read docs/enhancements-roadmap-prompts.md shared context first.
```

### 5b. Wardrobe search + sort
```
Add search and sort to the wardrobe grid in Jenna's Closet (WardrobeView / ItemGrid).
No schema change — all client-side over the already-loaded items. Add a search input
(matches name; also match category and color name) and a sort dropdown (Newest /
Name A–Z / By color — group by hue). Keep it inside the existing filter row; on mobile
it stacks like the tabs already do. Empty-result state matches the existing empty
states. tsc clean, small commits. Read the shared context section first.
```

### 5c. Outfit editing
```
Add outfit editing to Jenna's Closet. Today outfits can only be created or deleted
(CreateOutfitButton, OutfitDetailPanel, src/lib/actions/outfits.ts). Add an "Edit"
action in OutfitDetailPanel that opens the CreateOutfitButton form pre-filled with the
outfit's current name / vibe / items, and an `updateOutfit` Server Action that
replaces the outfit_items rows and updates name/vibe in one go. Reuse the existing
form component rather than duplicating it. tsc clean, small commits. Read the shared
context section first.
```

---

## Future / bigger integrations (not yet spec'd — sketches only)

Rough scope so they're on the radar. Turn one into a full phase prompt when it's next.

- **Google Calendar** — OAuth (free tier), read tomorrow's events, pre-suggest an
  outfit per event using the Phase 3 suggestion engine (event title/keywords → occasion
  guess). Needs a real OAuth flow and token storage — the first feature that genuinely
  needs per-user auth plumbing.
- **Trip packing** — date range + destination; Open-Meteo forecast for that location
  and range → a capsule packing checklist built from owned items (reuses Phase 1
  geocoding + Phase 3 weather-fit scoring). Output is a saved, checkable list.
- **Wear analytics** — add `purchase_price numeric` to items; from wear_log show
  most/least worn, cost-per-wear, "haven't worn in N months" nudges, and a simple
  "wardrobe gaps" pass (Gemini reviews the closet for missing versatile basics).
- **AI outfit try-on (Prompt 5)** — render outfits on a base photo of Jenna via an
  image model. Heaviest lift; full spec already in docs/wardrobe-app-build-prompts.md
  (Prompt 5). Prototype on an isolated route first.
- **Dark mode** — a dark treatment of the editorial theme; the palette is already
  tokenised in globals.css so it's mostly a second token set + a toggle.
