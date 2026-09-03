# Jenna's Closet — Enhancements Roadmap & Build Prompts

What's left to build, written so each phase can be handed to a fresh Claude Code
session (Opus) on its own. Each prompt is self-contained; start by reading
**Shared context**, which describes the app as it stands today.

**Suggested order from here:** **Phase 9 (accounts)** next — it is the one
change that gets harder with every row added, and Phases 4, 6 and 7 all create
rows that would then need retrofitting with an owner. Then Phase 4 (garment
identification), once the remove.bg question below is settled. Then 6 (wear
history) → 7 (suggestion feedback), both of which want a few weeks of real wear
data behind them first. Phases 5a–5f are small and unordered — pick up any time;
5e (next/image) is the quickest win of them. Phase 8 (notifications) is the
largest infrastructure lift and can wait.

## Shipped

Prompts for finished work have been removed so this file only holds what's
left. Git history has the original wording if it's ever needed, and the
architecture they produced is described in **Shared context** below — read that
rather than hunting for the old prompts.

| Phase | Shipped | Where it lives now |
| --- | --- | --- |
| 1 — Weather: location + conditions | 2026-09-02 | `app_settings`, `weather_cache`, `src/lib/server/weather*.ts`, `LocationSettings.tsx` |
| 2 — PWA | 2026-09-02 | `src/app/manifest.ts`, `public/sw.js`, `/offline`, `public/icons/` |
| 3 — Occasion, wear log, suggestion | 2026-09-03 | `wear_log` / `occasion_tags` / `daily_state`, `src/lib/server/suggest-outfit*.ts`, `OccasionPicker.tsx` |
| 5b — Wardrobe search + sort | 2026-09-03 | `WardrobeControls.tsx`, `colorTerms` / `colorSortKey` in `src/lib/color.ts` |
| 5c — Outfit editing | 2026-09-03 | `OutfitFormModal.tsx`, `updateOutfit` in `actions/outfits.ts` |

All of the above is merged, deployed and live. Migrations `001-weather.sql` and
`002-wear-log.sql` are applied to the Supabase project.

## Open, and not code

These three are worth clearing before picking up another phase — none of them
need a session.

- **Decide the remove.bg question.** ~42 free calls left this month, 50/month
  for the whole project. A real wardrobe would exhaust it, and Phase 9 makes
  that sharper since three people would share the same allowance. Options: add
  a skip-removal fallback, buy credits, or proceed and watch the counter.
  **Phase 4 is blocked on this.**
- **Delete the junk outfits.** ~28 rows, most of them leftovers from earlier
  AI-generation testing, plus one unexplained "Test" outfit. Phase 3 now *ranks*
  saved outfits, so these actively degrade the daily suggestion — and because
  the test outfits share many of the same garments, logging one wear can exclude
  several others at once.
- **Do the phone install test.** Phase 2 shipped but has never been checked on a
  real device: add to home screen, confirm it launches fullscreen with the right
  icon, and that airplane mode shows the offline page rather than the browser's
  error.

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
- src/components/DailySuggestionCard.tsx — real weather, the occasion picker, the
  suggested outfit with its rationale, and the "Wore this" / "Show another" actions.
- src/lib/data/wardrobe-repository.ts — `fetchDailySuggestion(options)` composes real
  weather + the chosen occasion + a scored outfit. Also `fetchAppSettings`,
  `fetchWeather`, `fetchOccasionTags`, `fetchTodayOccasion`, `fetchRecentlyWornItemIds`.
- src/lib/server/weather.ts + weather-core.ts — Open-Meteo geocoding and forecast,
  cached per (location, local date). `getLocalToday()` is the one source of truth for
  "today" — always use it for anything dated, never the server clock (Vercel is UTC).
- src/lib/server/suggest-outfit.ts + suggest-outfit-core.ts — scores saved outfits on
  vibe↔occasion and vibe↔weather fit plus garment adjustments, excludes anything more
  than half recently-worn, and only asks Gemini when nothing saved clears the bar.
- src/lib/weather-bands.ts — `temperatureBand()` / `isWet()` / `NOTABLE_PRECIP`, shared
  so UI copy and scoring can never disagree about what "cold" means.
