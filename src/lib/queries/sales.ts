"use server";

import { db } from "@/lib/db";
import { sales, productVariants, products, users } from "@/lib/db/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";

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

/**
 * Top products by ROI (profit %) in the last N days.
 * Anonymous: only product name, SKU, image, avg ROI, sale count.
 * Requires at least 2 sales to be meaningful.
 */
export async function getCommunityTopROI(daysBack = 7, limit = 5) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const result = await db
    .select({
      productName: sql<string>`(array_agg(${products.name} order by ${sales.saleDate} desc))[1]`,
      sku: sql<string | null>`max(${products.sku})`,
      imageUrl: sql<string | null>`(array_agg(${products.imageUrl} order by case when ${products.imageUrl} is not null then 0 else 1 end))[1]`,
      avgRoi: sql<number>`avg(
        case when cast(${productVariants.purchasePrice} as decimal) > 0
        then ((cast(${sales.salePrice} as decimal) - cast(${sales.platformFee} as decimal) - cast(${sales.shippingCost} as decimal) - cast(${sales.otherFees} as decimal) - cast(${productVariants.purchasePrice} as decimal)) / cast(${productVariants.purchasePrice} as decimal)) * 100
        else 0 end
      )`,
      saleCount: sql<number>`count(*)`,
    })
    .from(sales)
    .innerJoin(productVariants, eq(sales.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .innerJoin(users, eq(sales.userId, users.id))
    .where(and(
      eq(users.communityOptIn, true),
      gte(sales.saleDate, cutoffStr),
    ))
    .groupBy(sql`coalesce(upper(${products.sku}), ${products.id}::text)`)
    .having(sql`count(*) >= 2`)
    .orderBy(sql`avg(
      case when cast(${productVariants.purchasePrice} as decimal) > 0
      then ((cast(${sales.salePrice} as decimal) - cast(${sales.platformFee} as decimal) - cast(${sales.shippingCost} as decimal) - cast(${sales.otherFees} as decimal) - cast(${productVariants.purchasePrice} as decimal)) / cast(${productVariants.purchasePrice} as decimal)) * 100
      else 0 end
    ) desc`)
    .limit(limit);

  return result.map((r) => ({
    productName: r.productName,
    sku: r.sku,
    imageUrl: r.imageUrl,
    avgRoi: Math.round(Number(r.avgRoi) * 10) / 10,
    saleCount: Number(r.saleCount),
  }));
}

/**
 * Top products by sale volume (count) in the last N days.
 * Anonymous: only product name, SKU, image, sale count, avg price.
 */
export async function getCommunityTopVolume(daysBack = 7, limit = 5) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const result = await db
    .select({
      productName: sql<string>`(array_agg(${products.name} order by ${sales.saleDate} desc))[1]`,
      sku: sql<string | null>`max(${products.sku})`,
      imageUrl: sql<string | null>`(array_agg(${products.imageUrl} order by case when ${products.imageUrl} is not null then 0 else 1 end))[1]`,
      saleCount: sql<number>`count(*)`,
      avgPrice: sql<number>`avg(cast(${sales.salePrice} as decimal))`,
    })
    .from(sales)
    .innerJoin(productVariants, eq(sales.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .innerJoin(users, eq(sales.userId, users.id))
    .where(and(
      eq(users.communityOptIn, true),
      gte(sales.saleDate, cutoffStr),
    ))
    .groupBy(sql`coalesce(upper(${products.sku}), ${products.id}::text)`)
    .having(sql`count(*) >= 2`)
    .orderBy(sql`count(*) desc`)
    .limit(limit);

  return result.map((r) => ({
    productName: r.productName,
    sku: r.sku,
    imageUrl: r.imageUrl,
    saleCount: Number(r.saleCount),
    avgPrice: Math.round(Number(r.avgPrice) * 100) / 100,
  }));
}
