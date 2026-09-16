# Jenna's Closet — Enhancements Roadmap & Build Prompts

What's left to build, written so each phase can be handed to a fresh Claude Code
session (Opus) on its own. Each prompt is self-contained; start by reading
**Shared context**, which describes the app as it stands today.

**Suggested order from here:** **Phase 4 (garment identification)** is the next
real feature, once the remove.bg question below is settled — the Add Item flow
it builds on now has a preview step, so a batch review fits naturally. Then
**5e (next/image)**, the quickest win left and the biggest saving on a phone.
Then 6 (wear history) → 7 (suggestion feedback), both of which want a few weeks
of real wear data first. Phase 8 (notifications) is the largest lift and can
wait. UI Phase B was **deprioritized on 2026-09-15** — the phone layout is good
enough for now (see `docs/ui-revamp-prompts.md`).

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
| UI Phase A + light/dark | 2026-09-03 | `src/app/globals.css` token layers, `src/lib/theme.ts`, `ThemeToggle.tsx` |
| **9 — Accounts** | 2026-09-15 | `src/lib/auth.ts`, `src/lib/gate.ts`, `middleware.ts`, `src/app/unlock`, `src/app/sign-in`, migrations `003`/`004` |
| Delete an item | 2026-09-15 | `deleteItem` in `actions/items.ts`, confirm dialog in `ItemDetailPanel.tsx` |
| Product links from any shop | 2026-09-15 | `src/lib/server/product-fetch.ts` (was `aritzia-fetch.ts`), `SITE_RULES` |
| Link preview before saving | 2026-09-15 | `previewItemFromUrl` / `addPreviewedItem`, `src/lib/server/product-preview-cache.ts` |
| Category guessing | 2026-09-15 | `src/lib/server/category-guess.ts`, `scripts/check-category-guess.mjs` |
| Local account switcher | 2026-09-15 | `src/app/dev/accounts`, `src/lib/server/dev-accounts.ts` |
| Closet transfer | 2026-09-15 | `scripts/transfer-closet.mjs` |

All of the above is merged and live. Migrations `001`–`004` are applied to the
Supabase project, so **RLS is ON and the anon key is denied** — see Shared
context.

## Open, and not code

- **Decide the remove.bg question.** 40 free calls left this month, 50/month for
  the whole project, now shared by every account. A real wardrobe would exhaust
  it. Options: add a skip-removal fallback, buy credits, or proceed and watch the
  counter. **Phase 4 is blocked on this.**
- **Hand the demo closet to Jenna** when her account exists. It currently belongs
  to the development account; `scripts/transfer-closet.mjs --from <email> --to
  <email>` moves rows and photos in one command (dry run without `--apply`).
- **Old photos sit outside any account's folder.** Items added before accounts
  still display (public URLs), but the app can't overwrite or delete those files,
  so deleting such an item leaves its photo behind.

Settled and NOT to be raised again: the junk outfits stay (deliberate test data),
the phone install test passed, and the "J" app icon is fine — every intended
account holder's name starts with J.

> Companion docs: `docs/PROJECT_PLAN.md` (original vision), `docs/wardrobe-app-build-prompts.md`
> (Prompts 1–6, already built), `docs/DEPLOYMENT.md` (Vercel setup). This file
> supersedes Prompt 4 in the older doc.

---

## Shared context — read before any phase

Paste this block (or point the session at this section) at the top of every phase
prompt. It is current as of 2026-09-15.

