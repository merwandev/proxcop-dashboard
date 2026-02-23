"use server";

import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth-utils";
import {
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
} from "@/lib/queries/admin-products";
import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/queries/admin-logs";

export async function createAdminProductAction(data: {
  name: string;
  sku?: string;
  imageUrl?: string;
  category: string;
  sizes?: string[];
}) {
  const session = await auth();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    throw new Error("Non autorise");
  }

  const result = await createAdminProduct({
    ...data,
    createdBy: session.user.id,
  });

  await logAdminAction({
    adminId: session.user.id,
    action: "create_admin_product",
    target: `product:${data.name}`,
    details: `Ajout produit admin "${data.name}" (SKU: ${data.sku ?? "aucun"})`,
  });

  revalidatePath("/admin");
  return result;
}

export async function updateAdminProductAction(
  id: string,
  data: {
    name?: string;
    sku?: string;
    imageUrl?: string | null;
    category?: string;
    sizes?: string[];
  }
) {
  const session = await auth();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    throw new Error("Non autorise");
  }

  const result = await updateAdminProduct(id, data);

  await logAdminAction({
    adminId: session.user.id,
    action: "update_admin_product",
    target: `product:${id}`,
    details: `Modification produit admin${data.name ? ` "${data.name}"` : ""}`,
  });

  revalidatePath("/admin");
  return result;
}

export async function deleteAdminProductAction(id: string) {
  const session = await auth();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    throw new Error("Non autorise");
  }

  await deleteAdminProduct(id);

  await logAdminAction({
    adminId: session.user.id,
    action: "delete_admin_product",
    target: `product:${id}`,
    details: `Suppression produit admin`,
  });

  revalidatePath("/admin");
}
