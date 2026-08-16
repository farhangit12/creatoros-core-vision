export type AiFeature = "chat" | "script-studio" | "image-studio" | "thumbnail-studio";

export type TextOperation =
  | "chat"
  | "script.generate"
  | "script.rewrite"
  | "structured.generate";

export type ImageOperation = "image.generate" | "thumbnail.generate" | "image.variation";

export type AiOperation = TextOperation | ImageOperation | "generation.status";

export const textOperations: readonly TextOperation[] = [
  "chat",
  "script.generate",
  "script.rewrite",
  "structured.generate",
];

export const imageOperations: readonly ImageOperation[] = [
  "image.generate",
  "thumbnail.generate",
  "image.variation",
];

export const allOperations: readonly AiOperation[] = [
  ...textOperations,
  ...imageOperations,
  "generation.status",
];

export function isTextOperation(operation: AiOperation): operation is TextOperation {
  return (textOperations as readonly string[]).includes(operation);
}

export function isImageOperation(operation: AiOperation): operation is ImageOperation {
  return (imageOperations as readonly string[]).includes(operation);
}
