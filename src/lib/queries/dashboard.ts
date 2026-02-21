"use server";

import { db } from "@/lib/db";
import { sales, products } from "@/lib/db/schema";
import { eq, and, gte, desc, sql, ne } from "drizzle-orm";

function daysAgoDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

function yearStart(): string {
  return `${new Date().getFullYear()}-01-01`;
}

export async function getDashboardKPIs(userId: string) {
  const now30 = daysAgoDate(30);
  const now90 = daysAgoDate(90);
  const ytd = yearStart();

  // Revenue 30d / 90d / YTD
  const [rev30, rev90, revYtd] = await Promise.all([
    db
      .select({ total: sql<number>`coalesce(sum(cast(${sales.salePrice} as decimal)), 0)` })
      .from(sales)
      .where(and(eq(sales.userId, userId), gte(sales.saleDate, now30))),
    db
      .select({ total: sql<number>`coalesce(sum(cast(${sales.salePrice} as decimal)), 0)` })
      .from(sales)
      .where(and(eq(sales.userId, userId), gte(sales.saleDate, now90))),
    db
      .select({ total: sql<number>`coalesce(sum(cast(${sales.salePrice} as decimal)), 0)` })
      .from(sales)
      .where(and(eq(sales.userId, userId), gte(sales.saleDate, ytd))),
  ]);

  // Stock count + value
  const stockStats = await db
    .select({
      count: sql<number>`count(*)`,
      purchaseValue: sql<number>`coalesce(sum(cast(${products.purchasePrice} as decimal)), 0)`,
      targetValue: sql<number>`coalesce(sum(cast(${products.targetPrice} as decimal)), 0)`,
    })
    .from(products)
    .where(and(eq(products.userId, userId), ne(products.status, "vendu")));

  // Average rotation (days between purchase and sale)
  const rotation = await db
    .select({
      avgDays: sql<number>`coalesce(avg(${sales.saleDate}::date - ${products.purchaseDate}::date), 0)`,
    })
    .from(sales)
    .innerJoin(products, eq(sales.productId, products.id))
    .where(eq(sales.userId, userId));

  // Net profit (simplified: sum(salePrice - purchasePrice - fees))
  const profitQuery = async (since: string) => {
    const result = await db
      .select({
        total: sql<number>`coalesce(sum(
          cast(${sales.salePrice} as decimal)
          - cast(${products.purchasePrice} as decimal)
          - coalesce(cast(${sales.platformFee} as decimal), 0)
          - coalesce(cast(${sales.shippingCost} as decimal), 0)
          - coalesce(cast(${sales.otherFees} as decimal), 0)
        ), 0)`,
      })
      .from(sales)
      .innerJoin(products, eq(sales.productId, products.id))
      .where(and(eq(sales.userId, userId), gte(sales.saleDate, since)));
    return Number(result[0]?.total ?? 0);
  };

  const [profit30, profit90, profitYtd] = await Promise.all([
    profitQuery(now30),
    profitQuery(now90),
    profitQuery(ytd),
  ]);

  // Top 5 most profitable products
  const top5 = await db
    .select({
      productName: products.name,
      productImage: products.imageUrl,
      profit: sql<number>`
        cast(${sales.salePrice} as decimal)
        - cast(${products.purchasePrice} as decimal)
        - coalesce(cast(${sales.platformFee} as decimal), 0)
        - coalesce(cast(${sales.shippingCost} as decimal), 0)
        - coalesce(cast(${sales.otherFees} as decimal), 0)
      `,
    })
    .from(sales)
    .innerJoin(products, eq(sales.productId, products.id))
    .where(eq(sales.userId, userId))
    .orderBy(
      desc(
        sql`cast(${sales.salePrice} as decimal) - cast(${products.purchasePrice} as decimal) - coalesce(cast(${sales.platformFee} as decimal), 0) - coalesce(cast(${sales.shippingCost} as decimal), 0) - coalesce(cast(${sales.otherFees} as decimal), 0)`
      )
    )
    .limit(5);

  // Sleeping products (60+ days in stock, not sold)
  const sleeping = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.userId, userId),
        ne(products.status, "vendu"),
        sql`${products.purchaseDate}::date <= current_date - interval '60 days'`
      )
    )
    .orderBy(products.purchaseDate)
    .limit(5);

  return {
    revenue: {
      days30: Number(rev30[0]?.total ?? 0),
      days90: Number(rev90[0]?.total ?? 0),
      ytd: Number(revYtd[0]?.total ?? 0),
    },
    stock: {
      count: Number(stockStats[0]?.count ?? 0),
      purchaseValue: Number(stockStats[0]?.purchaseValue ?? 0),
      targetValue: Number(stockStats[0]?.targetValue ?? 0),
    },
    rotation: Math.round(Number(rotation[0]?.avgDays ?? 0)),
    profit: {
      days30: profit30,
      days90: profit90,
      ytd: profitYtd,
    },
    cashImmobilized: Number(stockStats[0]?.purchaseValue ?? 0),
    top5: top5.map((t) => ({
      name: t.productName,
      image: t.productImage,
      profit: Number(t.profit),
    })),
    sleeping,
  };
}

export async function getProfitChartData(userId: string) {
  const result = await db
    .select({
      month: sql<string>`to_char(${sales.saleDate}::date, 'YYYY-MM')`,
      profit: sql<number>`coalesce(sum(
        cast(${sales.salePrice} as decimal)
        - cast(${products.purchasePrice} as decimal)
        - coalesce(cast(${sales.platformFee} as decimal), 0)
        - coalesce(cast(${sales.shippingCost} as decimal), 0)
        - coalesce(cast(${sales.otherFees} as decimal), 0)
      ), 0)`,
      revenue: sql<number>`coalesce(sum(cast(${sales.salePrice} as decimal)), 0)`,
    })
    .from(sales)
    .innerJoin(products, eq(sales.productId, products.id))
    .where(eq(sales.userId, userId))
    .groupBy(sql`to_char(${sales.saleDate}::date, 'YYYY-MM')`)
    .orderBy(sql`to_char(${sales.saleDate}::date, 'YYYY-MM')`);

  return result.map((r) => ({
    month: r.month,
    profit: Number(r.profit),
    revenue: Number(r.revenue),
  }));
}
