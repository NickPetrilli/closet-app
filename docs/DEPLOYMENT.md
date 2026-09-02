# Deploying Jenna's Closet to Vercel

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

## 1. Environment variables

Add these in **Vercel → Project → Settings → Environment Variables**, for all
three environments (Production, Preview, Development) unless noted.

| Variable | Value | Notes |
|---|---|---|
| `SUPABASE_URL` | `https://ydxbpgaycpvebsxiolww.supabase.co` | Bare URL — no trailing slash, no `/rest/v1`. |
| `SUPABASE_ANON_KEY` | the anon/public key | Supabase → Project Settings → API. Not `NEXT_PUBLIC_`-prefixed on purpose — it must stay server-only. |
| `REMOVE_BG_API_KEY` | the remove.bg API key | remove.bg → Dashboard → API Key. Free tier = 50 images/month total (shared across local + prod on the same key). |
| `PUPPETEER_SKIP_DOWNLOAD` | `true` | Stops `npm install` from downloading ~200MB of Chromium during the Vercel build. Puppeteer is excluded from the bundle anyway, so the download is pure waste. |

**Do NOT set:**

- `SUPABASE_SERVICE_ROLE_KEY` — the app never uses it at runtime, only local
  one-off scripts do. Keeping it off Vercel limits blast radius.
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
3. Before clicking Deploy, expand **Environment Variables** and add the four
   from section 1.
4. Deploy. Every future push to `main` redeploys production; other branches
   get preview URLs.

## 4. Deploy via CLI (alternative)

```bash
npm i -g vercel
vercel login
vercel link          # link this folder to a Vercel project
vercel env add SUPABASE_URL production
vercel env add SUPABASE_ANON_KEY production
vercel env add REMOVE_BG_API_KEY production
vercel env add PUPPETEER_SKIP_DOWNLOAD production
vercel --prod
```

## 5. Post-deploy check

- [ ] Home page loads with the seeded 20 items / 5 outfits (confirms Supabase
      env vars are right — a blank grid usually means a bad URL or key, or RLS
      got re-enabled on the Supabase dashboard).
- [ ] Add Item modal shows **only** the "Upload a photo" tab — no "Paste a
      link" tab (confirms the `VERCEL` gate works).
- [ ] Upload a photo → item appears with its background removed (confirms
      `REMOVE_BG_API_KEY` and `maxDuration`).
- [ ] Check the build log has no "Downloading Chromium" line (confirms
      `PUPPETEER_SKIP_DOWNLOAD`).

## Notes

- The home page is `force-dynamic`, so it always reflects the live database —
  no stale cache, but also no ISR/CDN caching of the page HTML.
- The 50 images/month remove.bg cap is shared between local dev and the
  deployed site if both use the same key. The 51st call returns a clean
  in-app error, never a charge.
