"use server";

import { auth } from "@/lib/auth";
import { saveDashboardLayout, saveStatsLayout, saveTaxSettings, saveCommunityOptIn, saveSaleSuccessAnimation, type WidgetSize } from "@/lib/queries/user-preferences";
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

export async function saveTaxSettingsAction(enabled: boolean, rate: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifie");

  await saveTaxSettings(session.user.id, enabled, rate);
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  revalidatePath("/stats");
}

export async function saveCommunityOptInAction(optIn: boolean) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifie");

  await saveCommunityOptIn(session.user.id, optIn);
  revalidatePath("/settings");
  revalidatePath("/ventes");
}

export async function saveSaleSuccessAnimationAction(enabled: boolean) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifie");

  await saveSaleSuccessAnimation(session.user.id, enabled);
  revalidatePath("/settings");
  revalidatePath("/stock");
}
