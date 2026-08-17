import type { UploadSignature } from "@/lib/server/files-storage";
import { classifyMimeType } from "@/lib/files";

export interface CloudinaryUploadResult {
  url: string;
  storageKey: string;
  resourceType: string;
  width?: number;
  height?: number;
}

/**
 * Uploads a File directly from the browser to Cloudinary using a
 * server-issued signature (see getUploadSignature in lib/server/files.ts).
 * Uses XMLHttpRequest instead of fetch specifically to get real upload
 * progress events -- fetch has no upload-progress API.
 */
export function uploadFileToCloudinary(
  file: File,
  signature: UploadSignature,
  onProgress: (percent: number) => void,
): Promise<CloudinaryUploadResult> {
  const classification = classifyMimeType(file.type);
  const resourceType = classification?.resourceType ?? "raw";

  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("api_key", signature.apiKey);
    form.append("timestamp", signature.timestamp);
    form.append("folder", signature.folder);
    form.append("signature", signature.signature);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${signature.cloudName}/${resourceType}/upload`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      let json: {
        secure_url?: string;
        public_id?: string;
        resource_type?: string;
        width?: number;
        height?: number;
        error?: { message?: string };
      };
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error("Cloudinary returned an unreadable response."));
        return;
      }
      if (xhr.status < 200 || xhr.status >= 300 || !json.secure_url || !json.public_id) {
        reject(new Error(json.error?.message ?? `Upload failed with status ${xhr.status}.`));
        return;
      }
      resolve({
        url: json.secure_url,
        storageKey: json.public_id,
        resourceType: json.resource_type ?? resourceType,
        ...(json.width !== undefined ? { width: json.width } : {}),
        ...(json.height !== undefined ? { height: json.height } : {}),
      });
    };

    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(form);
  });
}
