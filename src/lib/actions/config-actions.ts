"use server";

import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth-utils";
import { setConfigValue } from "@/lib/queries/config";
import { revalidatePath } from "next/cache";

function requireStaffSession() {
  return auth().then((session) => {
    if (!session?.user?.id || !isAdminRole(session.user.role)) {
      throw new Error("Acces refuse");
    }
    return session;
  });
}

export async function updateWebhookUrlAction(url: string) {
  await requireStaffSession();

  const trimmed = url.trim();
  if (trimmed && !trimmed.startsWith("https://discord.com/api/webhooks/")) {
    throw new Error("URL de webhook Discord invalide");
  }

  await setConfigValue("discord_webhook_url", trimmed);
  revalidatePath("/admin");
}