- src/lib/server/gemini.ts — `generateJson({ parts, config, label })` and
  `isGeminiConfigured()`. ALL Gemini calls go through this; it owns the model fallback
  chain and the friendly quota/overload errors.
- src/lib/server/generate-outfits.ts — the Generate Outfits vision call. Builds its own
  prompt/schema/validation, then hands off to src/lib/server/gemini.ts for the call.
- src/lib/server/item-pipeline.ts — shared add-item pipeline: HEIC→JPEG normalise →
  remove.bg background removal → sharp trim → average-opaque-pixel color → upload to
  the `item-images` bucket → insert `items` row.

ENV VARS (Vercel → Settings → Environment Variables — all three environments)
- SUPABASE_URL, SUPABASE_ANON_KEY, REMOVE_BG_API_KEY, GEMINI_API_KEY,
  PUPPETEER_SKIP_DOWNLOAD=true. Any NEW env var a phase needs must be added here and
  documented in docs/DEPLOYMENT.md's env table. Weather needs none (Open-Meteo).
- MIGRATIONS: the anon key cannot run DDL, so new tables are applied by hand. Put the
  DDL in supabase/schema.sql AND a numbered file in supabase/migrations/, and give the
  user the exact SQL to paste. Make new reads degrade (empty list / null) rather than
  throw — the site is live, and it must not break in the window between the deploy and
  the migration being run.
- SCRIPTS: `node --experimental-strip-types --import ./scripts/ts-resolve.mjs
  --env-file=.env scripts/<name>.mjs` lets a script import real app modules (the
  resolver teaches Node the `@/` alias and extensionless imports). Keep new logic in a
  pure "-core" module with no network or database so it can be tested this way. See
  scripts/check-weather.mjs and scripts/check-suggestion.mjs.

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

Lighter prompts — each is a session or less. No strict order. (5b and 5c have
shipped; see the table at the top.)

### 5a. Item availability (laundry + out of season)
```
Add an availability state to items in Jenna's Closet. (Read the "Shared context"
section of docs/enhancements-roadmap-prompts.md first.)

Originally scoped as a laundry toggle; widened because "in the wash" and "packed
away for the season" are the same field, the same UI and the same exclusion rule —
doing them separately would mean two passes over the same code.

1. SCHEMA (schema.sql + supabase/migrations/00N-availability.sql + SQL for the user)
   - items: add `availability text not null default 'available'`
     check (availability in ('available', 'laundry', 'stored')).
   - Read it as a plain string in the repository; add `Availability` to types.ts.

2. UI
   - ItemDetailPanel: a three-way control (Available / In the wash / Stored away)
     in the existing read-only facts area, styled like the other controls there.
   - ItemGrid: unavailable items dim to ~55% opacity with a small corner badge
     ("WASH" / "STORED") in the .eyebrow style. Do NOT hide them.

3. BEHAVIOUR
   - Excluded from Generate Outfits candidates (src/lib/server/generate-outfits.ts)
     and from the daily suggestion — for the latter, filter in the repository before
     calling chooseSuggestion, and also skip any SAVED outfit containing an
     unavailable item, otherwise the card will suggest an outfit she can't wear.
   - Manual outfit creation may still include them, with an inline hint.
   - If filtering leaves too few items to dress her, fall back to the unfiltered set
     rather than showing nothing (suggest-outfit.ts already does this for
     recently-worn — follow that pattern).

VERIFY: script that marks a couple of items unavailable and confirms both the
suggestion and Generate Outfits skip them, and that a saved outfit containing one
is skipped too. Browser at 375px + desktop. tsc clean, small commits.
```

