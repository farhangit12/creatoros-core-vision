import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { aiConversations, aiGenerations, aiMessages } from "@/db/schema";
import { chat } from "@/lib/ai/text-service";
import { resolveOperation } from "@/lib/ai/registry";
import type { ChatMessage, ChatRole, GenerationRecord } from "@/lib/ai/types";

export type ConversationRecord = typeof aiConversations.$inferSelect;
export type MessageRecord = typeof aiMessages.$inferSelect;

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

function toSerializableMessage(row: MessageRecord) {
  return { ...row, metadata: row.metadata as Json };
}

function toSerializableGeneration(generation: GenerationRecord) {
  return { ...generation, input: generation.input as Json, output: generation.output as Json };
}

async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: getRequest().headers });
  if (!session) {
    throw new Error("Not authenticated.");
  }
  return session.user.id;
}

function assertRow<T>(row: T | undefined, message: string): T {
  if (!row) {
    throw new Error(message);
  }
  return row;
}

async function loadOwnedConversation(userId: string, conversationId: string): Promise<ConversationRecord> {
  const [conversation] = await db
    .select()
    .from(aiConversations)
    .where(and(eq(aiConversations.id, conversationId), eq(aiConversations.userId, userId)));
  return assertRow(conversation, "Conversation not found.");
}

function toDbGeneration(userId: string, generation: GenerationRecord) {
  return {
    id: generation.id,
    userId,
    conversationId: generation.conversationId,
    feature: generation.feature,
    operation: generation.operation,
    provider: generation.provider,
    model: generation.model,
    status: generation.status,
    input: generation.input,
    output: generation.output,
    errorMessage: generation.errorMessage,
    promptTokens: generation.usage?.promptTokens ?? null,
    completionTokens: generation.usage?.completionTokens ?? null,
    totalTokens: generation.usage?.totalTokens ?? null,
    costCents: generation.costCents,
    durationMs: generation.durationMs,
    createdAt: new Date(generation.createdAt),
    completedAt: generation.completedAt ? new Date(generation.completedAt) : null,
  };
}

async function recordFailedGeneration(params: {
  userId: string;
  conversationId: string;
  input: unknown;
  error: unknown;
  startedAt: Date;
}): Promise<void> {
  const config = resolveOperation("chat");
  const completedAt = new Date();
  await db.insert(aiGenerations).values({
    id: randomUUID(),
    userId: params.userId,
    conversationId: params.conversationId,
    feature: config.feature,
    operation: config.operation,
    provider: config.provider,
    model: config.model,
    status: "failed",
    input: params.input,
    output: null,
    errorMessage: params.error instanceof Error ? params.error.message : "Chat generation failed.",
    durationMs: completedAt.getTime() - params.startedAt.getTime(),
    createdAt: params.startedAt,
    completedAt,
  });
}

const createConversationSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
});

const conversationIdSchema = z.object({ conversationId: z.string().min(1) });

const sendMessageSchema = z.object({
  conversationId: z.string().min(1).optional(),
  content: z.string().trim().min(1, "Message cannot be empty.").max(8000),
  tone: z.string().trim().max(60).optional(),
});

export const listConversations = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await requireUserId();
  return db
    .select()
    .from(aiConversations)
    .where(and(eq(aiConversations.userId, userId), eq(aiConversations.feature, "chat")))
    .orderBy(desc(aiConversations.updatedAt));
});

export const getConversationMessages = createServerFn({ method: "GET" })
  .validator((input: unknown) => conversationIdSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    await loadOwnedConversation(userId, data.conversationId);
    const rows = await db
      .select()
      .from(aiMessages)
      .where(and(eq(aiMessages.conversationId, data.conversationId), eq(aiMessages.userId, userId)))
      .orderBy(aiMessages.createdAt);
    return rows.map(toSerializableMessage);
  });

export const createConversation = createServerFn({ method: "POST" })
  .validator((input: unknown) => createConversationSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const [created] = await db
      .insert(aiConversations)
      .values({ id: randomUUID(), userId, feature: "chat", title: data.title ?? null })
      .returning();
    return assertRow(created, "Failed to create conversation.");
  });

export const sendChatMessage = createServerFn({ method: "POST" })
  .validator((input: unknown) => sendMessageSchema.parse(input))
  .handler(async ({ data }) => {
    const userId = await requireUserId();
    const startedAt = new Date();

    const conversation = data.conversationId
      ? await loadOwnedConversation(userId, data.conversationId)
      : assertRow(
          (
            await db
              .insert(aiConversations)
              .values({ id: randomUUID(), userId, feature: "chat" })
              .returning()
          )[0],
          "Failed to create conversation.",
        );

    const priorMessages = await db
      .select()
      .from(aiMessages)
      .where(eq(aiMessages.conversationId, conversation.id))
      .orderBy(aiMessages.createdAt);

    const [userMessageRow] = await db
      .insert(aiMessages)
      .values({ id: randomUUID(), conversationId: conversation.id, userId, role: "user", content: data.content })
      .returning();
    assertRow(userMessageRow, "Failed to store message.");

    const history: ChatMessage[] = [
      ...priorMessages.map((m) => ({ role: m.role as ChatRole, content: m.content })),
      { role: "user", content: data.content },
    ];

    try {
      const result = await chat({
        userId,
        messages: history,
        conversationId: conversation.id,
        ...(data.tone !== undefined ? { tone: data.tone } : {}),
      });

      const [assistantRow] = await db
        .insert(aiMessages)
        .values({
          id: randomUUID(),
          conversationId: conversation.id,
          userId,
          role: "assistant",
          content: result.message.content,
        })
        .returning();

      await db.insert(aiGenerations).values(toDbGeneration(userId, result.generation));
      await db
        .update(aiConversations)
        .set({ updatedAt: new Date() })
        .where(eq(aiConversations.id, conversation.id));

      return {
        conversationId: conversation.id,
        message: toSerializableMessage(assertRow(assistantRow, "Failed to store assistant message.")),
        generation: toSerializableGeneration(result.generation),
      };
    } catch (error) {
      await recordFailedGeneration({
        userId,
        conversationId: conversation.id,
        input: { messages: history, tone: data.tone },
        error,
        startedAt,
      });
      throw error;
    }
  });
