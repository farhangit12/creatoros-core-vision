import { boolean, index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  role: text("role"),
  website: text("website"),
  bio: text("bio"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  password: text("password"),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const auditLog = pgTable("audit_log", {
  id: text("id").primaryKey(),
  userId: text("userId").references(() => user.id, { onDelete: "set null" }),
  event: text("event").notNull(),
  metadata: jsonb("metadata"),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export const projectStatusValues = [
  "Idea",
  "In progress",
  "Review",
  "Published",
  "Archived",
] as const;

export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("Idea"),
  progress: integer("progress").notNull().default(0),
  tags: text("tags").array().notNull().default([]),
  favourite: boolean("favourite").notNull().default(false),
  archived: boolean("archived").notNull().default(false),
  cover: text("cover"),
  coverPattern: text("coverPattern"),
  template: text("template"),
  visibility: text("visibility").notNull().default("private"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const projectActivity = pgTable(
  "project_activity",
  {
    id: text("id").primaryKey(),
    projectId: text("projectId")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    detail: text("detail"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => [
    index("project_activity_projectId_idx").on(table.projectId),
    index("project_activity_createdAt_idx").on(table.createdAt),
  ],
);

export const plannerItems = pgTable("planner_items", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  projectId: text("projectId").references(() => projects.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  platform: text("platform").notNull(),
  stage: text("stage").notNull().default("Idea"),
  coverImage: text("coverImage"),
  day: integer("day").notNull(),
  scheduledAt: timestamp("scheduledAt").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const aiFeatureValues = [
  "chat",
  "script-studio",
  "image-studio",
  "thumbnail-studio",
] as const;

export const aiGenerationStatusValues = ["pending", "completed", "failed"] as const;

export const aiConversations = pgTable(
  "ai_conversations",
  {
    id: text("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    projectId: text("projectId").references(() => projects.id, { onDelete: "set null" }),
    feature: text("feature").notNull(),
    title: text("title"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => [
    index("ai_conversations_userId_idx").on(table.userId),
    index("ai_conversations_createdAt_idx").on(table.createdAt),
    index("ai_conversations_projectId_idx").on(table.projectId),
  ],
);

export const aiMessages = pgTable(
  "ai_messages",
  {
    id: text("id").primaryKey(),
    conversationId: text("conversationId")
      .notNull()
      .references(() => aiConversations.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    content: text("content").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => [
    index("ai_messages_conversationId_idx").on(table.conversationId),
    index("ai_messages_userId_idx").on(table.userId),
    index("ai_messages_createdAt_idx").on(table.createdAt),
  ],
);

export const aiGenerations = pgTable(
  "ai_generations",
  {
    id: text("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    conversationId: text("conversationId").references(() => aiConversations.id, {
      onDelete: "set null",
    }),
    projectId: text("projectId").references(() => projects.id, { onDelete: "set null" }),
    feature: text("feature").notNull(),
    operation: text("operation").notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    status: text("status").notNull().default("pending"),
    input: jsonb("input"),
    output: jsonb("output"),
    errorMessage: text("errorMessage"),
    promptTokens: integer("promptTokens"),
    completionTokens: integer("completionTokens"),
    totalTokens: integer("totalTokens"),
    costCents: integer("costCents"),
    durationMs: integer("durationMs"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    completedAt: timestamp("completedAt"),
  },
  (table) => [
    index("ai_generations_userId_idx").on(table.userId),
    index("ai_generations_conversationId_idx").on(table.conversationId),
    index("ai_generations_status_idx").on(table.status),
    index("ai_generations_createdAt_idx").on(table.createdAt),
    index("ai_generations_projectId_idx").on(table.projectId),
  ],
);

export const aiAssets = pgTable(
  "ai_assets",
  {
    id: text("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    generationId: text("generationId")
      .notNull()
      .references(() => aiGenerations.id, { onDelete: "cascade" }),
    projectId: text("projectId").references(() => projects.id, { onDelete: "set null" }),
    assetType: text("assetType").notNull(),
    url: text("url").notNull(),
    variantIndex: integer("variantIndex").notNull().default(0),
    width: integer("width"),
    height: integer("height"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => [
    index("ai_assets_userId_idx").on(table.userId),
    index("ai_assets_generationId_idx").on(table.generationId),
    index("ai_assets_createdAt_idx").on(table.createdAt),
    index("ai_assets_projectId_idx").on(table.projectId),
  ],
);

export const fileTypeValues = ["image", "video", "audio", "document", "other"] as const;

export const files = pgTable(
  "files",
  {
    id: text("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    projectId: text("projectId").references(() => projects.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    mimeType: text("mimeType").notNull(),
    fileType: text("fileType").notNull(),
    size: integer("size").notNull(),
    url: text("url").notNull(),
    storageKey: text("storageKey").notNull(),
    resourceType: text("resourceType").notNull(),
    width: integer("width"),
    height: integer("height"),
    favourite: boolean("favourite").notNull().default(false),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  },
  (table) => [
    index("files_userId_idx").on(table.userId),
    index("files_createdAt_idx").on(table.createdAt),
    index("files_projectId_idx").on(table.projectId),
  ],
);

export const userSettings = pgTable("user_settings", {
  userId: text("userId")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  notifyProductUpdates: boolean("notifyProductUpdates").notNull().default(true),
  notifyAiUpdates: boolean("notifyAiUpdates").notNull().default(true),
  notifyCreditWarnings: boolean("notifyCreditWarnings").notNull().default(true),
  notifyPlannerReminders: boolean("notifyPlannerReminders").notNull().default(true),
  defaultAiTone: text("defaultAiTone").notNull().default("Direct, dry"),
  autosaveDrafts: boolean("autosaveDrafts").notNull().default(true),
  keyboardFirstMode: boolean("keyboardFirstMode").notNull().default(true),
  theme: text("theme").notNull().default("dark"),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const planIdValues = ["free", "pro", "scale"] as const;

export const userCredits = pgTable("user_credits", {
  userId: text("userId")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  planId: text("planId").notNull().default("free"),
  balance: integer("balance").notNull().default(0),
  renewsAt: timestamp("renewsAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  // Polar.sh subscription linkage -- polarCustomerId is cached for
  // convenience/support lookups only; Polar's own Customer State (looked up
  // live by externalId = user.id) remains the real source of truth.
  polarCustomerId: text("polarCustomerId"),
  polarSubscriptionId: text("polarSubscriptionId"),
  subscriptionStatus: text("subscriptionStatus"),
});

export const creditLedgerReasonValues = [
  "signup_bonus",
  "monthly_reset",
  "ai_generation",
  "admin_adjustment",
  "subscription_granted",
  "plan_downgraded",
] as const;

export const creditLedger = pgTable(
  "credit_ledger",
  {
    id: text("id").primaryKey(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    delta: integer("delta").notNull(),
    reason: text("reason").notNull(),
    generationId: text("generationId").references(() => aiGenerations.id, { onDelete: "set null" }),
    balanceAfter: integer("balanceAfter").notNull(),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (table) => [index("credit_ledger_userId_idx").on(table.userId)],
);
