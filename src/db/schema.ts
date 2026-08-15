import { boolean, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

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
  visibility: text("visibility").notNull().default("private"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const plannerItems = pgTable("planner_items", {
  id: text("id").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  projectId: text("projectId").references(() => projects.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  platform: text("platform").notNull(),
  stage: text("stage").notNull().default("Idea"),
  day: integer("day").notNull(),
  scheduledAt: timestamp("scheduledAt").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

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
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});
