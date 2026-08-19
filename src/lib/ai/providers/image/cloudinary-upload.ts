import { createHash } from "node:crypto";

/**
 * Only this file may read CLOUDINARY_* env vars or call the Cloudinary API.
 * CLOUDINARY_API_SECRET never leaves this module -- it's only ever used to
 * compute a signature, never sent over the wire itself. Called by
 * providers/image/cloudflare.ts to turn generated image bytes into a durable
 * public URL, since Cloudflare Workers AI only returns raw bytes.
 */
function getConfig(): { cloudName: string; apiKey: string; apiSecret: string } {
  const cloudName = process.env["CLOUDINARY_CLOUD_NAME"];
  const apiKey = process.env["CLOUDINARY_API_KEY"];
  const apiSecret = process.env["CLOUDINARY_API_SECRET"];
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET must all be configured on the server.",
    );
  }
  return { cloudName, apiKey, apiSecret };
}

// Cloudinary signature algorithm: sort all params-to-sign alphabetically,
// join as "key=value&key=value", append the API secret with no separator,
// then SHA-1 hex digest. https://cloudinary.com/documentation/authentication_signatures
function signParams(params: Record<string, string>, apiSecret: string): string {
  const sorted = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(sorted + apiSecret).digest("hex");
}

export interface CloudinaryUploadResult {
  url: string;
  width: number;
  height: number;
}

export async function uploadImageToCloudinary(
  imageBytes: Buffer,
  mimeType: string,
  folder: string,
): Promise<CloudinaryUploadResult> {
  const { cloudName, apiKey, apiSecret } = getConfig();
  const dataUri = `data:${mimeType};base64,${imageBytes.toString("base64")}`;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = signParams({ timestamp, folder }, apiSecret);

  const form = new FormData();
  form.append("file", dataUri);
  form.append("api_key", apiKey);
  form.append("timestamp", timestamp);
  form.append("folder", folder);
  form.append("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: form,
  });

  const json = (await response.json()) as {
    secure_url?: string;
    width?: number;
    height?: number;
    error?: { message?: string };
  };

  if (!response.ok || !json.secure_url) {
    const message = json.error?.message ?? `Cloudinary upload failed with status ${response.status}.`;
    throw new Error(message);
  }

  return { url: json.secure_url, width: json.width ?? 0, height: json.height ?? 0 };
}

// No public_id is captured at upload time (uploads only ever get folder +
// signature, letting Cloudinary auto-assign one), so deletion derives it
// back out of the stored secure_url instead of requiring a schema change.
// Cloudinary secure_urls from this uploader always look like
// https://res.cloudinary.com/<cloud>/image/upload/[<transformations>/]v<digits>/<folder>/<id>.<ext>
// -- the public_id is the folder-qualified path with the extension stripped.
// The optional transformation segment (e.g. a stored text-overlay URL) has
// no slashes of its own, so it's skipped as a single path segment before
// the version segment.
function publicIdFromUrl(url: string): string | null {
  const match = /\/upload\/(?:[^/]+\/)*v\d+\/(.+)\.[a-zA-Z0-9]+$/.exec(url);
  return match?.[1] ?? null;
}

export async function destroyImageFromCloudinary(url: string): Promise<void> {
  const publicId = publicIdFromUrl(url);
  if (!publicId) return;

  const { cloudName, apiKey, apiSecret } = getConfig();
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = signParams({ timestamp, public_id: publicId }, apiSecret);

  const form = new FormData();
  form.append("public_id", publicId);
  form.append("api_key", apiKey);
  form.append("timestamp", timestamp);
  form.append("signature", signature);

  // Best-effort: a failed destroy call here shouldn't block deleting the
  // generation record itself -- same tradeoff already accepted for the
  // Files system's own asset cleanup.
  try {
    await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
      method: "POST",
      body: form,
    });
  } catch {
    // ignore -- the DB row is still the source of truth for the user
  }
}