### 5d. Shareable outfit card
```
Let Jenna share an outfit as an image from Jenna's Closet. (Read the "Shared
context" section of docs/enhancements-roadmap-prompts.md first.)

- A route that renders an outfit as a 1200x630 image using Next's built-in
  `ImageResponse` (next/og) - NO new dependency, and no headless browser (Puppeteer
  cannot run on Vercel; see the constraints section).
- Design it in the app's language: pale-blue ground, the outfit's cutouts laid out
  in a row, the outfit name in Playfair, a small "Jenna's Closet" mark. ImageResponse
  supports only a subset of CSS (flexbox yes, grid no) - keep the layout simple, and
  load the fonts explicitly since it does not inherit the app's.
- A "Share" action in OutfitDetailPanel: use `navigator.share` with the image file
  where supported (that is the phone case, which is the point), falling back to
  opening the image in a new tab on desktop.
- Cutouts live on Supabase's public CDN, so the image route can fetch them directly.
  Cache the response - an outfit's image only changes when the outfit does.

Do NOT: add a public gallery, a share-link table, or any server that stores generated
images. This is "make a picture, hand it to the OS share sheet".

VERIFY: hit the route directly and eyeball the PNG at 1200x630; check that an outfit
with 2 items and one with 6 both lay out sensibly; confirm the share sheet appears on
an emulated mobile viewport. tsc clean.
```

### 5e. Serve images through next/image
```
Move Jenna's Closet off raw <img> tags onto next/image. (Read the "Shared context"
section of docs/enhancements-roadmap-prompts.md first.)

Today every photo is a plain <img> pointing at the full-size Supabase original, with
`// eslint-disable-next-line @next/next/no-img-element` above it - ItemCard,
ItemGrid, OutfitCard, both detail panels, DailySuggestionCard, AddItemButton's
preview. On a phone over cellular this is the app's single biggest cost.

- next.config.ts: add `images.remotePatterns` for the Supabase storage host. Derive
  the host from SUPABASE_URL rather than hardcoding the project reference.
- Replace the <img> tags with <Image>, giving each a real `sizes` value matching its
  grid column so the browser fetches an appropriately sized file. Remove the
  eslint-disable comments as you go.
- The blob: preview URL in AddItemButton is NOT a remote pattern - leave that one as
  a plain <img> with its disable comment, and say why in a comment.
- CHECK FIRST and report back: Vercel's Hobby plan includes a monthly image
  transformation allowance. Confirm the current limit and estimate whether a
  single-user wardrobe of ~30 items could exceed it. If it looks tight, serve
  Supabase's own transform URLs instead and explain the trade-off rather than
  silently risking an overage.

VERIFY: measure transferred bytes for the grid before and after at a 375px viewport
(read_network_requests) and report the actual numbers. Confirm no layout shift and
that cutouts still sit correctly inside their tiles. tsc clean, `next build` passes.
```

### 5f. Export and backup
```
Add an export to Jenna's Closet so the wardrobe is not only inside one free-tier
Supabase project. (Read the "Shared context" section of
docs/enhancements-roadmap-prompts.md first.)

- A route handler that streams a ZIP containing wardrobe.json (items, outfits,
  outfit_items, wear_log, app_settings - camelCase, the types.ts shapes) plus the
  item images and cutouts under images/<item-id>/.
- Trigger it from the settings modal (LocationSettings.tsx - rename it to something
  more general such as SettingsModal, since it stops being only about location).
- Stream rather than buffering the whole archive in memory, and set maxDuration
  generously: ~30 items x 2 images is a real download on a serverless function.
- Do NOT add an import/restore path in this pass. Restoring is a different problem
  (id collisions, storage re-upload) and deserves its own prompt.

VERIFY: download it, unzip it, confirm the JSON parses, the counts match the database,
and every referenced image file is present. tsc clean.
```

---

## Phase 6 — Wear history

**Goal:** make the wear log visible. Phase 3 started collecting it and nobody can
see it. This is the natural payoff, and it needs no new external service.

```
Build a wear history view for Jenna's Closet. (Read the "Shared context" section of
docs/enhancements-roadmap-prompts.md first. Phase 3 already added the `wear_log`
table, `fetchRecentlyWornItemIds()`, and logging via the "Wore this" button.)

1. NO NEW SCHEMA. Everything comes from wear_log + outfit_items + items.

2. DATA LAYER
   - `fetchWearHistory(fromDay, toDay)` - rows with their resolved item ids, so a
     logged saved outfit and an ad-hoc combination read the same way. Note that
     wear_log.item_ids is a SNAPSHOT: prefer it over re-reading outfit_items, so the
     history stays truthful if the outfit was edited or deleted afterwards.
   - `fetchLastWornByItem()` returning a Map of item id to the most recent date.
   - Use getLocalToday() for all date maths - never the server clock (Vercel is UTC).

