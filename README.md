# Jenna's Closet

A personal wardrobe app. Photograph what you own, and it tells you what to wear
today — based on the real weather where you are and what you're actually doing.

Live at **[jennascloset.vercel.app](https://jennascloset.vercel.app)**.

## What it does

- **Your closet** — add a piece by photo. The background is removed
  automatically, the dominant color extracted, and the item filed by category.
- **Outfits** — build them by hand, or let Gemini put looks together from the
  pieces you own. Any outfit can be renamed, edited or deleted.
- **Today's suggestion** — real conditions for your saved location, plus the
  occasion you pick (work, gym, date…). It scores your *own* saved outfits on
  how well they suit the weather and the occasion, skips anything you've worn in
  the last five days, and only asks the AI to compose something new when nothing
  you own fits. Most days cost no API calls at all.
- **Wear log** — "Wore this" records the outfit, which is what keeps the next
  few days' suggestions from repeating themselves.
- **Search and sort** — by name, category, silhouette, or color word
  ("navy" finds the denim).
- **Installable** — add it to your phone's home screen and it runs fullscreen,
  with a branded offline page instead of the browser's error.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres +
storage) · deployed on Vercel.

Three external services, all free tier and none requiring a card:

| Service | Used for | Limit |
| --- | --- | --- |
| [Open-Meteo](https://open-meteo.com) | Weather and geocoding | No API key at all |
| [Google Gemini](https://aistudio.google.com) | Outfit generation | Per model, per day |
| [remove.bg](https://remove.bg) | Background removal on upload | 50 images/month |

## Getting started

Requires **Node 22+** (the verification scripts use native TypeScript stripping)
and a Supabase project.

```bash
git clone https://github.com/NickPetrilli/closet-app.git
cd closet-app
npm install
cp .env.local.example .env    # then fill in the values
npm run dev
```

`.env.local.example` documents every variable and where to find it. In short:
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `REMOVE_BG_API_KEY` and `GEMINI_API_KEY`
are needed to run the app; `SUPABASE_SERVICE_ROLE_KEY` is only used by local
scripts.

None of these are `NEXT_PUBLIC_`-prefixed, on purpose — see
[Security model](#security-model).

## Database

The app talks to Supabase with the anon key, which **cannot run DDL**, so
schema changes are applied by hand in the Supabase dashboard
(**SQL Editor → New query → Run**):

- **New project?** Run `supabase/schema.sql` once. It creates every table, the
  storage bucket, and the grants.
- **Existing project?** Run the files in `supabase/migrations/` in order.

`schema.sql` is always the full from-scratch schema; the migration files are the
deltas between releases. New reads are written to degrade gracefully rather than
throw, so a deploy that lands before its migration doesn't take the site down.

## How it's organized

| Path | What lives there |
| --- | --- |
| `src/app/` | Routes. `page.tsx` is `force-dynamic` so the page always reflects the live database. |
| `src/components/` | Client components — the grid, detail panels, and modals. |
| `src/lib/data/wardrobe-repository.ts` | Every UI-facing read. Returns the camelCase types from `src/lib/types.ts`. |
| `src/lib/actions/` | Server Actions. Every mutation goes through one. |
| `src/lib/server/` | Server-only logic: weather, outfit suggestion, Gemini, and the image pipeline. |
| `supabase/` | `schema.sql` and the numbered migrations. |
| `scripts/` | One-off checks and data utilities. |

Two rules hold the shape together: **components never import Supabase
directly** — they call the repository or a Server Action — and anything with a
`-core` suffix is pure logic with no network or database, so a script can test
it against real data.

```bash
# Geocode a place, fetch its forecast, exercise the weather cache
node --experimental-strip-types --import ./scripts/ts-resolve.mjs --env-file=.env scripts/check-weather.mjs "Boston, MA"

# Score the real saved outfits against synthetic weather and occasions
node --experimental-strip-types --import ./scripts/ts-resolve.mjs --env-file=.env scripts/check-suggestion.mjs
```

## Security model

There is no authentication yet — this is a single-user app, and its entire
security boundary is that **the Supabase key is server-only and never reaches
the browser**. That's why no environment variable is `NEXT_PUBLIC_`-prefixed and
why `src/lib/supabase/client.ts` must only ever be imported from server code.

Row Level Security is correspondingly off. Adding accounts (so more than one
person can use it) means turning RLS on and reworking that boundary — it's
specced as Phase 9 in the roadmap below.

## Known constraints

- **Adding items by Aritzia link only works locally.** It drives a real,
  non-headless browser via Puppeteer, because the site blocks both plain server
  fetches and headless browsers. That tab is hidden on the deployed site; photo
  upload works everywhere.
- **remove.bg is 50 images/month for the whole project.** The 51st upload
  returns a clean in-app error until the month resets — never a charge.
- **Gemini's free quota is per model, per day.** Generating outfits for a full
  wardrobe is the expensive call; the daily suggestion is text-only and cheap.

## Docs

| | |
| --- | --- |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Vercel setup, environment variables, migrations, post-deploy checks |
| [`docs/enhancements-roadmap-prompts.md`](docs/enhancements-roadmap-prompts.md) | Current status and the build prompt for every planned phase |
| [`docs/PROJECT_PLAN.md`](docs/PROJECT_PLAN.md) | The original vision |
| [`docs/wardrobe-app-build-prompts.md`](docs/wardrobe-app-build-prompts.md) | How the first version was built |
