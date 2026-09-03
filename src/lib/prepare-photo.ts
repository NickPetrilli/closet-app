/**
 * Shrink a chosen photo in the browser before it is sent to a Server Action.
 *
 * Vercel caps a serverless function's request body at 4.5 MB, and that cap is
 * enforced at the edge before the function runs — the request is rejected with
 * a 413 and no server code executes, so no amount of server-side handling can
 * rescue it. `serverActions.bodySizeLimit` in next.config.ts raises only Next's
 * own limit, not the platform's, which makes it misleading here.
 *
 * A photo straight off an iPhone is routinely 3-8 MB, so uploads from a phone
 * hit that ceiling while smaller desktop test images never did. Resizing first
 * keeps every upload comfortably under it, and is faster besides.
 *
 * 1600px on the long edge is well beyond what the app ever displays (grid tiles
 * are ~300px, the detail hero ~600px), so nothing visible is lost.
 */

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.85;

/**
 * Refuse anything still above this after processing. Below Vercel's 4.5 MB so
 * there is room for the other form fields and multipart overhead.
 */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Returns a smaller JPEG when possible, or the original file when the browser
 * cannot decode it (some browsers cannot read HEIC) or when shrinking would not
 * help. Never throws: a failure here should fall through to the server, which
 * can still convert HEIC via sharp.
 */
export async function prepareForUpload(file: File): Promise<File> {
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    // `from-image` applies EXIF orientation while decoding, so the canvas is
    // already upright. Phone photos carry orientation flags that would
    // otherwise survive into storage and render sideways.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }

  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    // Already small enough and in a format the app can serve — leave it alone.
    if (scale === 1 && file.size <= MAX_UPLOAD_BYTES && !/hei[cf]/i.test(file.type)) {
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    if (!blob) return file;
    // Re-encoding a small, already-optimised image can make it bigger.
    if (blob.size >= file.size && file.size <= MAX_UPLOAD_BYTES) return file;

    const name = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${name}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  } finally {
    bitmap.close();
  }
}