3. CALENDAR VIEW
   - Reachable either from the category tab row or its own route - your call, but
     keep to one navigation idiom, do not invent a second.
   - A month grid: each day with a wear shows the outfit's cutouts as small stacked
     thumbnails; tapping a day opens OutfitDetailPanel, or an ad-hoc equivalent for
     rows with no outfit_id. Empty days stay quiet - hairline borders, no heavy
     chrome. Month back/forward, today marked, occasion shown as an .eyebrow label.
   - Mobile first: at 375px a 7-column grid is ~48px per cell, so thumbnails must be
     tiny or collapse to one color dot per item. Design for that width, not desktop.

4. PER-ITEM HISTORY
   - ItemDetailPanel: "Last worn 12 days ago" (or "Not worn yet"), plus a count of
     wears in the last 90 days. This is the line that makes logging feel worthwhile.

5. Do NOT build cost-per-wear, charts, or wardrobe-gap analysis here - those need
   `purchase_price` and belong in their own pass. Just: what was worn, and when.

VERIFY: a script that seeds a spread of wear_log rows across two months (including
one ad-hoc row with no outfit_id, and one referencing a since-deleted outfit) and
prints what the calendar should show; confirm the view matches, then delete the
seeded rows. Browser at 375px and desktop. tsc clean, small commits.
```

---

## Phase 7 — Teach the suggestion what Jenna actually likes

**Goal:** the scoring tables in `suggest-outfit-core.ts` are hand-written guesses.
Let her corrections tune them.

```
Add a feedback loop to the daily suggestion in Jenna's Closet. (Read the "Shared
context" section of docs/enhancements-roadmap-prompts.md first, and note that Phase 3
built the scoring in src/lib/server/suggest-outfit-core.ts.)

The vibe-to-occasion and vibe-to-weather tables there are one person's guess about
what "office" means at 40F. This phase makes them adjust to hers.

1. SCHEMA (schema.sql + supabase/migrations/00N-suggestion-feedback.sql + the SQL)
   - `suggestion_feedback`:
       id uuid primary key default gen_random_uuid(),
       outfit_id uuid references outfits (id) on delete cascade,
       item_ids uuid[] not null default '{}',
       occasion_tag text,
       temperature_band text not null,   -- the bands from weather-bands.ts
       was_wet boolean not null default false,
       verdict text not null check (verdict in ('worn', 'rejected')),
       created_at timestamptz not null default now()
   - Backfill nothing. It starts learning from the next wear.

2. UI
   - "Wore this" writes a 'worn' row alongside its wear_log row.
   - "Show another" already IS a rejection - record a 'rejected' row for the outfit
     being replaced, keyed to the current band + occasion + wetness.
   - Keep it invisible. Do NOT add thumbs up/down: the two existing actions already
     express the preference, and a third control would clutter the card.

3. SCORING
   - `fetchFeedbackBias()` returning a lookup of (outfit_id, occasion, band) to a
     bias in roughly [-0.3, +0.3]. Worn pushes up, rejected pushes down, with
     diminishing returns (e.g. tanh of a weighted count) so three rejections do not
     bury an outfit forever.
   - Add it as a term in scoreOutfit(), passed in as a SEPARATE clearly-named input
     rather than mutating the static tables - the base behaviour must stay
     inspectable, and the whole thing must be switchable off.
   - Cap the bias below the weight of the garment adjustments: a jacket at 30F must
     still outrank "she skipped this once in July".

4. Do NOT build a preferences screen, per-item learning, or anything resembling a
   trained recommender. This is one bias term on an existing score.

VERIFY: extend scripts/check-suggestion.mjs to print scores with and without the bias
for a seeded feedback set, and show that repeated rejections demote an outfit without
eliminating it. Confirm a cold, wet day still prefers a jacket regardless of feedback.
Clean up the seeded rows. tsc clean, small commits.
```

---

## Phase 8 — The morning outfit notification

**Goal:** the app tells her what to wear before she opens it. This is what turns it
into a daily habit rather than something she remembers to check.

```
Add a morning outfit push notification to Jenna's Closet. (Read the "Shared context"
section of docs/enhancements-roadmap-prompts.md first.)

Phase 2 deliberately skipped push. It is viable now because the PWA is installed -
iOS only permits web push for apps added to the home screen (16.4+), which is exactly
what Phase 2 delivered.

