import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, count, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { plannerItems, projectActivity, projects } from "@/db/schema";

async function requireUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: getRequest().headers });
  if (!session) {
    throw new Error("Not authenticated.");
  }
  return session.user.id;
}

const RECENT_PROJECTS_LIMIT = 5;
const UPCOMING_WINDOW_DAYS = 30;

export const getDashboardSummary = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await requireUserId();
  const now = new Date();
  const windowEnd = new Date(now.getTime() + UPCOMING_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [[projectsTotal], [scheduledTotal], recentProjects] = await Promise.all([
    db.select({ value: count() }).from(projects).where(eq(projects.userId, userId)),
    db
      .select({ value: count() })
      .from(plannerItems)
      .where(
        and(
          eq(plannerItems.userId, userId),
          gte(plannerItems.scheduledAt, now),
          lte(plannerItems.scheduledAt, windowEnd),
        ),
      ),
    db
      .select()
      .from(projects)
      .where(and(eq(projects.userId, userId), eq(projects.archived, false)))
      .orderBy(desc(projects.updatedAt))
      .limit(RECENT_PROJECTS_LIMIT),
  ]);

  return {
    projectsCount: projectsTotal?.value ?? 0,
    scheduledCount: scheduledTotal?.value ?? 0,
    recentProjects,
  };
});

const RECENT_ACTIVITY_LIMIT = 8;

// Workspace-wide activity trail: project_activity rows are already recorded
// (real, not new) by projects.ts/project-content.ts/files.ts across every
// project the user owns -- this just aggregates across all of them instead
// of the one-project-at-a-time view listProjectActivity (project-content.ts)
// already provides. Only project-scoped actions are covered (there's no
// activity log for standalone chat/script/image generations outside a
// project), so this is a real but partial trail, not a full app-wide feed.
export const getRecentActivity = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await requireUserId();

  const rows = await db
    .select({
      id: projectActivity.id,
      action: projectActivity.action,
      detail: projectActivity.detail,
      createdAt: projectActivity.createdAt,
      projectId: projectActivity.projectId,
      projectName: projects.name,
    })
    .from(projectActivity)
    .innerJoin(projects, eq(projectActivity.projectId, projects.id))
    .where(eq(projectActivity.userId, userId))
    .orderBy(desc(projectActivity.createdAt))
    .limit(RECENT_ACTIVITY_LIMIT);

  return rows;
});
