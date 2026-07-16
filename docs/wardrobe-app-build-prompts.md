# Wardrobe App — Claude Code Build Prompts

Build order. Run these roughly in sequence — each assumes the previous pass exists in the repo. Attach the noted screenshot(s) with any prompt marked **[attach screenshot]**.

Stack recap: Next.js (App Router) + TypeScript + Tailwind, Supabase (Postgres + Auth + Storage), Claude API for garment ID/dedup, `rembg` for background removal, image-gen model (gpt-image or Gemini image gen, TBD after prototyping) for virtual try-on, OpenWeather for weather.

---

## Prompt 1 — UI scaffold (mock data only) **[attach screenshot]**

```
Build the frontend scaffold for a personal wardrobe/outfit web app called [APP NAME]. This is a UI-only pass — no backend, no database, no real auth. Use in-memory mock data for now; structure the code so a real API can be swapped in later without major rework.

STACK
- Next.js (App Router), TypeScript, Tailwind CSS
- No external UI kit — build custom components styled with Tailwind
- Client-side state only (useState/useReducer) for this pass

AESTHETIC
Warm, editorial, minimal — think warm gray/taupe backgrounds, cream accents, generous whitespace, small-caps uppercase labels with letter-spacing, thin borders, no heavy shadows or rounded-pill buttons. This should feel like a personal, curated space, not a generic SaaS dashboard. Typography: clean sans-serif for UI labels, slightly larger serif or refined sans for headings/item names.

PAGES / VIEWS

1. Wardrobe grid (main view)
   - Header showing item count (e.g. "20 PIECES")
   - Horizontal category filter tabs: All, Tops, Jackets, Bottoms, Accessories, Shoes, Outfits — active tab has solid dark background, inactive tabs are outlined
   - Responsive grid of clothing item cards below the tabs, ~4 columns on desktop
   - Each card: square image on a soft neutral background, subtle hover state, click opens the detail panel
   - Filtering by category updates the grid client-side against the mock data array

2. Item detail panel (see attached screenshot for exact reference)
   - Slides in / overlays from the right side (not a full page nav) — wardrobe grid stays visible/dimmed behind it
   - Close (X) button top-right
   - Item name as the panel title, editable text label at the top
   - Hero image area: large rendered image of the item (mock: on a placeholder model) plus a smaller isolated cutout image beside it
   - Row of small source-photo thumbnails below the hero images (mock 1-2 placeholder thumbnails), clickable to swap which is shown as "active" (just visual state for now, no real logic needed)
   - Form fields below:
     - Name (text input)
     - Category (dropdown, options matching the filter tabs)
     - Primary color: swatch + hex code text, label "SELECTED"
     - A row of ~5 additional color swatches labeled "Image suggestions — Click to apply" that update the primary color swatch/hex when clicked
     - A "Pick primary color from image" button (no real image-picking logic needed yet — just wire the click handler as a stub)
     - Secondary color section: swatch/hex if set, otherwise "No distinct secondary color detected" text + "Add secondary color" button
   - Small helper text at the bottom explaining where colors come from

3. Daily suggestion card (simple placeholder for now)
   - A card near the top of the wardrobe view (or a separate small section) showing a mock "today's suggestion": weather icon + temp placeholder, occasion tag (e.g. "Work"), and a small row of 2-3 item thumbnails representing the suggested outfit
   - Static/mock data is fine — no real weather or scheduling logic yet

MOCK DATA
Create a mock-data file with ~16-20 clothing items across all categories (tops, jackets, bottoms, accessories, shoes), each with: id, name, category, primaryColorHex, secondaryColorHex (nullable), imageUrl (use solid-color placeholder divs or a placeholder image service — no real photos yet), sourcePhotoUrls (1-2 placeholder entries).

STRUCTURE
Organize components sensibly for future backend integration: separate the data layer (currently mock, later API) from the UI components, so item-fetching can later be swapped for real API/DB calls without touching the grid/detail-panel components themselves.

Do not implement: authentication, image upload, AI color extraction, AI outfit rendering, or real weather/calendar data. Those come in later passes. Focus entirely on getting the grid, detail panel, and layout/interactions right first.
```

---

## Prompt 2 — Supabase setup (DB, Auth, Storage)

```
Wire up Supabase for [APP NAME] (existing Next.js repo from the UI scaffold pass). This pass is backend plumbing only — do not change the existing UI components' visual output, only replace their mock data source with real data.

1. Add Supabase client setup (server + browser clients per Next.js App Router best practices).

2. Create the database schema (Postgres, via Supabase migration):
   - `items`: id, user_id, name, category, primary_color_hex, secondary_color_hex (nullable), image_url, cutout_image_url, source_photo_urls (text[]), created_at
   - `outfits`: id, user_id, name (nullable), item_ids (uuid[] or join table — prefer a join table `outfit_items` for flexibility), created_at
   - `outfit_items`: outfit_id, item_id
   - `wear_log`: id, user_id, outfit_id (nullable), item_id (nullable), worn_on (date), occasion_tag (text, nullable)
   - `day_tags`: simple lookup/enum table or just a text field on wear_log for occasion tags (e.g. Work, Gym, Date, Lazy Day) — she should be able to add custom ones later, so don't hardcode as a DB enum, use a text column with a suggested-values list in the app layer

3. Set up Row Level Security so a user can only read/write their own rows (user_id = auth.uid()).

4. Add Supabase Auth: simple email/password login, no social auth needed for v1. One login page. Since this is a single-primary-user app, keep the auth flow minimal — no public signup page, just a login form (account can be created directly in Supabase dashboard).

5. Set up two Supabase Storage buckets: `item-images` (processed/cutout images) and `source-photos` (original uploads), both private, accessed via signed URLs.

6. Replace the mock data layer from the previous pass with real Supabase queries, keeping the same data-fetching interface/shape the UI components already expect so the components themselves don't need to change.

Do not implement image upload UI, AI processing, or outfit rendering yet — this pass is schema + auth + swapping mock data for real (even if the tables start empty).
```