This is the largest infrastructure lift in the roadmap. Confirm each external limit
below before building on it, and report what you find rather than assuming it.

1. SCHEMA (schema.sql + supabase/migrations/00N-push.sql + the SQL)
   - `push_subscriptions`: endpoint text primary key, p256dh text not null,
     auth text not null, created_at timestamptz not null default now().
   - `notification_log`: day date primary key, sent_at timestamptz - so a retried
     cron cannot send twice.

2. KEYS AND ENV
   - VAPID keypair via `web-push` (`npx web-push generate-vapid-keys`).
   - New env vars VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT and a
     CRON_SECRET. Add all four to Vercel AND to the env table in docs/DEPLOYMENT.md.
   - The public key must be NEXT_PUBLIC_ prefixed. It is genuinely public, unlike the
     Supabase key - say so in a comment where it is read, so the project's
     "no NEXT_PUBLIC_" rule does not look violated.

3. CLIENT
   - An opt-in in the settings modal, never an interstitial nag. Permission MUST be
     requested from a real tap.
   - Subscribe through the existing service worker registration and POST the
     subscription to a Server Action. Handle already-denied with a plain explanation
     rather than a re-prompt.

4. SERVICE WORKER (public/sw.js)
   - Add `push` and `notificationclick` handlers. Keep the existing rule intact: the
     fetch handler must still only ever intercept GET, because Server Actions are
     POSTs to the same URLs as the pages.
   - notificationclick focuses an open window if there is one, else opens "/".

5. CRON
   - A route handler that checks CRON_SECRET, builds today's suggestion through the
     Phase 3 code path, and sends "38 and raining - wear the Ochre Trench".
   - vercel.json `crons`. CHECK the current Hobby-plan cron limits (how many jobs,
     how often they may run) and report them. If a fixed daily UTC time is the only
     option, pick one that lands early morning for the location in app_settings, and
     note the DST caveat rather than pretending it is solved.
   - Prune subscriptions that return 404 or 410 - that is how browsers report a dead
     subscription.

6. Do NOT add marketing or re-engagement pushes, more than one notification a day, or
   background sync.

VERIFY: subscribe in Chrome, trigger the cron route by hand with the secret, confirm
the notification arrives and that clicking it focuses the app. Confirm a second call
the same day is a no-op via notification_log. Confirm a revoked subscription is
pruned. Real iOS delivery can only be checked on the installed PWA - say plainly that
it is unverified if you cannot test it. tsc clean, small commits.
```

---

## Phase 9 — Accounts

**Goal:** Jenna's mom and sister want closets of their own. One app, three
accounts, each person seeing only their own wardrobe — rather than three
deployments to keep in sync.

**Do this before Phases 4, 6 and 7.** Each of those adds rows to tables that
would then need retrofitting with an owner, and Phase 4 in particular is about
bulk-adding a real wardrobe — far better that it lands in the right account
from the first upload.

```
Add multi-user accounts to Jenna's Closet. (Read the "Shared context" section of
docs/enhancements-roadmap-prompts.md first.)

Today the app is single-user with NO auth. RLS is disabled on every table and
the entire security model is one sentence: the anon key is server-only and never
reaches the browser. Three people sharing one deployment invalidates that. This
phase touches every table, every Server Action, and the Supabase client itself —
read the whole prompt before writing any code.

CONFIRM WITH THE USER FIRST — both answers change the shape of the work:
  a. SIGN-UP POLICY. The site is on a public URL, so open sign-up means any
     stranger can create an account in this Supabase project. Recommended: an
     email allowlist (three addresses in an env var or a small `allowed_emails`
     table), checked in the sign-up action. Alternatives: an invite code, or
     disabling sign-up entirely and creating the three users by hand in the
     Supabase dashboard.
  b. PHOTO PRIVACY. The `item-images` bucket is currently PUBLIC — anyone with
     a URL can view a garment photo, and the paths are the only secret. With
     one user that was fine. Options: (i) keep it public and namespace paths by
     user id — simplest, and the URLs stay usable by the service worker's image
     cache; (ii) make the bucket private and serve signed URLs — properly
     private, but every image URL then expires, which the SW cache and the
     shareable-outfit card (5d) both have to cope with. Recommend (i) unless
     the user says otherwise, and say plainly in your summary that photos
     remain fetchable by URL.

