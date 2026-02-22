"use server";

import { auth } from "@/lib/auth";
import { saveDashboardLayout, saveStatsLayout, type WidgetSize } from "@/lib/queries/user-preferences";
import { revalidatePath } from "next/cache";

export async function saveDashboardLayoutAction(widgets: string[], sizes?: Record<string, WidgetSize>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifie");

  await saveDashboardLayout(session.user.id, widgets, sizes ?? {});
  revalidatePath("/dashboard");
}

export async function saveStatsLayoutAction(widgets: string[], sizes?: Record<string, WidgetSize>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifie");

  await saveStatsLayout(session.user.id, widgets, sizes ?? {});
  revalidatePath("/stats");
}
