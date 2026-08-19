import { createHash } from "node:crypto";

/**
 * Only this file may read CLOUDINARY_* env vars for the general user-files
 * feature. Deliberately separate from src/lib/ai/providers/image/cloudinary-upload.ts
 * (the AI image-generation pipeline's Cloudinary usage) -- that file is not
 * imported here and is never modified by this feature, per scope protection.
 * CLOUDINARY_API_SECRET never leaves this module.
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

// https://cloudinary.com/documentation/authentication_signatures
function signParams(params: Record<string, string>, apiSecret: string): string {
  const sorted = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(sorted + apiSecret).digest("hex");
}

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: string;
  signature: string;
  folder: string;
}

/**
 * Signs a direct browser-to-Cloudinary upload for one user's files folder
 * (or a custom folder, e.g. avatars, when provided). The browser never sees
 * CLOUDINARY_API_SECRET -- only the resulting signature, which is only valid
 * for this exact timestamp+folder pair.
 */
export function createUploadSignature(userId: string, folderOverride?: string): UploadSignature {
  const { cloudName, apiKey, apiSecret } = getConfig();
  const folder = folderOverride ?? `creatoros-files/${userId}`;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = signParams({ timestamp, folder }, apiSecret);
  return { cloudName, apiKey, timestamp, signature, folder };
}

/** Permanently deletes an asset from Cloudinary by its public_id. */
export async function deleteFromCloudinary(publicId: string, resourceType: string): Promise<void> {
  const { cloudName, apiKey, apiSecret } = getConfig();
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = signParams({ public_id: publicId, timestamp }, apiSecret);

  const form = new FormData();
  form.append("public_id", publicId);
  form.append("api_key", apiKey);
  form.append("timestamp", timestamp);
  form.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`,
    { method: "POST", body: form },
  );
  const json = (await response.json()) as { result?: string; error?: { message?: string } };
  if (!response.ok || (json.result !== "ok" && json.result !== "not found")) {
    const message = json.error?.message ?? `Cloudinary delete failed with status ${response.status}.`;
    throw new Error(message);
  }
}
