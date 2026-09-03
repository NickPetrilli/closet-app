/*
 * Jenna's Closet — service worker.
 *
 * Hand-written rather than generated (Serwist/next-pwa): what this app needs
 * is installability plus a branded offline page, and the build-time precache
 * manifest those tools exist to produce buys little here — Next's static
 * chunks are content-hashed, so caching them on first use is equivalent and
 * keeps `next build` free of an extra generation step.
 *
 * The rule that matters most: only GET is ever intercepted. Server Actions
 * (Add Item, Generate Outfits, saving a location) are POSTs to the same URLs
 * as the pages, and caching or replaying one of those would be a real bug.
 *
 * Bump VERSION to retire every old cache on the next activation.
 */

const VERSION = "v1";
const SHELL_CACHE = `closet-shell-${VERSION}`;
const ASSET_CACHE = `closet-assets-${VERSION}`;
const IMAGE_CACHE = `closet-images-${VERSION}`;

const OFFLINE_URL = "/offline";

/** The bare minimum needed to render something branded with no network. */
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
];

/** How long a navigation waits for the network before falling back. */
const NAVIGATION_TIMEOUT_MS = 3500;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      // A failed precache must not leave the app with no service worker at
      // all — the runtime caching below still works without it.
      .catch((err) => console.warn("[sw] precache failed", err))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  const keep = new Set([SHELL_CACHE, ASSET_CACHE, IMAGE_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((n) => !keep.has(n)).map((n) => caches.delete(n)))
      )
      .then(() => self.clients.claim())
  );
});

/** Only ever store real, complete, same-origin-or-CORS responses. */
function isCacheable(response) {
  return Boolean(response) && response.status === 200 && response.type !== "opaque";
}

/**
 * Item photos are cross-origin <img> loads, so they arrive opaque: type
 * "opaque", status 0, headers unreadable. Refusing those (as isCacheable
 * does) would mean the image cache never fills at all, so opaque is allowed
 * here specifically. The trade-off is that a failed image caches
 * indistinguishably from a good one — acceptable for photos, which is why
 * this stays scoped to the image cache and never to the app shell.
 */
function isCacheableImage(response) {
  return Boolean(response) && (response.status === 200 || response.type === "opaque");
}

/** Immutable, content-hashed assets: serve from cache, fetch once. */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (isCacheable(response)) cache.put(request, response.clone());
  return response;
}

/** Item photos: show the stored copy instantly, refresh it in the background. */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then((response) => {
      if (isCacheableImage(response)) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached ?? (await network) ?? Response.error();
}

/**
 * Page loads: prefer the network so the force-dynamic page stays live, but
 * don't let a dead connection hang — fall back to the offline page instead of
 * the browser's error page.
 */
async function navigationWithOfflineFallback(request) {
  try {
    const response = await Promise.race([
      fetch(request),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), NAVIGATION_TIMEOUT_MS)
      ),
    ]);
    if (response) return response;
  } catch {
    // fall through
  }

  const cache = await caches.open(SHELL_CACHE);
  const offline = await cache.match(OFFLINE_URL);
  return (
    offline ??
    new Response("You're offline.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Server Actions and any other mutation: never touch them.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // React Server Component payloads for client-side navigation — always live,
  // or the app would render yesterday's wardrobe from cache.
  if (url.searchParams.has("_rsc")) return;

  if (request.mode === "navigate") {
    event.respondWith(navigationWithOfflineFallback(request));
    return;
  }

  const sameOrigin = url.origin === self.location.origin;

  if (sameOrigin && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  if (sameOrigin && url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // Supabase's public storage CDN — item photos and cutouts. Matched by path
  // rather than host so the project reference isn't baked into this file.
  if (url.pathname.includes("/storage/v1/object/public/")) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
    return;
  }

  // Everything else (Next data routes, the API, third parties) goes straight
  // to the network.
});
