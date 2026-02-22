"use server";

import { db } from "@/lib/db";
import { sales, productVariants, products } from "@/lib/db/schema";
import { eq, sql, ne, and } from "drizzle-orm";

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

  // Stock by category (variants in stock, not sold)
  const stockByCategory = await db
    .select({
      category: products.category,
      count: sql<number>`count(*)`,
      value: sql<number>`coalesce(sum(cast(${productVariants.purchasePrice} as decimal)), 0)`,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(and(eq(productVariants.userId, userId), ne(productVariants.status, "vendu")))
    .groupBy(products.category);

  // Stock evolution over time (purchases +1, sales -1)

  // Get all variant purchase dates
  const purchaseEvents = await db
    .select({
      date: productVariants.purchaseDate,
      delta: sql<number>`1`,
    })
    .from(productVariants)
    .where(eq(productVariants.userId, userId));

  // Get all sale dates
  const saleEvents = await db
    .select({
      date: sales.saleDate,
      delta: sql<number>`-1`,
    })
    .from(sales)
    .where(eq(sales.userId, userId));

  // Merge all events and sort by date
  const allEvents = [...purchaseEvents, ...saleEvents].sort(
    (a, b) => a.date.localeCompare(b.date)
  );

  // Build running stock level per date (cumulative)
  const stockSnapshots: { date: string; stock: number }[] = [];
  let runningStock = 0;
  for (const event of allEvents) {
    runningStock += Number(event.delta);
    stockSnapshots.push({ date: event.date, stock: runningStock });
  }

  // Start from the earliest event (first user activity) instead of fixed 1 year ago
  const startDate = allEvents.length > 0 ? allEvents[0].date : new Date().toISOString().split("T")[0];

  // Sample weekly from first activity to today
  const stockEvolution: { date: string; stock: number }[] = [];
  const today = new Date();
  const cursor = new Date(startDate);
  let snapshotIdx = 0;
  let currentLevel = 0;

  while (cursor <= today) {
    const dateStr = cursor.toISOString().split("T")[0];
    // Advance snapshots up to this date
    while (snapshotIdx < stockSnapshots.length && stockSnapshots[snapshotIdx].date <= dateStr) {
      currentLevel = stockSnapshots[snapshotIdx].stock;
      snapshotIdx++;
    }
    stockEvolution.push({ date: dateStr, stock: Math.max(0, currentLevel) });
    cursor.setDate(cursor.getDate() + 7);
  }

  // Always include today as the last point
  const todayStr = today.toISOString().split("T")[0];
  if (stockEvolution.length === 0 || stockEvolution[stockEvolution.length - 1].date !== todayStr) {
    // Advance remaining snapshots
    while (snapshotIdx < stockSnapshots.length) {
      currentLevel = stockSnapshots[snapshotIdx].stock;
      snapshotIdx++;
    }
    stockEvolution.push({ date: todayStr, stock: Math.max(0, currentLevel) });
  }

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
    stockByCategory: stockByCategory.map((s) => ({
      category: s.category,
      count: Number(s.count),
      value: Number(s.value),
    })),
    stockEvolution,
    winRate: total > 0 ? (wins / total) * 100 : 0,
    avgMargin: Number(avgMarginData[0]?.avgMargin ?? 0),
  };
}