```
PROJECT
- "Closet" — a personal wardrobe/outfit app, one closet per account (Jenna, and in
  time her mum and sister). Next.js 15 App Router, TypeScript, Tailwind CSS v4 (no UI
  kit — custom components), deployed to Vercel, auto-deploys from `main`.
- Product name + heading helper: src/lib/config.ts (APP_NAME is the neutral "Closet";
  closetTitle(firstName) makes "Jenna's Closet"). Aesthetic: soft blue editorial —
  Playfair Display headings + Inter body, `.eyebrow` small-caps labels, hairline
  borders, gentle shadows. Match it; do not introduce a new visual language.
- COLOR: src/app/globals.css is a two-layer token system — a raw palette ramp, then
  SEMANTIC tokens which are the only ones components may use: surface/-raised/-sunken,
  ink/-secondary/-tertiary, edge/-subtle/-strong, accent, error, plus radius, elevation
  and motion scales. Light and dark both ship (src/lib/theme.ts + ThemeToggle).
  Never write a hex literal in a component. Each :root block also sets `color-scheme`,
  which is what makes native <select> lists readable in dark mode.
  Run `node scripts/check-contrast.mjs [--theme=dark]` after touching tokens.

BACKEND — Supabase WITH AUTH AND RLS (this changed in Phase 9 — older prompts lie)
- Per-request client: `getSupabase()` in src/lib/supabase/server.ts (@supabase/ssr,
  request cookies). NEVER a module-level client — with a session attached it would leak
  between users on a warm serverless instance. Never import it from a "use client" file.
- ALWAYS enter through `requireUser()` (src/lib/auth.ts) → { supabase, user }. It
  redirects to /sign-in when signed out, and it REDIRECTS BY THROWING, so call it at
  the top of an action, outside any try/catch, or the redirect is swallowed.
- Every read and write filters on `user_id`; RLS enforces the same thing in the
  database (migration 004). The anon key is REVOKED on app tables — a script that needs
  data uses SUPABASE_SERVICE_ROLE_KEY, local only.
- Access gate: a shared SITE_PASSWORD lock screen (/unlock) sits in front of sign-in;
  middleware.ts routes unlock → sign-in → app and refreshes the session.
- New tables still need explicit grants, RLS enabled and owner-only policies — copy the
  shape in supabase/migrations/004-accounts-rls.sql. Put DDL in schema.sql AND a
  numbered migration, and give the user the exact SQL to paste.
- weather_cache deliberately has NO user_id (public forecast data, shared on purpose).
  occasion_tags with a null user_id are the seeded ones everyone sees.

DATA SEAM — do not break it
- UI components never touch Supabase directly. They call src/lib/data/wardrobe-repository.ts
  (fetchItems/fetchOutfits/fetchDailySuggestion/…), which returns the camelCase types in
  src/lib/types.ts. Those functions call requireUser() themselves.
- Mutations are Server Actions in src/lib/actions/* ("use server"), called from client
  components via useActionState/useTransition, returning { error?: string }.

KEY FILES
- src/app/page.tsx — server component; requireUser(), `dynamic = "force-dynamic"`,
  `maxDuration = 60`; passes the per-person title, the account email, canFetchFromLink
  and showAdminLink into <WardrobeView>.
- src/components/WardrobeView.tsx — top-level client component, holds view state,
  renders header + DailySuggestionCard + CategoryTabs + grids + detail panels.
- src/components/AddItemButton.tsx — two modes. Photo upload (works everywhere), and
  a product link which is TWO steps: previewItemFromUrl (fetch + show) then
  addPreviewedItem (save). Background removal runs only on confirmation.
- src/lib/server/product-fetch.ts — opens a shop's page in a real browser window and
  reads schema.org JSON-LD + Open Graph for name and photo. Works on any shop that
  lets a browser in (Aritzia, Nike, Skims, Uniqlo, J.Crew, Gap, Everlane verified);
  SITE_RULES holds optional per-shop refinements. LOCAL ONLY (see CONSTRAINTS).
- src/lib/server/category-guess.ts — pure: schema.org category → breadcrumbs → name,
  last garment word wins. Never guesses dresses/jumpsuits (no drawer for them).
- src/lib/server/item-pipeline.ts — shared add pipeline: HEIC→JPEG → remove.bg →
  sharp trim → average-opaque-pixel color → upload under `<user_id>/` → insert row.
- src/lib/server/weather.ts + weather-core.ts — Open-Meteo, cached per (location,
  local date). `getLocalToday()` is the one source of truth for "today" — never the
  server clock (Vercel is UTC).
- src/lib/server/suggest-outfit.ts + -core.ts — scores saved outfits on vibe↔occasion
  and vibe↔weather plus garment adjustments, excludes recently-worn, asks Gemini only
  when nothing saved clears the bar.
- src/lib/server/gemini.ts — `generateJson(...)`, `isGeminiConfigured()`. ALL Gemini
  calls go through it; it owns the model fallback chain and friendly quota errors.
- src/lib/server/dev-accounts.ts + src/app/dev/accounts — local-only account switcher
  (sign in as any account without a password, for loading someone's closet by link).

ENV VARS (Vercel → Settings → Environment Variables — all environments)
- SUPABASE_URL, SUPABASE_ANON_KEY, REMOVE_BG_API_KEY, GEMINI_API_KEY, SITE_PASSWORD,
  PUPPETEER_SKIP_DOWNLOAD=true. SUPABASE_SERVICE_ROLE_KEY is LOCAL ONLY and must not be
  added to Vercel — the dev switcher's safety depends on its absence there.
  Document any new var in docs/DEPLOYMENT.md's env table. Weather needs none.
- SCRIPTS: `node --experimental-strip-types --import ./scripts/ts-resolve.mjs
  --env-file=.env scripts/<name>.mjs` lets a script import real app modules. Keep new
  logic in a pure module with no network or database so it can be tested that way.
  Existing checks: check-weather, check-suggestion, check-contrast, check-isolation
  (RLS proof), check-product-link, check-category-guess, check-env-shape.

CONSTRAINTS
- Puppeteer / the product-link mode cannot run on Vercel (no display, and bot
  detection targets headless) — local development only. Photo upload works everywhere.
- NO EMAIL CAN BE SENT: Supabase's default sender only reaches project team members,
  and there is no custom SMTP. So: email confirmation is off, and password resets are
  done by hand with scripts/set-password.mjs. Do not design a flow that needs email.
- Prefer no-card, free-tier services. Weather = Open-Meteo. AI = Gemini free tier.
- SHARED ALLOWANCES across all accounts: remove.bg 50 images/month, Gemini per-model
  per-day. Full-wardrobe vision calls are the expensive ones — never loop them in tests.

WORKING STYLE (from the closet-app-working-style memory)
- One thing at a time; verify before moving on. Frontend polish is priority #1.
- Test new pipeline/data logic with a standalone script against real data before
  wiring it into the UI.
- Verify UI in the browser preview: read_page / computed styles / JS measurement
  (screenshots need the pane visible). Test at 375px and desktop.
- US spelling ("color"). No Co-Authored-By trailers in commits here.
- Commit in small logical commits; only commit/push when the user asks.
```

