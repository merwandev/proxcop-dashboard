"use server";

import { auth } from "@/lib/auth";
import {
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "@/lib/queries/suppliers";
import { revalidatePath } from "next/cache";

export async function createSupplierAction(data: {
  name: string;
  returnDays: string | null;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifie");

  const supplier = await createSupplier(
    session.user.id,
    data.name.trim(),
    data.returnDays
  );

  revalidatePath("/settings");
  revalidatePath("/stock/add");
  return supplier;
}

export async function updateSupplierAction(
  supplierId: string,
  data: { name?: string; returnDays?: string | null }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifie");

  const updated = await updateSupplier(supplierId, session.user.id, {
    ...data,
    name: data.name?.trim(),
  });

  revalidatePath("/settings");
  revalidatePath("/stock/add");
  return updated;
}

export async function deleteSupplierAction(supplierId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifie");

  const deleted = await deleteSupplier(supplierId, session.user.id);

  revalidatePath("/settings");
  revalidatePath("/stock/add");
  return deleted;
}
