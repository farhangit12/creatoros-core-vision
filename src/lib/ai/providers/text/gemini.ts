import { GoogleGenAI, Type } from "@google/genai";
import type { Schema } from "@google/genai";
import type { TextProvider, TextProviderRequest, TextProviderResult } from "../types";
import type { ChatMessage, TokenUsage } from "../../types";

/**
 * Only this file may import the Gemini SDK or read GEMINI_API_KEY. Everything
 * above the TextProvider interface (registry.ts, text-service.ts) stays
 * provider-agnostic per the boundary documented in providers/types.ts.
 * The model id itself is chosen by registry.ts and passed in via request.model.
 */
let client: GoogleGenAI | undefined;

function getClient(): GoogleGenAI {
  if (client) return client;
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }
  client = new GoogleGenAI({ apiKey });
  return client;
}

function toUsage(usageMetadata: {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
} | undefined): TokenUsage {
  const promptTokens = usageMetadata?.promptTokenCount ?? 0;
  const completionTokens = usageMetadata?.candidatesTokenCount ?? 0;
  const totalTokens = usageMetadata?.totalTokenCount ?? promptTokens + completionTokens;
  return { promptTokens, completionTokens, totalTokens };
}

function toFinishReason(reason: string | undefined): TextProviderResult["finishReason"] {
  if (reason === "MAX_TOKENS") return "length";
  if (reason === undefined || reason === "STOP") return "stop";
  return "error";
}

function toGeminiContents(messages: ChatMessage[]): Array<{ role: string; parts: Array<{ text: string }> }> {
  return messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
}

function toSystemInstruction(messages: ChatMessage[]): string | undefined {
  const systemText = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  return systemText.length > 0 ? systemText : undefined;
}

const SCRIPT_OPTION_SCHEMA: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      key: { type: Type.STRING },
      label: { type: Type.STRING },
      recommended: { type: Type.BOOLEAN },
      rationale: { type: Type.STRING },
      sections: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            label: { type: Type.STRING },
            text: { type: Type.STRING },
          },
          required: ["id", "label", "text"],
        },
      },
    },
    required: ["key", "label", "recommended", "sections"],
  },
};

async function runChat(request: TextProviderRequest): Promise<TextProviderResult> {
  const messages = request.messages ?? [];
  const tone = typeof request.metadata?.["tone"] === "string" ? (request.metadata["tone"] as string) : undefined;
  const systemParts = [
    "You are the AI assistant inside CreatorOS, helping content creators plan and produce videos.",
    "Be concise, practical, and actionable.",
    tone ? `Respond in a ${tone} tone.` : undefined,
    toSystemInstruction(messages),
  ].filter((part): part is string => Boolean(part));

  const response = await getClient().models.generateContent({
    model: request.model,
    contents: toGeminiContents(messages),
    config: {
      systemInstruction: systemParts.join("\n\n"),
    },
  });

  return {
    content: response.text ?? "",
    finishReason: toFinishReason(response.candidates?.[0]?.finishReason),
    usage: toUsage(response.usageMetadata),
  };
}

async function runScriptGenerate(request: TextProviderRequest): Promise<TextProviderResult> {
  const metadata = request.metadata ?? {};
  const optionCount = Number(metadata["optionCount"] ?? 3);
  const creativity = typeof metadata["creativity"] === "number" ? (metadata["creativity"] as number) : 0.5;
  const topic = (request.prompt ?? "").trim() || "your next video";

  const prompt = [
    `Write ${optionCount} distinct short-form video script option(s) for the topic: "${topic}".`,
    `Platform: ${metadata["platform"] ?? "unspecified"}.`,
    `Content type: ${metadata["contentType"] ?? "unspecified"}.`,
    `Target duration: ${metadata["duration"] ?? "unspecified"}.`,
    `Tone: ${metadata["tone"] ?? "unspecified"}.`,
    `Language: ${metadata["language"] ?? "English"}.`,
    metadata["audience"] ? `Audience: ${metadata["audience"]}.` : undefined,
    "Each option must have a key (lowercase letter, e.g. \"a\"), a label (e.g. \"Option A\"), whether it is the recommended option, an optional one-sentence rationale for the recommended option, and sections with id/label/text for exactly: hook, intro, body, cta.",
    "Only the first option should be marked recommended.",
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");

  const response = await getClient().models.generateContent({
    model: request.model,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: SCRIPT_OPTION_SCHEMA,
    },
  });

  return {
    content: response.text ?? "[]",
    finishReason: toFinishReason(response.candidates?.[0]?.finishReason),
    usage: toUsage(response.usageMetadata),
  };
}

const REWRITE_INSTRUCTIONS: Record<string, string> = {
  expand: "Expand this script section with a concrete supporting example, keeping the same voice.",
  shorten: "Shorten this script section to about 60% of its length while keeping the core message.",
  improve: "Rewrite this script section to be punchier and more specific, keeping the same meaning.",
  continue: "Continue this script section with the next natural beat, keeping the same voice.",
};

async function runScriptRewrite(request: TextProviderRequest): Promise<TextProviderResult> {
  const action = String(request.metadata?.["action"] ?? "rewrite");
  const sectionText = request.prompt ?? "";

  let instruction: string;
  if (action.startsWith("tone-")) {
    const tone = action.slice("tone-".length);
    instruction = `Rewrite this script section in a ${tone.toLowerCase()} tone, keeping the same meaning.`;
  } else {
    instruction = REWRITE_INSTRUCTIONS[action] ?? "Rewrite this script section to be clearer and sharper.";
    const defaultTone = request.metadata?.["tone"];
    if (typeof defaultTone === "string" && defaultTone.trim()) {
      instruction += ` Use a ${defaultTone.toLowerCase()} tone.`;
    }
  }

  const prompt = `${instruction}\n\nScript section:\n"""\n${sectionText}\n"""\n\nReturn only the rewritten text, no preamble or quotes.`;

  const response = await getClient().models.generateContent({
    model: request.model,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  return {
    content: (response.text ?? "").trim(),
    finishReason: toFinishReason(response.candidates?.[0]?.finishReason),
    usage: toUsage(response.usageMetadata),
  };
}

export const geminiTextProvider: TextProvider = {
  id: "gemini",
  label: "Google Gemini",

  async generate(request: TextProviderRequest): Promise<TextProviderResult> {
    switch (request.operation) {
      case "chat":
        return runChat(request);
      case "script.generate":
        return runScriptGenerate(request);
      case "script.rewrite":
        return runScriptRewrite(request);
      default:
        throw new Error(`Gemini text provider does not support operation "${request.operation}".`);
    }
  },
};
