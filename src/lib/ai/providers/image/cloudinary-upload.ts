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
