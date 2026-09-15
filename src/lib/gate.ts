/**
 * The family-code lock screen that sits in front of sign-in and sign-up.
 *
 * Entering the code sets a cookie holding an HMAC of the code, not the code
 * itself. The cookie therefore proves its holder knew the code, can't be
 * forged without the code, and stops working the moment FAMILY_CODE is
 * changed. Signed-in users skip the gate entirely (see middleware.ts).
 *
 * This is a door, not the lock on anyone's data: the database's RLS policies
 * are what keep one closet from another. Its job is to keep strangers from
 * creating accounts that use up the shared remove.bg and Gemini quotas.
 *
 * Uses Web Crypto only, so the same code runs in middleware (Edge runtime)
 * and in Server Actions (Node).
 */

export const GATE_COOKIE = "closet_gate";

/** Browsers cap cookie lifetimes at 400 days. */
export const GATE_MAX_AGE_SECONDS = 60 * 60 * 24 * 400;

const encoder = new TextEncoder();

async function hmacHex(key: string, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(message)
  );
  return Array.from(new Uint8Array(signature), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
}

/** Compares without returning early, so timing doesn't leak a prefix match. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function isGateConfigured(): boolean {
  return Boolean(process.env.FAMILY_CODE);
}

/** The cookie value for the current FAMILY_CODE, or null if it isn't set. */
export async function currentGateToken(): Promise<string | null> {
  const code = process.env.FAMILY_CODE;
  return code ? hmacHex(code, "closet-gate-v1") : null;
}

/** Fails closed: with no FAMILY_CODE configured, nothing gets through. */
export async function isGateCookieValid(
  value: string | undefined
): Promise<boolean> {
  if (!value) return false;
  const expected = await currentGateToken();
  return expected !== null && safeEqual(value, expected);
}

/**
 * Whether the typed code is right. Codes are compared case-insensitively with
 * surrounding spaces ignored, because it will be typed on a phone keyboard
 * that likes to capitalize the first letter.
 */
export async function isFamilyCode(input: string): Promise<boolean> {
  const code = process.env.FAMILY_CODE;
  if (!code) return false;
  const normalize = (s: string) => s.trim().toLowerCase();
  // Compare HMACs of equal length rather than the raw strings.
  const [a, b] = await Promise.all([
    hmacHex("closet-gate-compare", normalize(input)),
    hmacHex("closet-gate-compare", normalize(code)),
  ]);
  return safeEqual(a, b);
}
