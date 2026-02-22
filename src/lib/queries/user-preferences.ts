"use server";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_DASHBOARD_WIDGETS, DEFAULT_STATS_WIDGETS } from "@/lib/utils/widget-registry";

export type WidgetSize = "horizontal" | "square";

export interface LayoutConfig {
  widgets: string[];
  sizes: Record<string, WidgetSize>;
}

export async function getDashboardLayout(userId: string): Promise<LayoutConfig> {
  const result = await db
    .select({ dashboardLayout: users.dashboardLayout })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const layout = result[0]?.dashboardLayout;
  if (layout && Array.isArray(layout.widgets) && layout.widgets.length > 0) {
    return {
      widgets: layout.widgets,
      sizes: layout.sizes ?? {},
    };
  }
  return { widgets: DEFAULT_DASHBOARD_WIDGETS, sizes: {} };
}

export async function getStatsLayout(userId: string): Promise<LayoutConfig> {
  const result = await db
    .select({ statsLayout: users.statsLayout })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const layout = result[0]?.statsLayout;
  if (layout && Array.isArray(layout.widgets) && layout.widgets.length > 0) {
    return {
      widgets: layout.widgets,
      sizes: layout.sizes ?? {},
    };
  }
  return { widgets: DEFAULT_STATS_WIDGETS, sizes: {} };
}

export async function saveDashboardLayout(userId: string, widgets: string[], sizes: Record<string, WidgetSize> = {}) {
  await db
    .update(users)
    .set({ dashboardLayout: { widgets, sizes }, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function saveStatsLayout(userId: string, widgets: string[], sizes: Record<string, WidgetSize> = {}) {
  await db
    .update(users)
    .set({ statsLayout: { widgets, sizes }, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

// ─── Tax Settings ───────────────────────────────────────────────────

export interface TaxSettings {
  tvaEnabled: boolean;
  tvaRate: number;
}

export async function getTaxSettings(userId: string): Promise<TaxSettings> {
  const result = await db
    .select({ tvaEnabled: users.tvaEnabled, tvaRate: users.tvaRate })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return {
    tvaEnabled: result[0]?.tvaEnabled ?? false,
    tvaRate: Number(result[0]?.tvaRate ?? 0),
  };
}

export async function saveTaxSettings(userId: string, enabled: boolean, rate: number) {
  await db
    .update(users)
    .set({ tvaEnabled: enabled, tvaRate: rate.toFixed(2), updatedAt: new Date() })
    .where(eq(users.id, userId));
}

// ─── Community Opt-In ───────────────────────────────────────────────

export async function getCommunityOptIn(userId: string): Promise<boolean> {
  const result = await db
    .select({ communityOptIn: users.communityOptIn })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return result[0]?.communityOptIn ?? true;
}

export async function saveCommunityOptIn(userId: string, optIn: boolean) {
  await db
    .update(users)
    .set({ communityOptIn: optIn, updatedAt: new Date() })
    .where(eq(users.id, userId));
}
