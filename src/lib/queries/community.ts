"use server";

import { db } from "@/lib/db";
import { sales, productVariants, products, users } from "@/lib/db/schema";
import { eq, and, sql, gte } from "drizzle-orm";

/**
 * Community KPIs for the last 30 days.
 * Privacy-safe: only aggregate data, no user identity exposed.
 */
export async function getCommunityStats() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const result = await db
    .select({
      totalSales: sql<number>`count(*)`,
      activeSellers: sql<number>`count(distinct ${sales.userId})`,
      avgPrice: sql<number>`coalesce(avg(cast(${sales.salePrice} as decimal)), 0)`,
      topPlatform: sql<string | null>`(
        select sub.p from (
          select ${sales.platform} as p, count(*) as c
          from ${sales}
          inner join ${users} on ${users.id} = ${sales.userId}
          where ${users.communityOptIn} = true
            and ${sales.saleDate} >= ${cutoffStr}
            and ${sales.platform} is not null
          group by ${sales.platform}
          order by c desc
          limit 1
        ) sub
      )`,
    })
    .from(sales)
    .innerJoin(users, eq(users.id, sales.userId))
    .where(
      and(eq(users.communityOptIn, true), gte(sales.saleDate, cutoffStr))
    );

  const row = result[0];
  return {
    totalSales: Number(row?.totalSales ?? 0),
    activeSellers: Number(row?.activeSellers ?? 0),
    avgPrice: Math.round(Number(row?.avgPrice ?? 0) * 100) / 100,
    topPlatform: row?.topPlatform ?? null,
  };
}

/**
 * Platform distribution for PieChart (last N days).
 */
export async function getCommunityPlatformDistribution(daysBack = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const result = await db
    .select({
      platform: sales.platform,
      count: sql<number>`count(*)`,
    })
    .from(sales)
    .innerJoin(users, eq(users.id, sales.userId))
    .where(
      and(
        eq(users.communityOptIn, true),
        gte(sales.saleDate, cutoffStr),
        sql`${sales.platform} is not null`
      )
    )
    .groupBy(sales.platform)
    .orderBy(sql`count(*) desc`);

  const total = result.reduce((sum, r) => sum + Number(r.count), 0);

  return result.map((r) => ({
    platform: r.platform as string,
    count: Number(r.count),
    percentage: total > 0 ? Math.round((Number(r.count) / total) * 1000) / 10 : 0,
  }));
}

/**
 * Category breakdown for BarChart (last N days).
 */
export async function getCommunityCategoryBreakdown(daysBack = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const result = await db
    .select({
      category: products.category,
      count: sql<number>`count(*)`,
    })
    .from(sales)
    .innerJoin(productVariants, eq(sales.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .innerJoin(users, eq(users.id, sales.userId))
    .where(
      and(eq(users.communityOptIn, true), gte(sales.saleDate, cutoffStr))
    )
    .groupBy(products.category)
    .orderBy(sql`count(*) desc`);

  const total = result.reduce((sum, r) => sum + Number(r.count), 0);

  return result.map((r) => ({
    category: r.category as string,
    count: Number(r.count),
    percentage: total > 0 ? Math.round((Number(r.count) / total) * 1000) / 10 : 0,
  }));
}
