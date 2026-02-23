"use server";

import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth-utils";
import {
  createAdvice,
  toggleAdviceActive,
  deleteAdvice,
  markAdviceAsRead,
} from "@/lib/queries/product-advice";
import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/queries/admin-logs";

function requireStaffSession() {
  return auth().then((session) => {
    if (!session?.user?.id || !isAdminRole(session.user.role)) {
      throw new Error("Acces refuse");
    }
    return session;
  });
}

export async function createAdviceAction(data: {
  sku: string;
  title: string;
  message: string;
  severity: string;
}) {
  const session = await requireStaffSession();

  if (!data.sku || data.sku.trim().length < 2) {
    throw new Error("SKU invalide");
  }
  if (!data.title || data.title.trim().length < 2) {
    throw new Error("Titre requis");
  }
  if (!data.message || data.message.trim().length < 5) {
    throw new Error("Message requis (min 5 caracteres)");
  }

  await createAdvice({
    sku: data.sku.trim(),
    title: data.title.trim(),
    message: data.message.trim(),
    severity: data.severity,
    createdBy: session.user.id,
  });

  await logAdminAction({
    adminId: session.user.id,
    action: "create_advice",
    target: `sku:${data.sku.trim()}`,
    details: `Conseil cree pour "${data.title.trim()}" (${data.severity})`,
  });

  revalidatePath("/admin");
  revalidatePath("/stock");
}

export async function toggleAdviceAction(adviceId: string) {
  const session = await requireStaffSession();

  await toggleAdviceActive(adviceId);

  await logAdminAction({
    adminId: session.user.id,
    action: "toggle_advice",
    target: `advice:${adviceId}`,
    details: `Conseil active/desactive`,
  });

  revalidatePath("/admin");
  revalidatePath("/stock");
}

export async function deleteAdviceAction(adviceId: string) {
  const session = await requireStaffSession();

  await deleteAdvice(adviceId);

  await logAdminAction({
    adminId: session.user.id,
    action: "delete_advice",
    target: `advice:${adviceId}`,
    details: `Conseil supprime`,
  });

  revalidatePath("/admin");
  revalidatePath("/stock");
}

/**
 * Dismiss an advice for the current user (mark as read).
 * Any authenticated user can dismiss — no admin required.
 */
export async function dismissAdviceAction(adviceId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifie");

  await markAdviceAsRead(adviceId, session.user.id);

  revalidatePath("/stock");
}
