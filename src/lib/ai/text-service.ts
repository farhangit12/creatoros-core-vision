import { getTextProvider, resolveOperation } from "./registry";
import { generateText } from "./router";
import { usageLogger } from "./usage";
import type { ChatMessage, GenerationRecord, ScriptOption } from "./types";

export interface ChatParams {
  userId: string;
  messages: ChatMessage[];
  conversationId?: string;
  tone?: string;
  model?: string;
}

export interface ChatResult {
  message: ChatMessage;
  generation: GenerationRecord;
}

export async function chat(params: ChatParams): Promise<ChatResult> {
  const config = resolveOperation("chat");
  const model = params.model ?? config.model;
  const generation = usageLogger.start({
    userId: params.userId,
    feature: config.feature,
    operation: config.operation,
    provider: config.provider,
    model,
    conversationId: params.conversationId,
    input: { messages: params.messages, tone: params.tone },
  });

  try {
    const routed = await generateText(
      "chat",
      { messages: params.messages, metadata: { tone: params.tone } },
      params.model,
    );
    const message: ChatMessage = { role: "assistant", content: routed.result.content };
    const completed = usageLogger.complete(generation.id, {
      output: message,
      usage: routed.result.usage,
      provider: routed.provider,
      model: routed.model,
    });
    return { message, generation: completed };
  } catch (error) {
    usageLogger.fail(generation.id, error instanceof Error ? error.message : "Chat generation failed.");
    throw error;
  }
}

export interface GenerateScriptParams {
  userId: string;
  topic: string;
  platform: string;
  contentType: string;
  duration: string;
  tone: string;
  language: string;
  creativity: number;
  multiOption: boolean;
  audience?: string;
  conversationId?: string;
  model?: string;
}

export interface GenerateScriptResult {
  options: ScriptOption[];
  generation: GenerationRecord;
}

export async function generateScript(params: GenerateScriptParams): Promise<GenerateScriptResult> {
  const config = resolveOperation("script.generate");
  const model = params.model ?? config.model;
  const generation = usageLogger.start({
    userId: params.userId,
    feature: config.feature,
    operation: config.operation,
    provider: config.provider,
    model,
    conversationId: params.conversationId,
    input: params,
  });

  try {
    const routed = await generateText(
      "script.generate",
      {
        prompt: params.topic,
        metadata: {
          platform: params.platform,
          contentType: params.contentType,
          duration: params.duration,
          tone: params.tone,
          language: params.language,
          creativity: params.creativity,
          optionCount: params.multiOption ? 3 : 1,
        },
      },
      params.model,
    );
    const options = JSON.parse(routed.result.content) as ScriptOption[];
    const completed = usageLogger.complete(generation.id, {
      output: options,
      usage: routed.result.usage,
      provider: routed.provider,
      model: routed.model,
    });
    return { options, generation: completed };
  } catch (error) {
    usageLogger.fail(generation.id, error instanceof Error ? error.message : "Script generation failed.");
    throw error;
  }
}

export interface RewriteScriptParams {
  userId: string;
  sectionText: string;
  action: string;
  tone?: string;
  conversationId?: string;
  model?: string;
}

export interface RewriteScriptResult {
  text: string;
  generation: GenerationRecord;
}

export async function rewriteScript(params: RewriteScriptParams): Promise<RewriteScriptResult> {
  const config = resolveOperation("script.rewrite");
  const model = params.model ?? config.model;
  const generation = usageLogger.start({
    userId: params.userId,
    feature: config.feature,
    operation: config.operation,
    provider: config.provider,
    model,
    conversationId: params.conversationId,
    input: { sectionText: params.sectionText, action: params.action, tone: params.tone },
  });

  try {
    const routed = await generateText(
      "script.rewrite",
      { prompt: params.sectionText, metadata: { action: params.action, tone: params.tone } },
      params.model,
    );
    const completed = usageLogger.complete(generation.id, {
      output: routed.result.content,
      usage: routed.result.usage,
      provider: routed.provider,
      model: routed.model,
    });
    return { text: routed.result.content, generation: completed };
  } catch (error) {
    usageLogger.fail(generation.id, error instanceof Error ? error.message : "Script rewrite failed.");
    throw error;
  }
}

export interface GenerateStructuredParams {
  userId: string;
  prompt: string;
  fields: string[];
  conversationId?: string;
  model?: string;
}

export interface GenerateStructuredResult {
  data: Record<string, string>;
  generation: GenerationRecord;
}

export async function generateStructured(params: GenerateStructuredParams): Promise<GenerateStructuredResult> {
  const config = resolveOperation("structured.generate");
  const model = params.model ?? config.model;
  const generation = usageLogger.start({
    userId: params.userId,
    feature: config.feature,
    operation: config.operation,
    provider: config.provider,
    model,
    conversationId: params.conversationId,
    input: { prompt: params.prompt, fields: params.fields },
  });

  try {
    const result = await getTextProvider("structured.generate").generate({
      operation: "structured.generate",
      model,
      prompt: params.prompt,
      metadata: { fields: params.fields },
    });
    const data = JSON.parse(result.content) as Record<string, string>;
    const completed = usageLogger.complete(generation.id, { output: data, usage: result.usage });
    return { data, generation: completed };
  } catch (error) {
    usageLogger.fail(generation.id, error instanceof Error ? error.message : "Structured generation failed.");
    throw error;
  }
}

export { getGenerationStatus } from "./usage";
