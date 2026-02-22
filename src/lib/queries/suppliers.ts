import { db } from "@/lib/db";
import { suppliers } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";

export async function getUserSuppliers(userId: string) {
  return db
    .select({
      id: suppliers.id,
      name: suppliers.name,
      returnDays: suppliers.returnDays,
      createdAt: suppliers.createdAt,
    })
    .from(suppliers)
    .where(eq(suppliers.userId, userId))
    .orderBy(asc(suppliers.name));
}

export async function createSupplier(
  userId: string,
  name: string,
  returnDays: string | null
) {
  const [supplier] = await db
    .insert(suppliers)
    .values({ userId, name, returnDays })
    .returning();
  return supplier;
}

export async function updateSupplier(
  supplierId: string,
  userId: string,
  data: { name?: string; returnDays?: string | null }
) {
  const [updated] = await db
    .update(suppliers)
    .set(data)
    .where(and(eq(suppliers.id, supplierId), eq(suppliers.userId, userId)))
    .returning();
  return updated;
}

export async function deleteSupplier(supplierId: string, userId: string) {
  const [deleted] = await db
    .delete(suppliers)
    .where(and(eq(suppliers.id, supplierId), eq(suppliers.userId, userId)))
    .returning();
  return deleted;
}
