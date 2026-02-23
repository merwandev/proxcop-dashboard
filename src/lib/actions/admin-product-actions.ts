"use server";

import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth-utils";
import {
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
} from "@/lib/queries/admin-products";
import { revalidatePath } from "next/cache";

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
  revalidatePath("/admin");
  return result;
}

export async function deleteAdminProductAction(id: string) {
  const session = await auth();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    throw new Error("Non autorise");
  }

  await deleteAdminProduct(id);
  revalidatePath("/admin");
}
