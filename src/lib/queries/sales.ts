"use server";

import { db } from "@/lib/db";
import { sales, productVariants, products } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";

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
 * Get all community sales for a specific SKU (across all users).
 * Returns sale details including profit for cumulative chart.
 */
export async function getSalesBySku(sku: string) {
  const result = await db
    .select({
      saleId: sales.id,
      salePrice: sales.salePrice,
      purchasePrice: productVariants.purchasePrice,
      platformFee: sales.platformFee,
      shippingCost: sales.shippingCost,
      otherFees: sales.otherFees,
      saleDate: sales.saleDate,
      platform: sales.platform,
      sizeVariant: productVariants.sizeVariant,
    })
    .from(sales)
    .innerJoin(productVariants, eq(sales.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(sql`upper(${products.sku}) = upper(${sku})`)
    .orderBy(sales.saleDate);

  return result.map((r) => {
    const salePrice = Number(r.salePrice);
    const purchasePrice = Number(r.purchasePrice);
    const fees =
      Number(r.platformFee ?? 0) +
      Number(r.shippingCost ?? 0) +
      Number(r.otherFees ?? 0);
    return {
      saleId: r.saleId,
      salePrice,
      purchasePrice,
      profit: salePrice - purchasePrice - fees,
      saleDate: r.saleDate,
      platform: r.platform,
      sizeVariant: r.sizeVariant,
    };
  });
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
    .orderBy(desc(sales.saleDate), desc(sales.createdAt))
    .limit(limit);
}
