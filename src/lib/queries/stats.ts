"use server";

import { db } from "@/lib/db";
import { sales, productVariants, products } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function getStatsData(userId: string) {
  // ROI by category (category is on parent product)
  const roiByCategory = await db
    .select({
      category: products.category,
      totalProfit: sql<number>`coalesce(sum(
        cast(${sales.salePrice} as decimal)
        - cast(${productVariants.purchasePrice} as decimal)
        - coalesce(cast(${sales.platformFee} as decimal), 0)
        - coalesce(cast(${sales.shippingCost} as decimal), 0)
        - coalesce(cast(${sales.otherFees} as decimal), 0)
      ), 0)`,
      totalInvested: sql<number>`coalesce(sum(cast(${productVariants.purchasePrice} as decimal)), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(sales)
    .innerJoin(productVariants, eq(sales.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(eq(sales.userId, userId))
    .groupBy(products.category);

  // ROI by platform (platform is on sales)
  const roiByPlatform = await db
    .select({
      platform: sales.platform,
      totalProfit: sql<number>`coalesce(sum(
        cast(${sales.salePrice} as decimal)
        - cast(${productVariants.purchasePrice} as decimal)
        - coalesce(cast(${sales.platformFee} as decimal), 0)
        - coalesce(cast(${sales.shippingCost} as decimal), 0)
        - coalesce(cast(${sales.otherFees} as decimal), 0)
      ), 0)`,
      totalInvested: sql<number>`coalesce(sum(cast(${productVariants.purchasePrice} as decimal)), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(sales)
    .innerJoin(productVariants, eq(sales.variantId, productVariants.id))
    .where(eq(sales.userId, userId))
    .groupBy(sales.platform);

  // Margin distribution
  const marginDist = await db
    .select({
      margin: sql<number>`round((
        (cast(${sales.salePrice} as decimal) - cast(${productVariants.purchasePrice} as decimal)
        - coalesce(cast(${sales.platformFee} as decimal), 0)
        - coalesce(cast(${sales.shippingCost} as decimal), 0)
        - coalesce(cast(${sales.otherFees} as decimal), 0))
        / nullif(cast(${sales.salePrice} as decimal), 0) * 100
      ), 0)`,
    })
    .from(sales)
    .innerJoin(productVariants, eq(sales.variantId, productVariants.id))
    .where(eq(sales.userId, userId));

  // Win rate (sold at or above target price)
  const winRateData = await db
    .select({
      total: sql<number>`count(*)`,
      wins: sql<number>`sum(case when cast(${sales.salePrice} as decimal) >= coalesce(cast(${productVariants.targetPrice} as decimal), 0) then 1 else 0 end)`,
    })
    .from(sales)
    .innerJoin(productVariants, eq(sales.variantId, productVariants.id))
    .where(eq(sales.userId, userId));

  // Average margin
  const avgMarginData = await db
    .select({
      avgMargin: sql<number>`coalesce(avg(
        (cast(${sales.salePrice} as decimal) - cast(${productVariants.purchasePrice} as decimal)
        - coalesce(cast(${sales.platformFee} as decimal), 0)
        - coalesce(cast(${sales.shippingCost} as decimal), 0)
        - coalesce(cast(${sales.otherFees} as decimal), 0))
        / nullif(cast(${sales.salePrice} as decimal), 0) * 100
      ), 0)`,
    })
    .from(sales)
    .innerJoin(productVariants, eq(sales.variantId, productVariants.id))
    .where(eq(sales.userId, userId));

  const total = Number(winRateData[0]?.total ?? 0);
  const wins = Number(winRateData[0]?.wins ?? 0);

  return {
    roiByCategory: roiByCategory.map((r) => ({
      category: r.category,
      profit: Number(r.totalProfit),
      invested: Number(r.totalInvested),
      roi: Number(r.totalInvested) > 0 ? (Number(r.totalProfit) / Number(r.totalInvested)) * 100 : 0,
      count: Number(r.count),
    })),
    roiByPlatform: roiByPlatform.map((r) => ({
      platform: r.platform ?? "N/A",
      profit: Number(r.totalProfit),
      invested: Number(r.totalInvested),
      roi: Number(r.totalInvested) > 0 ? (Number(r.totalProfit) / Number(r.totalInvested)) * 100 : 0,
      count: Number(r.count),
    })),
    marginDistribution: marginDist.map((m) => Number(m.margin)),
    winRate: total > 0 ? (wins / total) * 100 : 0,
    avgMargin: Number(avgMarginData[0]?.avgMargin ?? 0),
  };
}
