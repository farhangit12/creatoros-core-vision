import { extractText } from "unpdf";

// Only .txt and .pdf get real content extraction -- both are genuinely
// parseable server-side without a heavyweight/native dependency. Images and
// doc/docx are attached and shown to the user, but their content is
// honestly NOT read by the AI (no vision model is wired for chat, and
// legacy .doc/.docx have no edge-safe extractor here) -- the context block
// says so explicitly instead of silently pretending they were understood.
const MAX_EXTRACTED_CHARS = 6000;

export interface ChatAttachmentInput {
  url: string;
  name: string;
  mimeType: string;
}

async function fetchBytes(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch attachment (status ${response.status}).`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function extractOne(attachment: ChatAttachmentInput): Promise<string> {
  try {
    if (attachment.mimeType === "text/plain") {
      const bytes = await fetchBytes(attachment.url);
      const text = bytes.toString("utf-8").slice(0, MAX_EXTRACTED_CHARS);
      return `[Reference document: ${attachment.name}]\n${text}`;
    }

    if (attachment.mimeType === "application/pdf") {
      const bytes = await fetchBytes(attachment.url);
      const { text } = await extractText(new Uint8Array(bytes), { mergePages: true });
      const trimmed = text.trim().slice(0, MAX_EXTRACTED_CHARS);
      return trimmed
        ? `[Reference document: ${attachment.name}]\n${trimmed}`
        : `[Reference document: ${attachment.name} -- no extractable text found in this PDF.]`;
    }

    if (attachment.mimeType.startsWith("image/")) {
      return `[Attached image: ${attachment.name} -- image content is not analyzed by the AI, only the filename is known.]`;
    }

    return `[Attached file: ${attachment.name} -- this file type's content isn't read by the AI, only the filename is known.]`;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return `[Attached file: ${attachment.name} -- couldn't be read (${message}).]`;
  }
}

/** Builds a context block to prepend to the outgoing user message sent to the AI. */
export async function buildAttachmentContext(attachments: ChatAttachmentInput[]): Promise<string> {
  if (attachments.length === 0) return "";
  const blocks = await Promise.all(attachments.map(extractOne));
  return blocks.join("\n\n");
}
