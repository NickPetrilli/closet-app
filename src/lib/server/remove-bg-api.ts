// Background removal via the remove.bg API instead of a local ONNX model.
// The local model (@imgly/background-removal-node) worked, but its bundled
// weights are ~380MB once traced for deployment — about 8x Vercel's function
// size limit — and it can't be fetched from a URL at runtime either (see the
// git history for that dead end). remove.bg's free tier (50 calls/month, no
// card required) covers this app's realistic volume as a small HTTP call
// that deploys with zero size concerns and works identically local or
// deployed.
const REMOVE_BG_ENDPOINT = "https://api.remove.bg/v1.0/removebg";

export interface RemoveBackgroundResult {
  buffer?: Buffer;
  error?: string;
}

/** Returns a background-removed PNG, or a user-facing error message. */
export async function removeBackgroundViaApi(
  imageBuffer: Buffer,
  contentType: string
): Promise<RemoveBackgroundResult> {
  const apiKey = process.env.REMOVE_BG_API_KEY;
  if (!apiKey) {
    return { error: "Background removal isn't configured yet." };
  }

  const form = new FormData();
  form.append(
    "image_file",
    new Blob([new Uint8Array(imageBuffer)], { type: contentType }),
    "photo"
  );
  form.append("size", "auto");

  let response: Response;
  try {
    response = await fetch(REMOVE_BG_ENDPOINT, {
      method: "POST",
      headers: { "X-Api-Key": apiKey },
      body: form,
    });
  } catch {
    return { error: "Couldn't reach the background removal service." };
  }

  if (!response.ok) {
    if (response.status === 402) {
      return {
        error:
          "This month's free background-removal quota (50 images) has been used up — it'll reset next month. No charge happens either way; there's no card on file.",
      };
    }
    if (response.status === 403) {
      return { error: "Background removal isn't configured correctly (bad API key)." };
    }
    if (response.status === 429) {
      return { error: "Too many requests right now — try again in a moment." };
    }
    return {
      error:
        "Couldn't process that photo's background. Try a clearer photo of just the item.",
    };
  }

  return { buffer: Buffer.from(await response.arrayBuffer()) };
}
