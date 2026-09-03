/**
 * Shrink a chosen photo in the browser before it is sent to a Server Action.
 *
 * Vercel caps a serverless function's request body at 4.5 MB, and that cap is
 * enforced at the edge before the function runs — the request is rejected with
 * a 413 and no server code executes, so no amount of server-side handling can
 * rescue it. `serverActions.bodySizeLimit` in next.config.ts raises only Next's
 * own limit, not the platform's, which makes it misleading here.
 *
 * Recent iPhones shoot 48 MP by default in some modes, so an ordinary photo is
 * routinely 5-10 MB and clears that ceiling without anything unusual happening.
 * Resizing first keeps every upload well under it, and is faster besides.
 *
 * Reliability matters more than cleverness here: the failure this replaces was
 * a hard one (the whole app crashed), so every decode path has a fallback and
 * the encoder retries at lower settings rather than giving up.
 */

/**
 * 2048px on the long edge. Comfortably above what the app displays even on a
 * 3x phone screen — the detail hero is ~600 CSS px, so ~1800 device pixels —
 * while keeping a re-encoded photo a few hundred KB.
 */
const MAX_EDGE = 2048;

/** Successive attempts, each smaller and cheaper than the last. */
const ENCODE_ATTEMPTS: { edge: number; quality: number }[] = [
  { edge: MAX_EDGE, quality: 0.85 },
  { edge: 1600, quality: 0.8 },
  { edge: 1280, quality: 0.72 },
];

/**
 * Refuse anything still above this after processing. Below Vercel's 4.5 MB so
 * there is room for the other form fields and multipart overhead.
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** What we can draw to a canvas, whichever way it decoded. */
type Decoded = {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
};

/**
 * Decode via whichever route this browser supports.
 *
 * `createImageBitmap` is the good path — it decodes off the main thread and can
 * apply EXIF orientation itself — but Safari has been uneven about both the
 * options argument and HEIC, and Safari is the only engine on iOS. So: try it
 * with options, then without, then fall back to an <img>, which is the most
 * compatible decoder available and the one route certain to handle whatever the
 * iOS photo picker hands over.
 */
async function decode(file: File): Promise<Decoded | null> {
  if (typeof createImageBitmap === "function") {
    for (const options of [{ imageOrientation: "from-image" } as const, undefined]) {
      try {
        const bitmap = options
          ? await createImageBitmap(file, options)
          : await createImageBitmap(file);
        return {
          source: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          release: () => bitmap.close(),
        };
      } catch {
        // try the next route
      }
    }
  }

  // <img> applies EXIF orientation when rendering by default, and drawImage
  // uses that rendered orientation, so this path stays upright too.
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    if (!width || !height) throw new Error("zero-sized decode");
    return {
      source: image,
      width,
      height,
      release: () => URL.revokeObjectURL(url),
    };
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/**
 * Returns a smaller JPEG when possible, or the original file when the browser
 * cannot decode it at all. Never throws: a failure here falls through to the
 * server, which can still convert HEIC via sharp.
 */
export async function prepareForUpload(file: File): Promise<File> {
  if (typeof document === "undefined") return file;

  const decoded = await decode(file);
  if (!decoded) return file;

  try {
    const isHeic = /hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
    const longEdge = Math.max(decoded.width, decoded.height);

    // Already modest, already a format the app can serve — leave it be.
    if (longEdge <= MAX_EDGE && file.size <= MAX_UPLOAD_BYTES && !isHeic) {
      return file;
    }

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return file;

    let best: Blob | null = null;
    for (const { edge, quality } of ENCODE_ATTEMPTS) {
      const scale = Math.min(1, edge / longEdge);
      canvas.width = Math.max(1, Math.round(decoded.width * scale));
      canvas.height = Math.max(1, Math.round(decoded.height * scale));
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(decoded.source, 0, 0, canvas.width, canvas.height);

      const blob = await toBlob(canvas, quality);
      if (!blob) continue;
      best = blob;
      if (blob.size <= MAX_UPLOAD_BYTES) break;
      // Otherwise try again smaller. Reaching here needs a pathological image;
      // a 4032x3024 photo of pure noise lands at ~0.7 MB on the first attempt.
    }

    if (!best) return file;
    // Re-encoding an already-small optimised image can make it bigger.
    if (best.size >= file.size && file.size <= MAX_UPLOAD_BYTES) return file;

    const name = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([best], `${name}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  } finally {
    decoded.release();
  }
}