---

## Prompt 3 — Photo upload + garment extraction pipeline

```
Build the photo upload and garment extraction pipeline for [APP NAME] (existing Next.js + Supabase repo).

FLOW
1. Upload UI: an "Add item" button on the wardrobe grid opens an upload flow. Support both camera capture (mobile) and multi-file select (batch upload of existing photos). Show upload progress and a processing state per photo.

2. On upload, each photo:
   a. Saves to the `source-photos` Supabase Storage bucket
   b. Triggers a server-side processing job (Next.js API route is fine for now, no separate queue needed yet) that:
      - Calls the Claude API (vision) with the photo, asking it to identify distinct clothing items visible and return structured JSON: category, descriptive name, primary color hex estimate, notable identifying details (pattern, hardware, logos, construction details) — this last field matters for dedup in the next pass
      - For each identified item, crops/isolates it (send the crop region to a background-removal step — call out to `rembg` if self-hosted, or an equivalent background-removal API) to produce a transparent PNG
      - Saves the cutout PNG to the `item-images` bucket
   c. Runs a dedup check against her existing items: before inserting a new `items` row, call Claude again with the new item's identifying details plus the identifying details of existing items in the same category, and ask it to judge whether this is the same physical item as one already in the wardrobe (matching construction, pattern, hardware, logos, color/material — not just visual similarity from cropping). If it's a likely duplicate, do not insert a new row; instead, optionally attach the new source photo to the existing item's source_photo_urls.
   d. If it's a new item, insert a new `items` row with the extracted metadata and image URLs.

3. Show processing results to her: after a batch upload finishes, show a review screen listing what was found (new items added, duplicates merged into existing items) before finalizing, so she can correct misidentified categories/colors before they save.

Handle the case where a photo doesn't clearly show a full garment (blurry, partial, not clothing) — skip it and note it as skipped rather than failing the whole batch.

Do not implement outfit rendering or daily suggestions yet.
```

---

## Prompt 4 — Daily outfit suggestions (weather + occasion)

```
Build the daily outfit suggestion feature for [APP NAME].

1. Weather: integrate OpenWeather API (or similar) using her saved location (add a simple location field to a settings/profile area if one doesn't exist yet). Cache the day's weather so it's not refetched on every page load.

2. Occasion tagging: let her set an occasion tag for today (e.g. Work, Gym, Date, Lazy Day, Travel) from a simple selector — use the `wear_log`/occasion_tag pattern from the DB schema. Let her add custom tags, don't hardcode a fixed list in the UI.

3. Suggestion logic: given today's weather, her chosen occasion, and her wardrobe items, call the Claude API with:
   - weather conditions (temp, precipitation, wind)
   - occasion tag
   - her available items (id, category, color, name) — exclude anything logged as worn in the last N days (configurable, default ~5) to encourage rotation
   - ask for 1-3 coherent outfit suggestions (item id combinations) with a short one-line rationale for each

4. Display: the suggestion card on the wardrobe home view (already scaffolded) now shows real suggestions — weather icon/temp, occasion tag, thumbnail row of the suggested combination, and the rationale text. Let her tap a suggestion to log it as worn (writes to wear_log) or dismiss and request a different suggestion.

Do not implement the AI-rendered virtual try-on yet — suggestions display as a row of item thumbnails, not a rendered outfit on her photo. That's the next pass.
```

---

## Prompt 5 — AI-rendered outfit try-on

```
Build the virtual try-on rendering feature for [APP NAME].

1. Base photo setup: add a settings section where she uploads 1-3 "base" photos of herself (front-facing, consistent lighting recommended — show a short tip explaining this). Store in Supabase Storage.

2. Render flow: from any outfit (a saved outfit, a daily suggestion, or an ad-hoc selection of items from the grid), add a "Render on me" action. This calls [CHOSEN IMAGE MODEL — gpt-image or Gemini image gen, finalize after prototyping] with her base photo and the selected item cutout images, asking it to composite the garments onto her photo while preserving her face, body proportions, and pose.

3. Caching: store the rendered result keyed by (base_photo_id + sorted item_ids) so identical combinations aren't re-rendered. Show a loading state during generation (this call will be slow, several seconds).

4. Display: rendered image shown full-size with an option to save it to a "lookbook" / favorites view, and to compare against the flat item-thumbnail view.

Before wiring this into the full UI, first build a small isolated test route that takes a base photo + item image(s) and shows the raw model output, so the model/prompt can be evaluated against her actual photos before committing to the approach.
```

---

## Notes for later (not yet prompts)
- Native app pass (Expo/React Native) once web version is stable
- Consider a lightweight job queue (Inngest) if photo processing ever feels slow inline
- Decide render caching strategy (on-demand vs. pre-generate) once Prompt 5 is in and you've seen real latency/cost
