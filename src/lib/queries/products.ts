"use server";

import { db } from "@/lib/db";
import { products, sales, cashbacks } from "@/lib/db/schema";
import { eq, and, desc, sql, ne } from "drizzle-orm";

export async function getProductsByUser(userId: string) {
  return db
    .select()
    .from(products)
    .where(eq(products.userId, userId))
    .orderBy(desc(products.createdAt));
}

export async function getProductById(productId: string, userId: string) {
  const result = await db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.userId, userId)))
    .limit(1);
  return result[0] ?? null;
}

export async function getProductWithSale(productId: string, userId: string) {
  const product = await getProductById(productId, userId);
  if (!product) return null;

  const sale = await db
    .select()
    .from(sales)
    .where(eq(sales.productId, productId))
    .limit(1);

  const productCashbacks = await db
    .select()
    .from(cashbacks)
    .where(eq(cashbacks.productId, productId));

  return {
    ...product,
    sale: sale[0] ?? null,
    cashbacks: productCashbacks,
  };
}

export async function getStockProducts(userId: string) {
  return db
    .select()
    .from(products)
    .where(and(eq(products.userId, userId), ne(products.status, "vendu")))
    .orderBy(desc(products.createdAt));
}

export async function getStockCount(userId: string) {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(and(eq(products.userId, userId), ne(products.status, "vendu")));
  return result[0]?.count ?? 0;
}

export async function getStockValue(userId: string) {
  const result = await db
    .select({
      total: sql<number>`coalesce(sum(cast(${products.purchasePrice} as decimal)), 0)`,
    })
    .from(products)
    .where(and(eq(products.userId, userId), ne(products.status, "vendu")));
  return Number(result[0]?.total ?? 0);
}
