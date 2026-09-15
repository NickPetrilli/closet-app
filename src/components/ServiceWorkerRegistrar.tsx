"use client";

import { useEffect } from "react";

/**
 * Registers the service worker, production only. In dev it would cache the
 * dev server's assets and make edits look like they hadn't applied, which is
 * a worse debugging experience than having no offline support locally.
 *
 * A worker registered by an earlier production build can still be installed
 * even in dev, which is why sign-out's cache clearing below doesn't check
 * NODE_ENV.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.warn("Service worker registration failed", err));
    };

    // Wait for load so registration never competes with the first paint.
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}

/** How long sign-out waits for the worker to confirm before moving on. */
const CLEAR_CACHES_TIMEOUT_MS = 1500;

/**
 * Wipes everything the service worker has cached (item photos above all), so
 * the next person signed in on this device starts clean. Called by sign-out.
 *
 * Asks the worker first, since it re-precaches the offline page afterwards.
 * If there's no worker (dev, the Browser pane, a first visit, an old v1 worker
 * with no message listener) or it doesn't answer within a moment, the page
 * deletes the caches itself. Never throws, and never waits long: sign-out must
 * not hang on housekeeping.
 */
export async function clearServiceWorkerCaches(): Promise<void> {
  let confirmed = false;
  try {
    confirmed = await askWorkerToClear();
  } catch {
    // fall through to the direct delete
  }
  if (confirmed) return;

  try {
    if (typeof caches === "undefined") return;
    const names = await caches.keys();
    // Same prefix as CACHE_PREFIX in public/sw.js.
    await Promise.all(
      names.filter((n) => n.startsWith("closet-")).map((n) => caches.delete(n))
    );
  } catch {
    // Cache Storage can be unavailable (private modes, blocked storage).
  }
}

async function askWorkerToClear(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;

  const worker =
    navigator.serviceWorker.controller ??
    (await navigator.serviceWorker.getRegistration())?.active ??
    null;
  if (!worker) return false;

  return new Promise<boolean>((resolve) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => {
      channel.port1.close();
      resolve(false);
    }, CLEAR_CACHES_TIMEOUT_MS);

    channel.port1.onmessage = (event: MessageEvent) => {
      clearTimeout(timer);
      channel.port1.close();
      resolve(event.data?.type === "caches-cleared" && event.data.ok === true);
    };

    worker.postMessage({ type: "clear-caches" }, [channel.port2]);
  });
}
