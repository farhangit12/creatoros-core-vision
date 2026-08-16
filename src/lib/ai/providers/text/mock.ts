import type { TextProvider, TextProviderRequest, TextProviderResult } from "../types";
import type { ChatMessage, ScriptOption, TokenUsage } from "../../types";

/**
 * Kept short on purpose — this simulates "a provider is out there on the network"
 * for callers that branch on pending/loading state, without slowing down tests.
 */
const MOCK_LATENCY_MS = 150;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hashSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function estimateUsage(promptText: string, completionText: string): TokenUsage {
  const promptTokens = Math.max(1, Math.round(promptText.length / 4));
  const completionTokens = Math.max(1, Math.round(completionText.length / 4));
  return { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens };
}

// --- chat -------------------------------------------------------------

const CHAT_REPLIES = [
  "Here's a draft based on your brand voice and recent uploads. Let me know if you'd like it punchier, shorter, or restructured.",
  "Got it — here's a version that leans into your usual tone. I can tighten the middle section if it feels long.",
  "Here's a first pass. Want me to give you two more angles to pick from?",
];

function pickChatReply(messages: ChatMessage[]): string {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const seed = lastUser ? hashSeed(lastUser.content) : 0;
  return CHAT_REPLIES[seed % CHAT_REPLIES.length]!;
}

// --- script.generate ----------------------------------------------------

const HOOK_TEMPLATES: Array<(topic: string) => string> = [
  (topic) => `You're losing viewers in the first 8 seconds of "${topic}" — here's the fix nobody talks about.`,
  (topic) => `I tried the advice every creator gives about "${topic}" — most of it is wrong.`,
  (topic) => `This structure for "${topic}" is why watch time doubled for creators who used it.`,
];

const INTRO_TEMPLATES: Array<(topic: string) => string> = [
  (topic) => `Quick intro: who this is for, and the one promise we're making about "${topic}".`,
  (topic) => `Set up the experiment: three approaches to "${topic}", one video, real results.`,
  (topic) => `Short credibility line, then a one-sentence roadmap for "${topic}".`,
];

const BODY_TEMPLATES: Array<(topic: string) => string> = [
  (topic) => `Beat 1: the mistake creators make with "${topic}". Beat 2: the reframe. Beat 3: a concrete before/after example.`,
  (topic) => `Beat 1: what most creators try first. Beat 2: why it underperforms. Beat 3: what to do instead.`,
  (topic) => `Beat 1: the structure. Beat 2: why it works psychologically. Beat 3: a template viewers can copy.`,
];

const CTA_TEMPLATES: Array<() => string> = [
  () => "Subscribe if this helped, and check the next video for the full breakdown.",
  () => "Comment which approach you'd try — I'll reply with feedback.",
  () => "Grab the template linked below and tell us how it performs.",
];

const OPTION_LABELS = ["A", "B", "C"];

function buildScriptOptions(topic: string, optionCount: number): ScriptOption[] {
  const count = Math.min(Math.max(optionCount, 1), OPTION_LABELS.length);
  const safeTopic = topic.trim() || "your next video";
  return Array.from({ length: count }).map((_, i) => ({
    key: OPTION_LABELS[i]!.toLowerCase(),
    label: `Option ${OPTION_LABELS[i]}`,
    recommended: i === 0,
    rationale: i === 0 ? "Strongest hook-to-payoff ratio for this audience." : undefined,
    sections: [
      { id: "hook", label: "Hook", text: HOOK_TEMPLATES[i]!(safeTopic) },
      { id: "intro", label: "Intro", text: INTRO_TEMPLATES[i]!(safeTopic) },
      { id: "body", label: "Body beats", text: BODY_TEMPLATES[i]!(safeTopic) },
      { id: "cta", label: "CTA", text: CTA_TEMPLATES[i]!() },
    ],
  }));
}

// --- script.rewrite -------------------------------------------------------

const REWRITE_PREFIXES = ["Here's a sharper version: ", "Reworded for clarity: ", "A punchier take: "];
const IMPROVE_PREFIXES = ["Stronger opening: ", "Tightened for impact: ", "More specific: "];
const EXPANSION_SUFFIXES = [
  "Here's a concrete example that backs this up.",
  "This keeps the contrast but grounds it in a detail your audience will recognise immediately.",
  "Add a quick stat or before/after to make this land harder.",
];
const CONTINUATION_SUFFIXES = [
  "From there, walk through the first concrete step.",
  "Next, address the objection most viewers will have.",
  "Follow with a quick example before moving to the CTA.",
];

function shorten(text: string): string {
  const words = text.trim().split(/\s+/);
  const target = Math.max(4, Math.round(words.length * 0.6));
  return words.slice(0, target).join(" ") + (words.length > target ? "." : "");
}

function applyRewriteAction(text: string, action: string): string {
  const seed = hashSeed(text + action);
  if (action === "expand") {
    return `${text} ${EXPANSION_SUFFIXES[seed % EXPANSION_SUFFIXES.length]}`;
  }
  if (action === "shorten") {
    return shorten(text);
  }
  if (action === "improve") {
    return `${IMPROVE_PREFIXES[seed % IMPROVE_PREFIXES.length]}${text}`;
  }
  if (action === "continue") {
    return `${text} ${CONTINUATION_SUFFIXES[seed % CONTINUATION_SUFFIXES.length]}`;
  }
  if (action.startsWith("tone-")) {
    const tone = action.slice("tone-".length);
    return `In a ${tone.toLowerCase()} tone: ${text}`;
  }
  return `${REWRITE_PREFIXES[seed % REWRITE_PREFIXES.length]}${text}`;
}

// --- structured.generate ----------------------------------------------

function buildStructuredOutput(prompt: string, fields: string[]): Record<string, string> {
  const safePrompt = prompt.trim() || "this request";
  const result: Record<string, string> = {};
  for (const field of fields) {
    result[field] = `Generated ${field} based on: ${safePrompt}`;
  }
  return result;
}

// --- provider -----------------------------------------------------------

export const mockTextProvider: TextProvider = {
  id: "mock-text",
  label: "CreatorOS Mock Text",

  async generate(request: TextProviderRequest): Promise<TextProviderResult> {
    await delay(MOCK_LATENCY_MS);

    let content: string;
    switch (request.operation) {
      case "chat": {
        content = pickChatReply(request.messages ?? []);
        break;
      }
      case "script.generate": {
        const optionCount = Number(request.metadata?.["optionCount"] ?? 3);
        content = JSON.stringify(buildScriptOptions(request.prompt ?? "", optionCount));
        break;
      }
      case "script.rewrite": {
        const action = String(request.metadata?.["action"] ?? "rewrite");
        content = applyRewriteAction(request.prompt ?? "", action);
        break;
      }
      case "structured.generate": {
        const fields = (request.metadata?.["fields"] as string[] | undefined) ?? ["title", "summary"];
        content = JSON.stringify(buildStructuredOutput(request.prompt ?? "", fields));
        break;
      }
    }

    const promptText = request.prompt ?? (request.messages ?? []).map((m) => m.content).join("\n");
    return {
      content,
      finishReason: "stop",
      usage: estimateUsage(promptText, content),
    };
  },
};
