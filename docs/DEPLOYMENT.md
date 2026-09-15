# Deploying Closet to Vercel

The app is a standard Next.js 15 App Router project and deploys to Vercel
**zero-config** — no `vercel.json` is needed. The two deployment constraints
this project has (Puppeteer can't run on Vercel; the Aritzia link-fetch mode
needs a real local browser) are already handled in code:

- `next.config.ts` → `outputFileTracingExcludes` keeps Puppeteer out of the
  serverless bundle.
- `src/app/page.tsx` → `canFetchFromLink={!process.env.VERCEL}` hides the
  link-fetch tab on the deployed site. Photo upload works everywhere because
  background removal runs via the remove.bg API, not a local model.
- `src/app/page.tsx` → `export const maxDuration = 60` gives the Add Item
  server action enough time (remove.bg round-trip + image processing + two
  Supabase uploads) instead of the default 10s cap.

Access model: a family-code lock screen comes first, then Supabase Auth
(email + password). Every account has its own closet, enforced by Row Level
Security in the database (see `supabase/schema.sql`), not just by the app.

## 1. Environment variables

Add these in **Vercel → Project → Settings → Environment Variables**, for all
three environments (Production, Preview, Development) unless noted.

| Variable | Value | Notes |
|---|---|---|
| `SUPABASE_URL` | `https://ydxbpgaycpvebsxiolww.supabase.co` | Bare URL — no trailing slash, no `/rest/v1`. |
| `SUPABASE_ANON_KEY` | the anon/public key | Supabase → Project Settings → API. The app pairs it with the signed-in user's session; on its own it can't read any table. Not `NEXT_PUBLIC_`-prefixed: it's only read server-side. |
| `FAMILY_CODE` | a phrase you choose | The code typed on the lock screen before anyone can sign in or create an account. Matched ignoring case and surrounding spaces. It keeps strangers from making accounts (and using up the shared remove.bg/Gemini quotas); RLS is what keeps closets private. **Changing it** re-locks every device that isn't signed in, and **never** signs anyone out. If it's missing, the lock screen lets nobody in. |
| `REMOVE_BG_API_KEY` | the remove.bg API key | remove.bg → Dashboard → API Key. Free tier = 50 images/month total (shared across local + prod on the same key, and across every account). |
| `GEMINI_API_KEY` | the Gemini API key | Google AI Studio → API keys. Powers Generate Outfits (`src/lib/server/generate-outfits.ts`). Free tier; quota is per-model per-day and resets at midnight Pacific. |
| `PUPPETEER_SKIP_DOWNLOAD` | `true` | Stops `npm install` from downloading ~200MB of Chromium during the Vercel build. Puppeteer is excluded from the bundle anyway, so the download is pure waste. |

Weather needs **no** environment variable — Open-Meteo requires no key, no
signup and no card.

**Do NOT set:**

- `SUPABASE_SERVICE_ROLE_KEY` — it bypasses RLS entirely. The app never uses it
  at runtime; only local one-off scripts do. Keeping it off Vercel limits
  blast radius.
- `VERCEL` — Vercel sets this automatically; that's what the link-fetch gate
  keys off.

The exact values (except keys you rotate) are in the local `.env` file.

## 2. Project settings

Vercel auto-detects everything from `package.json`; defaults are correct:

| Setting | Value |
|---|---|
| Framework Preset | Next.js |
| Build Command | `next build` (default) |
| Install Command | `npm install` (default) |
| Output Directory | `.next` (default) |
| Root Directory | `./` |
| Node.js Version | 20.x or 22.x (either works with Next 15) |

## 3. Deploy via GitHub (recommended)

1. Push `main` to `github.com/NickPetrilli/closet-app` (already the remote).
2. Go to <https://vercel.com/new>, import **NickPetrilli/closet-app**.
3. Before clicking Deploy, expand **Environment Variables** and add the ones
   from section 1.
4. Deploy. Every future push to `main` redeploys production; other branches
   get preview URLs.

## 3a. Database migrations

The app talks to Supabase as the signed-in user, which can't run DDL — schema
changes are applied by hand. When a release needs one, run the matching file
from `supabase/migrations/` in **Supabase → SQL Editor → New query → Run**,
at the point the table's notes say. `supabase/schema.sql` stays the full
from-scratch schema (the state after every migration); the migration files
are the deltas.

| Migration | Adds | When to run |
|---|---|---|
| `001-weather.sql` | `app_settings`, `weather_cache` | Before deploying weather. |
| `002-wear-log.sql` | `wear_log`, `occasion_tags`, `daily_state` | Before deploying occasions + the wear log. |
| `003-accounts.sql` | `user_id` owner columns + indexes (additive only) | **Before** deploying accounts. Harmless to the old site. |
| `004-accounts-rls.sql` | Hands existing rows to Jenna, tightens keys, turns on RLS, locks out anon, per-user storage folders | **After** Jenna has created her account. See section 3b. |

## 3b. Accounts rollout (one time)

Do these in order. Steps 1–3 don't change anything anyone can see; the site
keeps working the old way until the deploy in step 4.

1. **Run `supabase/migrations/003-accounts.sql`** in the SQL Editor. It only
   adds nullable columns and indexes, so the live no-auth site is unaffected.
