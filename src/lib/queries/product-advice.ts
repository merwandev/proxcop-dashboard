import { db } from "@/lib/db";
import { productAdvice, users, products } from "@/lib/db/schema";
import { eq, desc, and, inArray, sql, ne } from "drizzle-orm";

/**
 * Get all advice entries (staff only — admin panel).
 */
export async function getAllAdvice() {
  return db
    .select({
      id: productAdvice.id,
      sku: productAdvice.sku,
      title: productAdvice.title,
      message: productAdvice.message,
      severity: productAdvice.severity,
      active: productAdvice.active,
      createdAt: productAdvice.createdAt,
      creatorUsername: users.discordUsername,
    })
    .from(productAdvice)
    .leftJoin(users, eq(productAdvice.createdBy, users.id))
    .orderBy(desc(productAdvice.createdAt));
}

/**
 * Get active advice for a list of SKUs (user-facing).
 * Returns only active advice matching the user's product SKUs.
 */
export async function getActiveAdviceForSkus(skus: string[]) {
  if (skus.length === 0) return [];

  const upperSkus = skus.map((s) => s.toUpperCase());

  return db
    .select({
      id: productAdvice.id,
      sku: productAdvice.sku,
      title: productAdvice.title,
      message: productAdvice.message,
      severity: productAdvice.severity,
      readBy: productAdvice.readBy,
      createdAt: productAdvice.createdAt,
    })
    .from(productAdvice)
    .where(
      and(
        eq(productAdvice.active, true),
        inArray(productAdvice.sku, upperSkus)
      )
    )
    .orderBy(desc(productAdvice.createdAt));
}

/**
 * Create a new advice entry.
 */
export async function createAdvice(data: {
  sku: string;
  title: string;
  message: string;
  severity: string;
  createdBy: string;
}) {
  const [advice] = await db
    .insert(productAdvice)
    .values({
      sku: data.sku.toUpperCase(),
      title: data.title,
      message: data.message,
      severity: data.severity,
      createdBy: data.createdBy,
    })
    .returning();
  return advice;
}

/**
 * Toggle the active status of an advice entry.
 */
export async function toggleAdviceActive(adviceId: string) {
  const [existing] = await db
    .select({ active: productAdvice.active })
    .from(productAdvice)
    .where(eq(productAdvice.id, adviceId))
    .limit(1);

  if (!existing) return null;

  const [updated] = await db
    .update(productAdvice)
    .set({ active: !existing.active, updatedAt: new Date() })
    .where(eq(productAdvice.id, adviceId))
    .returning();
  return updated;
}

/**
 * Delete an advice entry.
 */
export async function deleteAdvice(adviceId: string) {
  await db.delete(productAdvice).where(eq(productAdvice.id, adviceId));
}

/**
 * Mark an advice as read by a specific user.
 * Uses jsonb append to add userId to readBy array if not already present.
 */
export async function markAdviceAsRead(adviceId: string, userId: string) {
  const [existing] = await db
    .select({ readBy: productAdvice.readBy })
    .from(productAdvice)
    .where(eq(productAdvice.id, adviceId))
    .limit(1);

  if (!existing) return null;

  const currentReadBy = (existing.readBy ?? []) as string[];
  if (currentReadBy.includes(userId)) return existing;

  const [updated] = await db
    .update(productAdvice)
    .set({
      readBy: [...currentReadBy, userId],
      updatedAt: new Date(),
    })
    .where(eq(productAdvice.id, adviceId))
    .returning();

  return updated;
}

/**
 * Check if a user has unread active advice for any of their products.
 * Returns true if there's at least one active advice not read by this user.
 */
export async function hasUnreadAdvice(userId: string): Promise<boolean> {
  // Get user's product SKUs (distinct, non-null)
  const userSkus = await db
    .select({ sku: sql<string>`upper(${products.sku})` })
    .from(products)
    .where(and(eq(products.userId, userId), sql`${products.sku} is not null`))
    .groupBy(products.sku);

  if (userSkus.length === 0) return false;

  const skuList = userSkus.map((s) => s.sku).filter(Boolean);
  if (skuList.length === 0) return false;

  // Check for active advice on those SKUs where user is NOT in readBy
  const unread = await db
    .select({ id: productAdvice.id })
    .from(productAdvice)
    .where(
      and(
        eq(productAdvice.active, true),
        inArray(productAdvice.sku, skuList),
        sql`NOT (${productAdvice.readBy}::jsonb @> to_jsonb(${userId}::text))`
      )
    )
    .limit(1);

  return unread.length > 0;
}
