"use server";

import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth-utils";
import {
  createAdvice,
  toggleAdviceActive,
  deleteAdvice,
} from "@/lib/queries/product-advice";
import { revalidatePath } from "next/cache";

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

  revalidatePath("/admin");
  revalidatePath("/stock");
}

export async function toggleAdviceAction(adviceId: string) {
  await requireStaffSession();

  await toggleAdviceActive(adviceId);

  revalidatePath("/admin");
  revalidatePath("/stock");
}

export async function deleteAdviceAction(adviceId: string) {
  await requireStaffSession();

  await deleteAdvice(adviceId);

  revalidatePath("/admin");
  revalidatePath("/stock");
}