2. **Configure email sign-in** — Supabase → **Authentication → Sign In /
   Providers → Email**:
   - Turn **OFF "Confirm email"**. The app can't send email, so with it on,
     nobody could finish signing up.
   - Leave **Minimum password length** at its default of **6**. The app's
     own rule (`MIN_PASSWORD_LENGTH` in `src/lib/auth-rules.ts`) matches it;
     if you ever change one, change the other.
   - Save.
3. **Add `FAMILY_CODE`** in Vercel (all three environments) and to the local
   `.env`. `node --env-file=.env scripts/check-env-shape.mjs` confirms the
   local one is set, without printing it.
4. **Merge and push** the accounts branch to `main` (or deploy it) — this is
   the moment the lock screen and sign-in appear.
5. **Wait for the deploy to go live**, then have **Jenna create her account**
   on the live site: family code → Create account → first name, email,
   password. Her closet will look empty at first; that's expected, because
   the existing rows don't belong to anyone yet. Ask her not to add or change
   anything until step 6 is done.
6. **Run `supabase/migrations/004-accounts-rls.sql`** right away. First edit
   the single marked line near the top so it holds the email she signed up
   with. The script is one transaction: if the email isn't found it stops
   with a clear message and changes nothing. If the editor then complains
   that the transaction is aborted, run `rollback;` on its own, fix the email,
   and run the script again.
7. **Verify** (as Jenna, on her phone or yours):
   - [ ] Her full closet is back: all items, outfits, the wear log and her
         location on the daily card.
   - [ ] Adding a photo works (it uploads under her `<user_id>/` folder).
   - [ ] Signing out lands on the sign-in page; signing back in restores
         everything.
   - [ ] A second, test account sees an **empty** closet and none of Jenna's
         items. Delete the test account afterwards (Authentication → Users);
         its rows go with it. Photos it uploaded stay in Storage under its
         `<user_id>/` folder; if Supabase refuses to delete a user who owns
         storage objects, delete that folder in Storage first.
   - [ ] `node --env-file=.env scripts/verify-connection.mjs` shows the anon
         key **denied** and the service_role key reading every item.

If the rollout has to be undone, the bottom of `004-accounts-rls.sql` has a
commented-out ROLLBACK block that restores the no-auth access setup for the
old code; read its notes first.

### Transition notes

- Between steps 4 and 6, new code is live but the old rows are unowned. A
  day's occasion chosen during that window may fail to save (the old
  one-row-per-day key is still in place); it's harmless and goes away with
  step 6.
- Old photos stay at their original flat paths in the public bucket. They
  keep displaying forever (public URLs don't go through storage policies), but
  the app can't overwrite or delete them. Local scripts using the
  service_role key still can.

## 3c. Forgotten passwords

No email can be sent, so there is no "Forgot password?" link. An admin sets a
new password by hand and tells the person directly.

- **From the dashboard:** Supabase → **Authentication → Users** → select the
  user. The actions there have changed over time; if one lets you set a
  password directly, use it. Avoid "Send password recovery" and "Send magic
  link" — they rely on email, which this project doesn't send. (This was
  written without access to the current dashboard, so check what's on offer.)
- **Reliable route, from this repo:** the Auth admin API, via a local script
  using the service_role key:

  ```bash
  node --env-file=.env scripts/set-password.mjs jenna@example.com newpassword
  ```

  Supabase's own minimum password length applies here too.

## 4. Deploy via CLI (alternative)

```bash
npm i -g vercel
vercel login
vercel link          # link this folder to a Vercel project
vercel env add SUPABASE_URL production
vercel env add SUPABASE_ANON_KEY production
vercel env add FAMILY_CODE production
vercel env add REMOVE_BG_API_KEY production
vercel env add GEMINI_API_KEY production
vercel env add PUPPETEER_SKIP_DOWNLOAD production
vercel --prod
```

## 5. Post-deploy check

- [ ] Opening the site in a private window shows the **lock screen**; the right
      family code leads to sign-in (confirms `FAMILY_CODE`).
- [ ] Signed in, the home page shows that account's items and outfits
      (confirms the Supabase env vars and RLS policies — a blank closet for
      an account that has items usually means a bad URL/key, or that
      `004-accounts-rls.sql` hasn't run and the rows have no owner yet).
- [ ] Add Item modal shows **only** the "Upload a photo" tab — no "Paste a
      link" tab (confirms the `VERCEL` gate works).
- [ ] Upload a photo → item appears with its background removed (confirms
      `REMOVE_BG_API_KEY`, `maxDuration` and the per-user storage policies).
- [ ] Check the build log has no "Downloading Chromium" line (confirms
      `PUPPETEER_SKIP_DOWNLOAD`).
- [ ] Daily card shows real weather after setting a location via the gear icon
      (confirms `001-weather.sql` ran — an unset card just offers "Set location").
- [ ] DevTools → Application: manifest parses, `/sw.js` is activated, and the
      install option appears. The service worker only registers in production,
      so this is deploy-only — `next dev` never registers one.

## Notes

- The home page is `force-dynamic`, so it always reflects the live database —
  no stale cache, but also no ISR/CDN caching of the page HTML.
- The 50 images/month remove.bg cap is shared between local dev and the
  deployed site if both use the same key, and across every account. The 51st
  call returns a clean in-app error, never a charge.
- RLS is meant to be ON now. If the Supabase dashboard ever offers to change
  RLS on these tables, leave it on; the app relies on it for privacy.
