import { ProviderHttpError, type TextProvider, type TextProviderRequest, type TextProviderResult } from "../types";
import type { ChatMessage, TokenUsage } from "../../types";

/**
 * Only this file may read GROQ_API_KEY or call the Groq API. Everything
 * above the TextProvider interface (registry.ts, router.ts, text-service.ts)
 * stays provider-agnostic per the boundary documented in providers/types.ts.
 * The model id itself is chosen by registry.ts and passed in via request.model.
 * Structurally mirrors providers/text/openrouter.ts (both are OpenAI-compatible
 * chat-completions APIs called via native fetch, no SDK dependency).
 */
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Output-token ceilings per operation, sized the same way as the OpenRouter
// adapter: script.generate covers the worst case (multiOption -> 3 options).
const CHAT_MAX_TOKENS = 2048;
const SCRIPT_GENERATE_MAX_TOKENS = 4096;
const SCRIPT_REWRITE_MAX_TOKENS = 1024;

interface GroqMessage {
  role: string;
  content: string;
}

function getApiKey(): string {
  const apiKey = process.env["GROQ_API_KEY"];
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured on the server.");
  }
  return apiKey;
}

function toUsage(
  usage:
    | { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
    | undefined,
): TokenUsage {
  const promptTokens = usage?.prompt_tokens ?? 0;
  const completionTokens = usage?.completion_tokens ?? 0;
  const totalTokens = usage?.total_tokens ?? promptTokens + completionTokens;
  return { promptTokens, completionTokens, totalTokens };
}

function toFinishReason(reason: string | undefined | null): TextProviderResult["finishReason"] {
  if (reason === "length") return "length";
  if (reason === undefined || reason === null || reason === "stop") return "stop";
  return "error";
}

function toSystemInstruction(messages: ChatMessage[]): string | undefined {
  const systemText = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  return systemText.length > 0 ? systemText : undefined;
}

async function callGroq(
  model: string,
  messages: GroqMessage[],
  maxTokens: number,
): Promise<{ content: string; finishReason: string | null | undefined; usage: unknown }> {
  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
    }),
  });

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string }; finish_reason?: string | null }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    error?: { message?: string };
  };

  if (!response.ok) {
    const message = json.error?.message ?? `Groq request failed with status ${response.status}.`;
    throw new ProviderHttpError(message, response.status);
  }

  const choice = json.choices?.[0];
  return {
    content: choice?.message?.content ?? "",
    finishReason: choice?.finish_reason,
    usage: json.usage,
  };
}

async function runChat(request: TextProviderRequest): Promise<TextProviderResult> {
  const messages = request.messages ?? [];
  const tone =
    typeof request.metadata?.["tone"] === "string" ? (request.metadata["tone"] as string) : undefined;
  const systemParts = [
    "You are the AI assistant inside CreatorOS, helping content creators plan and produce videos.",
    "Be concise, practical, and actionable.",
    tone ? `Respond in a ${tone} tone.` : undefined,
    toSystemInstruction(messages),
  ].filter((part): part is string => Boolean(part));

  const groqMessages: GroqMessage[] = [
    { role: "system", content: systemParts.join("\n\n") },
    ...messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role, content: m.content })),
  ];

  const { content, finishReason, usage } = await callGroq(request.model, groqMessages, CHAT_MAX_TOKENS);

  return {
    content,
    finishReason: toFinishReason(finishReason),
    usage: toUsage(usage as { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }),
  };
}

async function runScriptGenerate(request: TextProviderRequest): Promise<TextProviderResult> {
  const metadata = request.metadata ?? {};
  const optionCount = Number(metadata["optionCount"] ?? 3);
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
    "Return ONLY valid JSON matching this shape, no markdown fences, no preamble: an array of objects with fields key, label, recommended, rationale, sections (array of {id, label, text}).",
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");

  const { content, finishReason, usage } = await callGroq(
    request.model,
    [{ role: "user", content: prompt }],
    SCRIPT_GENERATE_MAX_TOKENS,
  );

  return {
    content: content || "[]",
    finishReason: toFinishReason(finishReason),
    usage: toUsage(usage as { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }),
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

  const { content, finishReason, usage } = await callGroq(
    request.model,
    [{ role: "user", content: prompt }],
    SCRIPT_REWRITE_MAX_TOKENS,
  );

  return {
    content: content.trim(),
    finishReason: toFinishReason(finishReason),
    usage: toUsage(usage as { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }),
  };
}

export const groqTextProvider: TextProvider = {
  id: "groq",
  label: "Groq",

  async generate(request: TextProviderRequest): Promise<TextProviderResult> {
    switch (request.operation) {
      case "chat":
        return runChat(request);
      case "script.generate":
        return runScriptGenerate(request);
      case "script.rewrite":
        return runScriptRewrite(request);
      default:
        throw new Error(`Groq text provider does not support operation "${request.operation}".`);
    }
  },
};
