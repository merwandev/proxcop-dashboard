"use server";

import { auth } from "@/lib/auth";
import { saveDashboardLayout, saveStatsLayout } from "@/lib/queries/user-preferences";
import { revalidatePath } from "next/cache";

export async function saveDashboardLayoutAction(widgets: string[]) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifie");

  await saveDashboardLayout(session.user.id, widgets);
  revalidatePath("/dashboard");
}

export async function saveStatsLayoutAction(widgets: string[]) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifie");

  await saveStatsLayout(session.user.id, widgets);
  revalidatePath("/stats");
}
