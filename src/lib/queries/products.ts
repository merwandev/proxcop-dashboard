"use server";

import { db } from "@/lib/db";
import { products, productVariants, sales, cashbacks } from "@/lib/db/schema";
import { eq, and, desc, sql, ne, inArray, gte } from "drizzle-orm";

/**
 * Get all products grouped by SKU (when available) with variant counts for stock page.
 * Products with the same SKU are merged into a single row.
 * Only returns groups that have at least 1 non-sold variant.
 */
export async function getStockProductsGrouped(userId: string) {
  const result = await db
    .select({
      id: sql<string>`min(${products.id}::text)`,
      name: sql<string>`(array_agg(${products.name} order by ${products.createdAt} desc))[1]`,
      sku: sql<string | null>`max(${products.sku})`,
      category: sql<string>`(array_agg(${products.category}::text order by ${products.createdAt} desc))[1]`,
      imageUrl: sql<string | null>`(array_agg(${products.imageUrl} order by case when ${products.imageUrl} is not null then 0 else 1 end, ${products.createdAt} desc))[1]`,
      createdAt: sql<Date>`max(${products.createdAt})`,
      inStockCount: sql<number>`count(case when ${productVariants.status} != 'vendu' then 1 end)`,
      totalCount: sql<number>`count(*)`,
      totalValue: sql<number>`coalesce(sum(case when ${productVariants.status} != 'vendu' then cast(${productVariants.purchasePrice} as decimal) end), 0)`,
      oldestPurchaseDate: sql<string>`min(case when ${productVariants.status} != 'vendu' then ${productVariants.purchaseDate} end)`,
      nearestReturnDeadline: sql<string | null>`min(case when ${productVariants.status} != 'vendu' and ${productVariants.returnDeadline} is not null then ${productVariants.returnDeadline} end)`,
      hasUnlistedVariants: sql<boolean>`bool_or(case when ${productVariants.status} != 'vendu' and (${productVariants.listedOn} is null or ${productVariants.listedOn}::text = '[]') then true else false end)`,
      variantStatuses: sql<string[]>`array_agg(distinct case when ${productVariants.status} != 'vendu' then ${productVariants.status}::text end)`,
      allProductIds: sql<string[]>`array_agg(distinct ${products.id}::text)`,
    })
    .from(products)
    .innerJoin(productVariants, eq(products.id, productVariants.productId))
    .where(eq(products.userId, userId))
    .groupBy(sql`coalesce(${products.sku}, ${products.id}::text)`)
    .having(sql`count(case when ${productVariants.status} != 'vendu' then 1 end) > 0`)
    .orderBy(sql`max(${products.createdAt}) desc`);

  // Fallback: for products with no image but a SKU, try to find an image from any product with the same SKU
  const missingImageSkus = result
    .filter((r) => !r.imageUrl && r.sku)
    .map((r) => r.sku!);

  if (missingImageSkus.length > 0) {
    const fallbackImages = await db
      .select({
        sku: products.sku,
        imageUrl: sql<string>`(array_agg(${products.imageUrl} order by ${products.createdAt} desc))[1]`,
      })
      .from(products)
      .where(and(
        inArray(products.sku, missingImageSkus),
        sql`${products.imageUrl} is not null`,
      ))
      .groupBy(products.sku);

    const fallbackMap = new Map(fallbackImages.map((f) => [f.sku, f.imageUrl]));
    for (const row of result) {
      if (!row.imageUrl && row.sku && fallbackMap.has(row.sku)) {
        row.imageUrl = fallbackMap.get(row.sku)!;
      }
    }
  }

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

  // Fallback: if product has no image but has a SKU, try to find an image from any product with the same SKU
  let resolvedImageUrl = product[0].imageUrl;
  if (!resolvedImageUrl && product[0].sku) {
    const fallback = await db
      .select({ imageUrl: products.imageUrl })
      .from(products)
      .where(and(
        eq(products.sku, product[0].sku),
        sql`${products.imageUrl} is not null`,
      ))
      .limit(1);
    if (fallback[0]?.imageUrl) {
      resolvedImageUrl = fallback[0].imageUrl;
    }
  }

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

  // Get cashbacks for all variants
  const variantIds = variants.map((v) => v.id);
  const allCashbacks = variantIds.length > 0
    ? await db.select().from(cashbacks).where(inArray(cashbacks.variantId, variantIds))
    : [];

  // Group cashbacks by variant ID
  const cashbacksByVariant: Record<string, typeof allCashbacks> = {};
  for (const cb of allCashbacks) {
    if (!cashbacksByVariant[cb.variantId]) cashbacksByVariant[cb.variantId] = [];
    cashbacksByVariant[cb.variantId].push(cb);
  }

  return {
    ...product[0],
    imageUrl: resolvedImageUrl,
    variants: variants.map((v) => ({
      ...v,
      cashbacks: cashbacksByVariant[v.id] ?? [],
    })),
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
 * Aggregated KPIs for stock page header.
 */
export async function getStockKPIs(userId: string) {
  const result = await db
    .select({
      totalPairs: sql<number>`count(*)`,
      totalValue: sql<number>`coalesce(sum(cast(${productVariants.purchasePrice} as decimal)), 0)`,
      avgPrice: sql<number>`coalesce(avg(cast(${productVariants.purchasePrice} as decimal)), 0)`,
      avgDaysInStock: sql<number>`coalesce(avg(extract(day from now() - ${productVariants.purchaseDate}::timestamp)), 0)`,
    })
    .from(productVariants)
    .where(and(eq(productVariants.userId, userId), ne(productVariants.status, "vendu")));
  return {
    totalPairs: Number(result[0]?.totalPairs ?? 0),
    totalValue: Math.round(Number(result[0]?.totalValue ?? 0) * 100) / 100,
    avgPrice: Math.round(Number(result[0]?.avgPrice ?? 0) * 100) / 100,
    avgDaysInStock: Math.round(Number(result[0]?.avgDaysInStock ?? 0)),
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

/**
 * Get user's most recently added products (unique by SKU or name).
 */
export async function getRecentProducts(userId: string, limit = 5) {
  const result = await db
    .select({
      name: sql<string>`(array_agg(${products.name} order by ${products.createdAt} desc))[1]`,
      sku: sql<string | null>`max(${products.sku})`,
      imageUrl: sql<string | null>`(array_agg(${products.imageUrl} order by case when ${products.imageUrl} is not null then 0 else 1 end, ${products.createdAt} desc))[1]`,
      category: sql<string>`(array_agg(${products.category}::text order by ${products.createdAt} desc))[1]`,
      lastAdded: sql<Date>`max(${products.createdAt})`,
    })
    .from(products)
    .where(eq(products.userId, userId))
    .groupBy(sql`coalesce(upper(${products.sku}), ${products.name})`)
    .orderBy(sql`max(${products.createdAt}) desc`)
    .limit(limit);

  return result;
}

/**
 * Get trending products across all users (most added in last N days).
 * Anonymous: only product name, SKU, image, add count.
 */
export async function getTrendingProducts(daysBack = 7, limit = 5) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);

  const result = await db
    .select({
      name: sql<string>`(array_agg(${products.name} order by ${products.createdAt} desc))[1]`,
      sku: sql<string | null>`max(${products.sku})`,
      imageUrl: sql<string | null>`(array_agg(${products.imageUrl} order by case when ${products.imageUrl} is not null then 0 else 1 end, ${products.createdAt} desc))[1]`,
      addCount: sql<number>`count(distinct ${productVariants.id})`,
    })
    .from(products)
    .innerJoin(productVariants, eq(products.id, productVariants.productId))
    .where(gte(productVariants.createdAt, cutoff))
    .groupBy(sql`coalesce(upper(${products.sku}), ${products.name})`)
    .having(sql`count(distinct ${productVariants.id}) >= 2`)
    .orderBy(sql`count(distinct ${productVariants.id}) desc`)
    .limit(limit);

  return result;
}
