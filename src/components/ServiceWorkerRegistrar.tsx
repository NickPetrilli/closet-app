"use client";

import { useEffect } from "react";

/**
 * Registers the service worker, production only. In dev it would cache the
 * dev server's assets and make edits look like they hadn't applied, which is
 * a worse debugging experience than having no offline support locally.
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
