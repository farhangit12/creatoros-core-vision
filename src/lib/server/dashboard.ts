import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, count, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { auth } from "@/lib/auth";
import { plannerItems, projects } from "@/db/schema";

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