---

## Phase 4 — Real garment identification on photo upload (Prompt 3, revised)

**Goal:** when Jenna uploads her own photos, auto-detect name / category / silhouette
/ color so she isn't typing metadata for every piece. This is what turns the app
from demo data into her real closet.

**Since this prompt was written:** the link mode already fetches, previews and
lets the name and category be corrected before saving (`previewItemFromUrl` →
`addPreviewedItem`), and `src/lib/server/category-guess.ts` guesses a category
from text. Reuse both — the photo flow needs the same preview shape, with Gemini
supplying the name/category instead of a shop's page. Background removal must
stay on the confirm step so a rejected batch spends no remove.bg credits.

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

5. Do NOT: change the product-link mode, the background-removal step, or the
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
shipped; see the table at the top. 5a, item availability, was dropped on
2026-09-15 — the user decided it will not be built.)

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

## Phase 9 — Accounts — SHIPPED 2026-09-15

The prompt has been removed; the architecture it produced is described in
**Shared context** above, and the decisions behind it (email + password, the
shared-password lock screen, no email delivery, photos left in a public bucket
namespaced per user) are recorded in the `closet-app-accounts-decisions` memory.
Migrations `003-accounts.sql` and `004-accounts-rls.sql` are applied;
`node --env-file=.env scripts/check-isolation.mjs` re-proves the separation at
the database level (23 checks) any time it is worth re-checking.

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
