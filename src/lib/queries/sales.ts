"use server";

import { db } from "@/lib/db";
import { sales, productVariants, products, users } from "@/lib/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";

export async function getSalesByUser(userId: string) {
  return db
    .select({
      sale: sales,
      variant: productVariants,
      product: products,
    })
    .from(sales)
    .innerJoin(productVariants, eq(sales.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(eq(sales.userId, userId))
    .orderBy(desc(sales.saleDate));
}

/**
 * Batch fetch median sale prices for all size variants of a given SKU.
 * Uses PERCENTILE_CONT(0.5) — true median, not average.
 * Only returns sizes with >= 3 sales to avoid misleading data.
 */
export async function getMedianSalePricesBatch(sku: string) {
  const result = await db
    .select({
      sizeVariant: sql<string>`upper(${productVariants.sizeVariant})`,
      median: sql<number>`percentile_cont(0.5) within group (order by cast(${sales.salePrice} as decimal))`,
      count: sql<number>`count(*)`,
    })
    .from(sales)
    .innerJoin(productVariants, eq(sales.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(sql`upper(${products.sku}) = upper(${sku})`)
    .groupBy(sql`upper(${productVariants.sizeVariant})`)
    .having(sql`count(*) >= 3`);

  const map: Record<string, { median: number; saleCount: number }> = {};
  for (const row of result) {
    if (row.sizeVariant) {
      map[row.sizeVariant] = {
        median: Number(row.median),
        saleCount: Number(row.count),
      };
    }
  }
  return map;
}

/**
 * Get overall median sale price for a SKU (across all sizes and users).
 * Returns null if fewer than 3 sales exist.
 */
export async function getOverallMedianSalePrice(sku: string) {
  const result = await db
    .select({
      median: sql<number>`percentile_cont(0.5) within group (order by cast(${sales.salePrice} as decimal))`,
      count: sql<number>`count(*)`,
    })
    .from(sales)
    .innerJoin(productVariants, eq(sales.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(sql`upper(${products.sku}) = upper(${sku})`);

  if (!result[0] || Number(result[0].count) < 3) return null;
  return { median: Number(result[0].median), saleCount: Number(result[0].count) };
}

/**
 * Get community sales for a specific SKU (across all users).
 * Privacy-safe: only exposes salePrice, date, platform, size — no purchase price or profit.
 */
export async function getSalesBySku(sku: string) {
  const result = await db
    .select({
      saleId: sales.id,
      salePrice: sales.salePrice,
      saleDate: sales.saleDate,
      platform: sales.platform,
      sizeVariant: productVariants.sizeVariant,
    })
    .from(sales)
    .innerJoin(productVariants, eq(sales.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .innerJoin(users, eq(sales.userId, users.id))
    .where(and(
      sql`upper(${products.sku}) = upper(${sku})`,
      eq(users.communityOptIn, true),
    ))
    .orderBy(sales.saleDate);

  return result.map((r) => ({
    saleId: r.saleId,
    salePrice: Number(r.salePrice),
    saleDate: r.saleDate,
    platform: r.platform,
    sizeVariant: r.sizeVariant,
  }));
}

/**
 * Get recent community sales for the anonymous feed.
 * Deliberately excludes userId, purchasePrice, fees, notes for privacy.
 */
export async function getCommunitySales(limit = 50) {
  return db
    .select({
      saleId: sales.id,
      productName: products.name,
      sku: products.sku,
      imageUrl: products.imageUrl,
      sizeVariant: productVariants.sizeVariant,
      salePrice: sales.salePrice,
      platform: sales.platform,
      saleDate: sales.saleDate,
      category: products.category,
    })
    .from(sales)
    .innerJoin(productVariants, eq(sales.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .innerJoin(users, eq(sales.userId, users.id))
    .where(eq(users.communityOptIn, true))
    .orderBy(desc(sales.saleDate), desc(sales.createdAt))
    .limit(limit);
}
