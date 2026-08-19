export type FileKind = "image" | "video" | "audio" | "document" | "other";

/** Cloudinary resource_type for upload/destroy calls -- audio is uploaded as "video" per Cloudinary's own model. */
export type CloudinaryResourceType = "image" | "video" | "raw";

const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
const VIDEO_MIME_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const AUDIO_MIME_TYPES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/webm"];
const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const ALLOWED_MIME_TYPES = [
  ...IMAGE_MIME_TYPES,
  ...VIDEO_MIME_TYPES,
  ...AUDIO_MIME_TYPES,
  ...DOCUMENT_MIME_TYPES,
];

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB

export interface FileClassification {
  fileType: FileKind;
  resourceType: CloudinaryResourceType;
}

/** Returns null for any MIME type outside the supported whitelist. */
export function classifyMimeType(mimeType: string): FileClassification | null {
  if (IMAGE_MIME_TYPES.includes(mimeType)) return { fileType: "image", resourceType: "image" };
  if (VIDEO_MIME_TYPES.includes(mimeType)) return { fileType: "video", resourceType: "video" };
  if (AUDIO_MIME_TYPES.includes(mimeType)) return { fileType: "audio", resourceType: "video" };
  if (DOCUMENT_MIME_TYPES.includes(mimeType)) return { fileType: "document", resourceType: "raw" };
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/** Cloudinary's "force download" transformation flag, inserted right after /upload/. */
export function toDownloadUrl(url: string): string {
  return url.replace("/upload/", "/upload/fl_attachment/");
}

/**
 * Forces a square, face-centered crop regardless of the source photo's
 * orientation -- a portrait or landscape upload otherwise renders inside a
 * square avatar slot uncropped/sideways depending on its own aspect ratio
 * and EXIF rotation. Any Cloudinary transformation also normalizes EXIF
 * orientation as a side effect, which fixes sideways phone photos too.
 */
export function toAvatarUrl(url: string, size = 128): string {
  return url.replace("/upload/", `/upload/c_fill,g_face,w_${size},h_${size},f_auto,q_auto/`);
}
