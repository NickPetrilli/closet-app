import { ApiError, GoogleGenAI } from "@google/genai";
import type { GenerateContentConfig, Part } from "@google/genai";

/**
 * Shared Gemini plumbing: the model fallback chain and the friendly errors
 * around it. Extracted from generate-outfits.ts once the daily suggestion
 * became a second caller — the failure modes here were learned the hard way
 * and shouldn't be reimplemented per feature.
 */

/**
 * "-latest" aliases route to whichever model is currently getting the most
 * traffic, which is exactly what makes them prone to real, live 503 "high
 * demand" responses on the free tier (confirmed directly: gemini-flash-latest
 * returned one while gemini-flash-lite-latest succeeded on the same request
 * seconds later). Falling back to the lite model trades a little
 * sophistication for actually finishing.
 */
const MODEL_FALLBACK_CHAIN = ["gemini-flash-latest", "gemini-flash-lite-latest"];

export interface GeminiJsonResult {
  text?: string;
  error?: string;
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * One structured-output call, retried down the fallback chain.
 *
 * @param label how to name this feature in user-facing errors, lowercase,
 *              e.g. "outfit generation" → "Outfit generation isn't configured yet."
 */
export async function generateJson({
  parts,
  config,
  label,
}: {
  parts: Part[];
  config: GenerateContentConfig;
  label: string;
}): Promise<GeminiJsonResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { error: `${label[0].toUpperCase()}${label.slice(1)} isn't configured yet.` };
  }

  // The SDK's own default retry is up to 5 attempts with backoff up to 60s —
  // fine for a script, but these calls run inside a Server Action capped at
  // 60s total (see maxDuration in src/app/page.tsx). Retrying the SAME model
  // while it reports itself overloaded burns that budget for nothing;
  // dropping straight to the fallback got a real second attempt in ~7s.
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { retryOptions: { attempts: 1 } },
  });

  let lastError: unknown;
  for (const model of MODEL_FALLBACK_CHAIN) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts }],
        config,
      });
      return { text: response.text };
    } catch (err) {
      lastError = err;
      // 429 is tracked per model on the free tier, not shared across them, so
      // a fallback model can still have headroom when the primary is
      // rate-limited — worth trying, same as a 5xx overload.
      if (err instanceof ApiError && (err.status >= 500 || err.status === 429)) {
        continue;
      }
      break; // bad key, bad request — switching models won't fix it
    }
  }

  if (lastError instanceof ApiError && lastError.status === 429) {
    return {
      error: `Today's free ${label} quota has been used up across both models — it resets on Google's usual daily cycle, no charge either way. Try again later or tomorrow.`,
    };
  }
  if (lastError instanceof ApiError && lastError.status >= 500) {
    return {
      error: `Google's ${label} models are temporarily overloaded (a known free-tier hiccup, not something wrong on our end) — please try again in a moment.`,
    };
  }
  return {
    error:
      lastError instanceof Error
        ? lastError.message
        : `Couldn't reach the ${label} service.`,
  };
}
