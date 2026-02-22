"use server";

import { db } from "@/lib/db";
import { products, productVariants, sales, cashbacks } from "@/lib/db/schema";
import { eq, and, desc, sql, ne, inArray } from "drizzle-orm";

/**
 * Get all product parents grouped with variant counts for stock page.
 * Only returns products that have at least 1 non-sold variant.
 */
export async function getStockProductsGrouped(userId: string) {
  const result = await db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      category: products.category,
      imageUrl: products.imageUrl,
      notes: products.notes,
      createdAt: products.createdAt,
      inStockCount: sql<number>`count(case when ${productVariants.status} != 'vendu' then 1 end)`,
      totalCount: sql<number>`count(*)`,
      totalValue: sql<number>`coalesce(sum(case when ${productVariants.status} != 'vendu' then cast(${productVariants.purchasePrice} as decimal) end), 0)`,
      oldestPurchaseDate: sql<string>`min(case when ${productVariants.status} != 'vendu' then ${productVariants.purchaseDate} end)`,
      nearestReturnDeadline: sql<string | null>`min(case when ${productVariants.status} != 'vendu' and ${productVariants.returnDeadline} is not null then ${productVariants.returnDeadline} end)`,
      hasUnlistedVariants: sql<boolean>`bool_or(case when ${productVariants.status} != 'vendu' and (${productVariants.listedOn} is null or ${productVariants.listedOn}::text = '[]') then true else false end)`,
      variantStatuses: sql<string[]>`array_agg(distinct case when ${productVariants.status} != 'vendu' then ${productVariants.status}::text end)`,
    })
    .from(products)
    .innerJoin(productVariants, eq(products.id, productVariants.productId))
    .where(eq(products.userId, userId))
    .groupBy(products.id)
    .having(sql`count(case when ${productVariants.status} != 'vendu' then 1 end) > 0`)
    .orderBy(desc(products.createdAt));

  return result;
}

/**
 * Get all product parents (including fully-sold ones) for filter views.
 */
export async function getProductsByUser(userId: string) {
  const result = await db
    .select({
      id: products.id,
      name: products.name,
      sku: products.sku,
      category: products.category,
      imageUrl: products.imageUrl,
      notes: products.notes,
      createdAt: products.createdAt,
      inStockCount: sql<number>`count(case when ${productVariants.status} != 'vendu' then 1 end)`,
      totalCount: sql<number>`count(*)`,
      totalValue: sql<number>`coalesce(sum(case when ${productVariants.status} != 'vendu' then cast(${productVariants.purchasePrice} as decimal) end), 0)`,
      oldestPurchaseDate: sql<string>`min(case when ${productVariants.status} != 'vendu' then ${productVariants.purchaseDate} end)`,
    })
    .from(products)
    .innerJoin(productVariants, eq(products.id, productVariants.productId))
    .where(eq(products.userId, userId))
    .groupBy(products.id)
    .orderBy(desc(products.createdAt));

  return result;
}

/**
 * Get a single parent product with all its variants.
 * If the product has a SKU, also includes variants from other products with the same SKU.
 */
export async function getProductWithVariants(productId: string, userId: string) {
  const product = await db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.userId, userId)))
    .limit(1);

  if (!product[0]) return null;

  let variants;
  if (product[0].sku) {
    // Find all product IDs with the same SKU for this user
    const sameSkuProducts = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.userId, userId), eq(products.sku, product[0].sku)));

    const productIds = sameSkuProducts.map((p) => p.id);

    variants = await db
      .select()
      .from(productVariants)
      .where(inArray(productVariants.productId, productIds))
      .orderBy(productVariants.sizeVariant, desc(productVariants.createdAt));
  } else {
    variants = await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, productId))
      .orderBy(productVariants.sizeVariant, desc(productVariants.createdAt));
  }

  return {
    ...product[0],
    variants,
  };
}

/**
 * Get a single variant with its parent product info.
 */
export async function getVariantWithProduct(variantId: string, userId: string) {
  const result = await db
    .select({
      variant: productVariants,
      product: products,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(and(eq(productVariants.id, variantId), eq(productVariants.userId, userId)))
    .limit(1);

  if (!result[0]) return null;

  // Get sale info for this variant
  const saleResult = await db
    .select()
    .from(sales)
    .where(eq(sales.variantId, variantId))
    .limit(1);

  // Get cashbacks for this variant
  const variantCashbacks = await db
    .select()
    .from(cashbacks)
    .where(eq(cashbacks.variantId, variantId));

  return {
    ...result[0].variant,
    product: result[0].product,
    sale: saleResult[0] ?? null,
    cashbacks: variantCashbacks,
  };
}

/**
 * Count of variants in stock (status != vendu).
 */
export async function getStockCount(userId: string) {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(productVariants)
    .where(and(eq(productVariants.userId, userId), ne(productVariants.status, "vendu")));
  return result[0]?.count ?? 0;
}

/**
 * Total purchase value of variants in stock.
 */
export async function getStockValue(userId: string) {
  const result = await db
    .select({
      total: sql<number>`coalesce(sum(cast(${productVariants.purchasePrice} as decimal)), 0)`,
    })
    .from(productVariants)
    .where(and(eq(productVariants.userId, userId), ne(productVariants.status, "vendu")));
  return Number(result[0]?.total ?? 0);
}
