"use server";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_DASHBOARD_WIDGETS, DEFAULT_STATS_WIDGETS } from "@/lib/utils/widget-registry";

export async function getDashboardLayout(userId: string): Promise<string[]> {
  const result = await db
    .select({ dashboardLayout: users.dashboardLayout })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const layout = result[0]?.dashboardLayout;
  if (layout && Array.isArray(layout.widgets) && layout.widgets.length > 0) {
    return layout.widgets;
  }
  return DEFAULT_DASHBOARD_WIDGETS;
}

export async function getStatsLayout(userId: string): Promise<string[]> {
  const result = await db
    .select({ statsLayout: users.statsLayout })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const layout = result[0]?.statsLayout;
  if (layout && Array.isArray(layout.widgets) && layout.widgets.length > 0) {
    return layout.widgets;
  }
  return DEFAULT_STATS_WIDGETS;
}

export async function saveDashboardLayout(userId: string, widgets: string[]) {
  await db
    .update(users)
    .set({ dashboardLayout: { widgets }, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function saveStatsLayout(userId: string, widgets: string[]) {
  await db
    .update(users)
    .set({ statsLayout: { widgets }, updatedAt: new Date() })
    .where(eq(users.id, userId));
}