1. AUTH — Supabase Auth, email + password
   - Use `@supabase/ssr` (`createServerClient` with the Next cookie store).
     Do NOT use `@supabase/auth-helpers-nextjs`; it is deprecated.
   - Sign in, sign up and sign out are all SERVER ACTIONS. Doing auth
     server-side means the anon key can stay out of the browser exactly as it
     is today — do not introduce NEXT_PUBLIC_SUPABASE_ANON_KEY. Preserving that
     invariant is a deliberate goal of this phase, not an accident.
   - Add `middleware.ts` for session refresh, per Supabase's App Router guide.
   - Email confirmation adds friction for three known people; suggest turning
     it off in the Supabase dashboard and say so in docs/DEPLOYMENT.md.

2. THE SUPABASE CLIENT — the most dangerous part of this phase
   - `src/lib/supabase/client.ts` exports a MODULE-SCOPED client created once at
     import. With a per-user session attached, a module singleton can leak one
     user's session into another user's request on a warm serverless instance.
     It MUST become a per-request factory, e.g. `getSupabase()` returning a
     client built from the current request's cookies.
   - Update every caller. There are many: the repository, all of
     src/lib/actions/*, and the server modules under src/lib/server/.
   - If any admin/script path needs to bypass RLS, give it a SEPARATE
     service-role client in its own module, never importable from app code.

3. SCHEMA (schema.sql + supabase/migrations/00N-accounts.sql + SQL for the user)
   - Add `user_id uuid not null references auth.users (id) on delete cascade` to
     `items`, `outfits`, `wear_log`, `daily_state`.
   - `outfit_items` gets no user_id — it inherits ownership through outfit_id.
     Its policies go through a subquery on `outfits`.
   - `app_settings` STOPS BEING A SINGLETON. Drop the `id = 'singleton'` check
     and the id column; the primary key becomes user_id. Every read of it in
     src/lib/server/weather.ts assumes one row — all of that changes.
   - `occasion_tags` gets a NULLABLE user_id: null means a seeded tag everyone
     sees, non-null means one someone added. Reads allow `user_id is null or
     user_id = auth.uid()`; inserts force user_id = auth.uid().
   - `weather_cache` deliberately gets NO user_id. It caches public forecast
     data by rounded coordinates and date, so two users in the same town
     sharing a cache entry is a feature, not a leak. Note the one caveat in a
     comment: `location_key` is approximate coordinates, so restrict reads to
     authenticated users, and if that is still too much, hash the key.
   - Index every new user_id column — every query in the app will filter on it.

4. BACKFILL — do not skip, and do not guess
   - Every existing row belongs to Jenna. The migration cannot know her user id
     until she has signed up, so this is a two-step deploy: create the columns
     as NULLABLE, have her sign up, then run a second statement setting user_id
     on all existing rows to her uuid and adding the NOT NULL constraint.
   - Give the user both SQL blocks and say explicitly which to run when.

5. RLS — this is what actually enforces separation
   - `alter table ... enable row level security` on items, outfits,
     outfit_items, wear_log, daily_state, app_settings, occasion_tags. This
     REVERSES the `disable row level security` lines currently in schema.sql —
     update those lines rather than leaving contradictory DDL in the file.
   - Policies for select/insert/update/delete keyed on `user_id = auth.uid()`.
   - Revoke the blanket write grants to `anon`; `authenticated` keeps them.
     An unauthenticated request should see nothing at all.

6. STORAGE
   - Namespace uploads as `<user_id>/<item_id>.<ext>` in item-pipeline.ts.
   - Replace the permissive "item-images full access" policy with one scoped to
     the uploader's own prefix.
   - Existing objects are at the old flat paths and are still referenced by
     `items.image_url` — either move them and update the URLs, or leave them and
     have the policy tolerate both. Whichever you choose, say which.

7. DATA LAYER AND ACTIONS
   - Add a `requireUser()` helper that returns the current user or redirects to
     sign-in, and use it at the top of every Server Action and every repository
     read. Do not rely on RLS alone to scope reads — belt and braces, and it
     gives a real error instead of a silently empty page.
   - src/app/page.tsx redirects to /sign-in when there is no session.

8. UI
   - A sign-in / sign-up page in the app's visual language (see the modals in
     AddItemButton and LocationSettings for the established form styling), and
     a sign-out control in the settings modal.
   - APP_NAME in src/lib/config.ts is the literal string "Jenna's Closet" and is
     rendered as the page heading. With three accounts it has to become
     per-user: keep a neutral product name and derive the heading from the
     signed-in user's display name, collected at sign-up.
   - NOTE THE PWA CONSEQUENCE: src/app/manifest.ts hardcodes name "Jenna's
     Closet" / short_name "Closet". The manifest is static and shared, so an
     installed app on the sister's phone would say Jenna's name. Rename the
     installed app to something neutral. Anyone who already installed it keeps
     the old icon label until they reinstall — iOS snapshots that at install
     time (see Phase 2).

9. SERVICE WORKER
   - public/sw.js caches item photos in `closet-images-v1`. On a shared laptop
     that cache would outlive a sign-out. Clear the image and shell caches on
     sign-out (postMessage to the SW, or `caches.delete` from the sign-out
     handler), and bump the SW VERSION so old caches are dropped on upgrade.

10. SHARED RESOURCES — flag these to the user, do not silently absorb them
   - remove.bg is 50 images/month for the whole PROJECT, not per user. Three
     people building real wardrobes will blow through that immediately. This
     interacts directly with the open Phase 4 decision.
   - The Gemini free tier is per API key per day, also now shared three ways.
   - Supabase free tier: 500MB database, 1GB storage. Three photo wardrobes is
     the first time storage is worth watching.

DO NOT: build sharing, following, or any way to view another person's closet;
add roles or an admin view; implement social login; or write a custom password
reset — use Supabase's built-in flow if one is needed at all.

VERIFY
- Create TWO accounts and prove isolation properly: sign in as A, note an item
  id, then as B attempt to read that row directly through the data layer and
  confirm it comes back empty rather than merely hidden in the UI. Do the same
  for outfits, wear_log and app_settings. A UI that looks right is not evidence.
- Confirm a signed-out request to "/" redirects and returns no data.
- Confirm each account gets its own location and its own daily suggestion.
- Confirm the Phase 3 wear log and occasion tags stay per-user, and that seeded
  occasion tags are visible to everyone.
- Re-run scripts/check-weather.mjs and scripts/check-suggestion.mjs; both use
  the anon key directly and WILL need updating for RLS — decide whether they
  move to the service-role client or take a user session.
- `tsc` clean, `next build` passes. Small commits.
```

---

## Future / bigger integrations (not yet spec'd — sketches only)

Rough scope so they're on the radar. Turn one into a full phase prompt when it's next.

- **Google Calendar** — pairs naturally with Phase 8: the notification becomes
  "you have a 9am review — wear this" instead of a generic morning nudge.
  OAuth (free tier), read tomorrow's events, pre-suggest an
  outfit per event using the Phase 3 suggestion engine (event title/keywords → occasion
  guess). Needs a real OAuth flow and token storage — the first feature that genuinely
  needs per-user auth plumbing.
- **Trip packing** — date range + destination; Open-Meteo forecast for that location
  and range → a capsule packing checklist built from owned items (reuses Phase 1
  geocoding + Phase 3 weather-fit scoring). Output is a saved, checkable list.
- **Wear analytics** — add `purchase_price numeric` to items; from wear_log show
  most/least worn, cost-per-wear, "haven't worn in N months" nudges, and a simple
  "wardrobe gaps" pass (Gemini reviews the closet for missing versatile basics).
  Phase 6 deliberately stops short of this: it shows *what* was worn and when, and
  leaves anything needing a price or a chart to this pass. Do Phase 6 first — the
  data layer it builds is what analytics would query.
- **AI outfit try-on (Prompt 5)** — render outfits on a base photo of Jenna via an
  image model. Heaviest lift; full spec already in docs/wardrobe-app-build-prompts.md
  (Prompt 5). Prototype on an isolated route first.
- **Dark mode** — a dark treatment of the editorial theme; the palette is already
  tokenized in globals.css so it's mostly a second token set + a toggle.
