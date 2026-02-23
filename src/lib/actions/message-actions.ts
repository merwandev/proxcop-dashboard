"use server";

import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth-utils";
import {
  sendMessage,
  markAsRead,
  markAllAsRead,
} from "@/lib/queries/messages";
import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/queries/admin-logs";

export async function sendMessageAction(data: {
  toUserId: string;
  subject: string;
  body: string;
}) {
  const session = await auth();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    throw new Error("Non autorise — seuls les admins peuvent envoyer des messages");
  }

  if (!data.subject.trim() || !data.body.trim()) {
    throw new Error("Sujet et message requis");
  }

  const result = await sendMessage({
    fromUserId: session.user.id,
    toUserId: data.toUserId,
    subject: data.subject.trim(),
    body: data.body.trim(),
  });

  await logAdminAction({
    adminId: session.user.id,
    action: "send_message",
    target: `user:${data.toUserId}`,
    details: `Message envoye: "${data.subject.trim()}"`,
  });

  revalidatePath("/inbox");
  revalidatePath("/admin");
  return result;
}

export async function markMessageAsReadAction(messageId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifie");

  await markAsRead(messageId, session.user.id);
  revalidatePath("/inbox");
}

export async function markAllMessagesAsReadAction() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifie");

  await markAllAsRead(session.user.id);
  revalidatePath("/inbox");
}
