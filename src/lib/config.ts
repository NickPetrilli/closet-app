/**
 * App-wide constants. Rename the app in one place here.
 *
 * APP_NAME is the neutral product name: the installed app, the browser tab,
 * the offline page. Each person's own heading comes from closetTitle() below,
 * since one install can be used by more than one account.
 */
// export const APP_NAME = "Armoire";
export const APP_NAME = "Closet";
export const APP_TAGLINE = "Personal wardrobe";

/**
 * The per-person heading: "Jenna's Closet", or "Your Closet" when the account
 * has no first name on file.
 *
 * Names ending in "s" take a bare apostrophe ("James' Closet") rather than
 * "James's Closet". Both are accepted style; the bare form reads cleaner at
 * display size in the serif heading, and one convention is applied everywhere.
 */
export function closetTitle(firstName: string | null): string {
  const name = firstName?.trim();
  if (!name) return `Your ${APP_NAME}`;
  const possessive = /s$/i.test(name) ? `${name}'` : `${name}'s`;
  return `${possessive} ${APP_NAME}`;
}
