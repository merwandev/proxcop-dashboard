"use server";

import { db } from "@/lib/db";
import { cashbacks, productVariants, products } from "@/lib/db/schema";
import { eq, and, desc, sql, ne, notInArray } from "drizzle-orm";

/**
 * Get all cashbacks for a user with product info, for the dedicated cashback page.
 */
export async function getUserCashbacks(userId: string) {
  const rows = await db
    .select({
      id: cashbacks.id,
      amount: cashbacks.amount,
      source: cashbacks.source,
      status: cashbacks.status,
      requestedAt: cashbacks.requestedAt,
      receivedAt: cashbacks.receivedAt,
      createdAt: cashbacks.createdAt,
      variantId: cashbacks.variantId,
      productName: products.name,
      productImage: products.imageUrl,
      productSku: products.sku,
      sizeVariant: productVariants.sizeVariant,
    })
    .from(cashbacks)
    .innerJoin(productVariants, eq(cashbacks.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(eq(cashbacks.userId, userId))
    .orderBy(desc(cashbacks.createdAt));

  return rows;
}

/**
 * Get user's variants that don't have a cashback yet (for adding from /cashback page).
 */
export async function getVariantsWithoutCashback(userId: string) {
  // Get variant IDs that already have cashbacks
  const existingCashbackVariantIds = await db
    .select({ variantId: cashbacks.variantId })
    .from(cashbacks)
    .where(eq(cashbacks.userId, userId));

  const excludeIds = existingCashbackVariantIds.map((c) => c.variantId);

  const rows = await db
    .select({
      variantId: productVariants.id,
      productName: products.name,
      productImage: products.imageUrl,
      productSku: products.sku,
      sizeVariant: productVariants.sizeVariant,
      purchasePrice: productVariants.purchasePrice,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(
      and(
        eq(productVariants.userId, userId),
        ne(productVariants.status, "vendu"),
        ...(excludeIds.length > 0 ? [notInArray(productVariants.id, excludeIds)] : []),
      )
    )
    .orderBy(desc(productVariants.createdAt))
    .limit(100);

  return rows;
}

/**
 * Get cashback summary KPIs for the dashboard.
 */
export async function getCashbackSummary(userId: string) {
  const result = await db
    .select({
      totalReceived: sql<number>`coalesce(sum(case when ${cashbacks.status} = 'received' then cast(${cashbacks.amount} as decimal) else 0 end), 0)`,
      totalPending: sql<number>`coalesce(sum(case when ${cashbacks.status} != 'received' then cast(${cashbacks.amount} as decimal) else 0 end), 0)`,
      countTotal: sql<number>`count(*)::int`,
      countToRequest: sql<number>`count(case when ${cashbacks.status} = 'to_request' then 1 end)::int`,
      countRequested: sql<number>`count(case when ${cashbacks.status} = 'requested' then 1 end)::int`,
      countApproved: sql<number>`count(case when ${cashbacks.status} = 'approved' then 1 end)::int`,
      countReceived: sql<number>`count(case when ${cashbacks.status} = 'received' then 1 end)::int`,
    })
    .from(cashbacks)
    .where(eq(cashbacks.userId, userId));

  return result[0] ?? {
    totalReceived: 0,
    totalPending: 0,
    countTotal: 0,
    countToRequest: 0,
    countRequested: 0,
    countApproved: 0,
    countReceived: 0,
  };
}
