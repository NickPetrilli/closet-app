/**
 * Light/dark theme selection.
 *
 * A theme is only ever a palette swap — see the palette blocks in
 * src/app/globals.css. Nothing here knows about a single component.
 */

export type Theme = "light" | "dark";

/** Where the choice is remembered. Also referenced inside THEME_INIT_SCRIPT. */
export const THEME_STORAGE_KEY = "closet-theme";

/** Status-bar / browser-chrome color per theme: --color-surface resolved. */
export const THEME_COLORS: Record<Theme, string> = {
  light: "#edf3fa",
  dark: "#111c27",
};

/**
 * Runs in <head>, before the browser paints anything.
 *
 * Without this the document renders with the default palette and then snaps to
 * the saved one once React hydrates — a white flash on every load for anyone
 * using dark mode, which is exactly when it is most unpleasant.
 *
 * It resolves an explicit theme (stored choice, else the OS preference) and
 * stamps it on <html>, so the stylesheet only needs to handle
 * :root[data-theme="dark"] rather than duplicating the palette behind a
 * prefers-color-scheme media query.
 *
 * Written as a string because it must be inlined, and kept deliberately small
 * and total: any throw here would block first paint, so the whole thing is
 * wrapped and falls back to light. Storage access alone can throw when site
 * data is blocked.
 */
export const THEME_INIT_SCRIPT = `(function(){try{
var s=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
var t=(s==="light"||s==="dark")?s:(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");
document.documentElement.setAttribute("data-theme",t);
var m=document.querySelector('meta[name="theme-color"]');
if(m)m.setAttribute("content",t==="dark"?${JSON.stringify(THEME_COLORS.dark)}:${JSON.stringify(THEME_COLORS.light)});
}catch(e){document.documentElement.setAttribute("data-theme","light");}})();`;
