"use server";

import { db } from "@/lib/db";
import { sales, productVariants, products, expenses } from "@/lib/db/schema";
import { eq, and, gte, desc, sql, ne, lte } from "drizzle-orm";
import { getTotalExpensesForPeriod, getExpenseSummary } from "./expenses";
import { getTotalIncomesForPeriod } from "./incomes";

function daysAgoDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}

function yearStart(): string {
  return `${new Date().getFullYear()}-01-01`;
}

/**
 * Resolves a period key ("30j" | "ytd" | custom "YYYY-MM-DD_YYYY-MM-DD") into a date range.
 */
function resolvePeriodSync(period: string): { from: string; to: string; days: number } {
  const today = new Date().toISOString().split("T")[0];

  if (period === "ytd") {
    const from = yearStart();
    const days = Math.floor((new Date(today).getTime() - new Date(from).getTime()) / 86400000) + 1;
    return { from, to: today, days };
  }

  // Custom range: "2025-01-01_2025-03-15"
  if (period.includes("_")) {
    const [from, to] = period.split("_");
    const days = Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1;
    return { from, to, days };
  }

  // Default: "30j" — last 30 days including today
  const days = 30;
  return { from: daysAgoDate(days - 1), to: today, days };
}

export async function resolvePeriod(period: string) {
  return resolvePeriodSync(period);
}

export async function getDashboardKPIs(userId: string, period = "30j") {
  const { from, to, days } = resolvePeriodSync(period);

  // Previous period (same length, ending right before current period starts)
  const fromDate = new Date(from);
  fromDate.setDate(fromDate.getDate() - days);
  const prevFrom = fromDate.toISOString().split("T")[0];

  // Revenue for selected period
  const revResult = await db
    .select({ total: sql<number>`coalesce(sum(cast(${sales.salePrice} as decimal)), 0)` })
    .from(sales)
    .where(and(eq(sales.userId, userId), gte(sales.saleDate, from), lte(sales.saleDate, to)));

  // Revenue for previous period (for comparison)
  const revPrevResult = await db
    .select({ total: sql<number>`coalesce(sum(cast(${sales.salePrice} as decimal)), 0)` })
    .from(sales)
    .where(and(eq(sales.userId, userId), gte(sales.saleDate, prevFrom), sql`${sales.saleDate} < ${from}`));

  // Stock count + value (from productVariants) — independent of period
  const stockStats = await db
    .select({
      count: sql<number>`count(*)`,
      purchaseValue: sql<number>`coalesce(sum(cast(${productVariants.purchasePrice} as decimal)), 0)`,
      targetValue: sql<number>`coalesce(sum(cast(${productVariants.targetPrice} as decimal)), 0)`,
    })
    .from(productVariants)
    .where(and(eq(productVariants.userId, userId), ne(productVariants.status, "vendu")));

  // Average rotation (days between purchase and sale) — for sales in period
  const rotation = await db
    .select({
      avgDays: sql<number>`coalesce(avg(${sales.saleDate}::date - ${productVariants.purchaseDate}::date), 0)`,
    })
    .from(sales)
    .innerJoin(productVariants, eq(sales.variantId, productVariants.id))
    .where(and(eq(sales.userId, userId), gte(sales.saleDate, from), lte(sales.saleDate, to)));

  // Net profit for period
  const profitResult = await db
    .select({
      total: sql<number>`coalesce(sum(
        cast(${sales.salePrice} as decimal)
        - cast(${productVariants.purchasePrice} as decimal)
        - coalesce(cast(${sales.platformFee} as decimal), 0)
        - coalesce(cast(${sales.shippingCost} as decimal), 0)
        - coalesce(cast(${sales.otherFees} as decimal), 0)
      ), 0)`,
    })
    .from(sales)
    .innerJoin(productVariants, eq(sales.variantId, productVariants.id))
    .where(and(eq(sales.userId, userId), gte(sales.saleDate, from), lte(sales.saleDate, to)));

  // Net profit for previous period
  const profitPrevResult = await db
    .select({
      total: sql<number>`coalesce(sum(
        cast(${sales.salePrice} as decimal)
        - cast(${productVariants.purchasePrice} as decimal)
        - coalesce(cast(${sales.platformFee} as decimal), 0)
        - coalesce(cast(${sales.shippingCost} as decimal), 0)
        - coalesce(cast(${sales.otherFees} as decimal), 0)
      ), 0)`,
    })
    .from(sales)
    .innerJoin(productVariants, eq(sales.variantId, productVariants.id))
    .where(and(eq(sales.userId, userId), gte(sales.saleDate, prevFrom), sql`${sales.saleDate} < ${from}`));

  // Sales count in period
  const salesCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(sales)
    .where(and(eq(sales.userId, userId), gte(sales.saleDate, from), lte(sales.saleDate, to)));

  // Top 5 most profitable products in period
  const top5 = await db
    .select({
      productName: products.name,
      productImage: products.imageUrl,
      productSku: products.sku,
      sizeVariant: productVariants.sizeVariant,
      profit: sql<number>`
        cast(${sales.salePrice} as decimal)
        - cast(${productVariants.purchasePrice} as decimal)
        - coalesce(cast(${sales.platformFee} as decimal), 0)
        - coalesce(cast(${sales.shippingCost} as decimal), 0)
        - coalesce(cast(${sales.otherFees} as decimal), 0)
      `,
    })
    .from(sales)
    .innerJoin(productVariants, eq(sales.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(and(eq(sales.userId, userId), gte(sales.saleDate, from), lte(sales.saleDate, to)))
    .orderBy(
      desc(
        sql`cast(${sales.salePrice} as decimal) - cast(${productVariants.purchasePrice} as decimal) - coalesce(cast(${sales.platformFee} as decimal), 0) - coalesce(cast(${sales.shippingCost} as decimal), 0) - coalesce(cast(${sales.otherFees} as decimal), 0)`
      )
    )
    .limit(5);

  // Sleeping products (60+ days in stock, not sold) — independent of period
  const sleeping = await db
    .select({
      variantId: productVariants.id,
      productId: products.id,
      productName: products.name,
      productImage: products.imageUrl,
      productSku: products.sku,
      sizeVariant: productVariants.sizeVariant,
      purchasePrice: productVariants.purchasePrice,
      purchaseDate: productVariants.purchaseDate,
      status: productVariants.status,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(
      and(
        eq(productVariants.userId, userId),
        ne(productVariants.status, "vendu"),
        sql`${productVariants.purchaseDate}::date <= current_date - interval '60 days'`
      )
    )
    .orderBy(productVariants.purchaseDate)
    .limit(5);

  // Expenses and incomes for current and previous period
  const [expensesCurrent, expensesPrev, expenseSummary, incomesCurrent, incomesPrev] = await Promise.all([
    getTotalExpensesForPeriod(userId, from, to),
    getTotalExpensesForPeriod(userId, prevFrom, from),
    getExpenseSummary(userId, from, to),
    getTotalIncomesForPeriod(userId, from, to),
    getTotalIncomesForPeriod(userId, prevFrom, from),
  ]);

  const revenue = Number(revResult[0]?.total ?? 0);
  const revenuePrev = Number(revPrevResult[0]?.total ?? 0);
  const rawProfit = Number(profitResult[0]?.total ?? 0);
  const rawProfitPrev = Number(profitPrevResult[0]?.total ?? 0);

  // Net profit = sales profit - expenses + incomes
  const profit = rawProfit - expensesCurrent.total + incomesCurrent.total;
  const profitPrev = rawProfitPrev - expensesPrev.total + incomesPrev.total;

  return {
    revenue,
    revenuePrev,
    profit,
    profitPrev,
    salesCount: Number(salesCountResult[0]?.count ?? 0),
    stock: {
      count: Number(stockStats[0]?.count ?? 0),
      purchaseValue: Number(stockStats[0]?.purchaseValue ?? 0),
      targetValue: Number(stockStats[0]?.targetValue ?? 0),
    },
    rotation: Math.round(Number(rotation[0]?.avgDays ?? 0)),
    cashImmobilized: Number(stockStats[0]?.purchaseValue ?? 0),
    expenses: {
      total: expensesCurrent.total,
      fixedTotal: expensesCurrent.fixedTotal,
      recurringTotal: expensesCurrent.recurringTotal,
      recurring: expenseSummary.recurring.map((e) => ({
        id: e.id,
        description: e.description,
        amount: Number(e.amount),
        category: e.category,
      })),
      fixed: expenseSummary.fixed.map((e) => ({
        id: e.id,
        description: e.description,
        amount: Number(e.amount),
        category: e.category,
        date: e.date,
      })),
    },
    top5: top5.map((t) => ({
      name: t.productName,
      image: t.productImage,
      sku: t.productSku,
      size: t.sizeVariant,
      profit: Number(t.profit),
    })),
    sleeping,
  };
}

/**
 * Returns daily cumulative profit for a given period and its preceding period (for comparison).
 * Also includes a projection line extending the current trend to end of period.
 */
export async function getProfitChartData(userId: string, period = "30j") {
  const { from, to, days } = resolvePeriodSync(period);
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  const periodStartDate = new Date(from);
  const totalDays = days;

  // Previous period of same length
  const prevStartDate = new Date(periodStartDate);
  prevStartDate.setDate(prevStartDate.getDate() - totalDays);
  const prevPeriodStart = prevStartDate.toISOString().split("T")[0];

  // Get daily profit + revenue for current period
  const currentPeriod = await db
    .select({
      day: sql<string>`${sales.saleDate}`,
      profit: sql<number>`coalesce(sum(
        cast(${sales.salePrice} as decimal)
        - cast(${productVariants.purchasePrice} as decimal)
        - coalesce(cast(${sales.platformFee} as decimal), 0)
        - coalesce(cast(${sales.shippingCost} as decimal), 0)
        - coalesce(cast(${sales.otherFees} as decimal), 0)
      ), 0)`,
      revenue: sql<number>`coalesce(sum(cast(${sales.salePrice} as decimal)), 0)`,
    })
    .from(sales)
    .innerJoin(productVariants, eq(sales.variantId, productVariants.id))
    .where(and(eq(sales.userId, userId), gte(sales.saleDate, from), lte(sales.saleDate, to)))
    .groupBy(sales.saleDate)
    .orderBy(sales.saleDate);

  // Get daily profit + revenue for previous period
  const previousPeriod = await db
    .select({
      day: sql<string>`${sales.saleDate}`,
      profit: sql<number>`coalesce(sum(
        cast(${sales.salePrice} as decimal)
        - cast(${productVariants.purchasePrice} as decimal)
        - coalesce(cast(${sales.platformFee} as decimal), 0)
        - coalesce(cast(${sales.shippingCost} as decimal), 0)
        - coalesce(cast(${sales.otherFees} as decimal), 0)
      ), 0)`,
      revenue: sql<number>`coalesce(sum(cast(${sales.salePrice} as decimal)), 0)`,
    })
    .from(sales)
    .innerJoin(productVariants, eq(sales.variantId, productVariants.id))
    .where(
      and(
        eq(sales.userId, userId),
        gte(sales.saleDate, prevPeriodStart),
        sql`${sales.saleDate} < ${from}`
      )
    )
    .groupBy(sales.saleDate)
    .orderBy(sales.saleDate);

  // Build day-indexed maps (profit + revenue)
  const currentMap = new Map<number, { profit: number; revenue: number }>();
  for (const row of currentPeriod) {
    const d = new Date(row.day);
    const dayNum = Math.floor((d.getTime() - periodStartDate.getTime()) / 86400000) + 1;
    currentMap.set(dayNum, { profit: Number(row.profit), revenue: Number(row.revenue) });
  }

  const previousMap = new Map<number, number>();
  for (const row of previousPeriod) {
    const d = new Date(row.day);
    const dayNum = Math.floor((d.getTime() - prevStartDate.getTime()) / 86400000) + 1;
    previousMap.set(dayNum, Number(row.profit));
  }

  // Calculate how many days have elapsed in the current period
  const todayDate = new Date(today);
  const elapsedDays = Math.min(
    totalDays,
    Math.floor((todayDate.getTime() - periodStartDate.getTime()) / 86400000) + 1
  );

  // Build cumulative arrays
  const chartData: {
    day: number;
    label: string;
    current: number | null;
    previous: number | null;
    projection: number | null;
    cumRevenue: number | null;
  }[] = [];

  let cumCurrent = 0;
  let cumPrevious = 0;
  let cumRevenue = 0;

  // For long periods (> 60 days), sample every N days for labels
  const labelInterval = totalDays > 90 ? 7 : totalDays > 60 ? 3 : 1;

  for (let d = 1; d <= totalDays; d++) {
    const dayData = currentMap.get(d);
    cumCurrent += dayData?.profit ?? 0;
    cumRevenue += dayData?.revenue ?? 0;
    cumPrevious += previousMap.get(d) ?? 0;

    // Date label
    const labelDate = new Date(periodStartDate);
    labelDate.setDate(labelDate.getDate() + d - 1);
    const label = d % labelInterval === 0 || d === 1 || d === totalDays
      ? `${labelDate.getDate()}/${labelDate.getMonth() + 1}`
      : "";

    chartData.push({
      day: d,
      label,
      current: d <= elapsedDays ? Math.round(cumCurrent * 100) / 100 : null,
      previous: Math.round(cumPrevious * 100) / 100,
      projection: null,
      cumRevenue: d <= elapsedDays ? Math.round(cumRevenue * 100) / 100 : null,
    });
  }

  // Build projection: from last known day, extend trend linearly
  if (elapsedDays >= 2 && elapsedDays < totalDays) {
    const lastValue = chartData[elapsedDays - 1]?.current ?? 0;
    const dailyRate = lastValue / elapsedDays;

    // Set projection start at last known point
    chartData[elapsedDays - 1]!.projection = lastValue;

    for (let d = elapsedDays + 1; d <= totalDays; d++) {
      chartData[d - 1]!.projection = Math.round(dailyRate * d * 100) / 100;
    }
  }

  // Trim leading empty days (no current or previous activity)
  // Find the first day with actual data
  const firstCurrentDay = currentPeriod.length > 0 ? Math.min(...Array.from(currentMap.keys())) : totalDays;
  const firstPreviousDay = previousPeriod.length > 0 ? Math.min(...Array.from(previousMap.keys())) : totalDays;
  const firstActiveDay = Math.max(1, Math.min(firstCurrentDay, firstPreviousDay) - 1);

  if (firstActiveDay > 1) {
    return chartData.slice(firstActiveDay - 1);
  }

  return chartData;
}

/**
 * Get pending Discord deals (payment_status = "pending")
 */
export async function getPendingDeals(userId: string) {
  const result = await db
    .select({
      saleId: sales.id,
      salePrice: sales.salePrice,
      saleDate: sales.saleDate,
      buyerUsername: sales.buyerUsername,
      productName: products.name,
      productImage: products.imageUrl,
      sizeVariant: productVariants.sizeVariant,
    })
    .from(sales)
    .innerJoin(productVariants, eq(sales.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(
      and(
        eq(sales.userId, userId),
        eq(sales.paymentStatus, "pending")
      )
    )
    .orderBy(desc(sales.createdAt));

  return result;
}

/**
 * Returns daily cumulative expenses for a given period (same pattern as getProfitChartData).
 */
export async function getExpensesChartData(userId: string, period = "30j") {
  const { from, to, days } = resolvePeriodSync(period);
  const periodStartDate = new Date(from);
  const totalDays = days;

  // Previous period
  const prevStartDate = new Date(periodStartDate);
  prevStartDate.setDate(prevStartDate.getDate() - totalDays);
  const prevPeriodStart = prevStartDate.toISOString().split("T")[0];
  const today = new Date().toISOString().split("T")[0];

  // Get fixed expenses in current period (by date)
  const fixedCurrent = await db
    .select({
      day: sql<string>`${expenses.date}`,
      amount: sql<number>`coalesce(sum(cast(${expenses.amount} as decimal)), 0)`,
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.userId, userId),
        eq(expenses.recurring, false),
        eq(expenses.active, true),
        gte(expenses.date, from),
        lte(expenses.date, to)
      )
    )
    .groupBy(expenses.date)
    .orderBy(expenses.date);

  // Get fixed expenses in previous period
  const fixedPrevious = await db
    .select({
      day: sql<string>`${expenses.date}`,
      amount: sql<number>`coalesce(sum(cast(${expenses.amount} as decimal)), 0)`,
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.userId, userId),
        eq(expenses.recurring, false),
        eq(expenses.active, true),
        gte(expenses.date, prevPeriodStart),
        sql`${expenses.date} < ${from}`
      )
    )
    .groupBy(expenses.date)
    .orderBy(expenses.date);

  // Get total recurring monthly cost
  const recurringExpenses = await db
    .select({
      amount: expenses.amount,
      date: expenses.date,
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.userId, userId),
        eq(expenses.recurring, true),
        eq(expenses.active, true)
      )
    );

  const dailyRecurring = recurringExpenses.reduce(
    (sum, e) => sum + Number(e.amount),
    0
  ) / 30; // Approximate daily recurring cost

  // Build day-indexed maps for fixed expenses
  const currentFixedMap = new Map<number, number>();
  for (const row of fixedCurrent) {
    const d = new Date(row.day);
    const dayNum = Math.floor((d.getTime() - periodStartDate.getTime()) / 86400000) + 1;
    currentFixedMap.set(dayNum, Number(row.amount));
  }

  const previousFixedMap = new Map<number, number>();
  for (const row of fixedPrevious) {
    const d = new Date(row.day);
    const dayNum = Math.floor((d.getTime() - prevStartDate.getTime()) / 86400000) + 1;
    previousFixedMap.set(dayNum, Number(row.amount));
  }

  // How many days elapsed
  const todayDate = new Date(today);
  const elapsedDays = Math.min(
    totalDays,
    Math.floor((todayDate.getTime() - periodStartDate.getTime()) / 86400000) + 1
  );

  const labelInterval = totalDays > 90 ? 7 : totalDays > 60 ? 3 : 1;

  const chartData: {
    day: number;
    label: string;
    current: number | null;
    previous: number | null;
  }[] = [];

  let cumCurrent = 0;
  let cumPrevious = 0;

  for (let d = 1; d <= totalDays; d++) {
    cumCurrent += (currentFixedMap.get(d) ?? 0) + dailyRecurring;
    cumPrevious += (previousFixedMap.get(d) ?? 0) + dailyRecurring;

    const labelDate = new Date(periodStartDate);
    labelDate.setDate(labelDate.getDate() + d - 1);
    const label = d % labelInterval === 0 || d === 1 || d === totalDays
      ? `${labelDate.getDate()}/${labelDate.getMonth() + 1}`
      : "";

    chartData.push({
      day: d,
      label,
      current: d <= elapsedDays ? Math.round(cumCurrent * 100) / 100 : null,
      previous: Math.round(cumPrevious * 100) / 100,
    });
  }

  return chartData;
}

/**
 * Get count of variants by status (for status breakdown pie chart).
 */
export async function getStatusBreakdown(userId: string) {
  const result = await db
    .select({
      status: productVariants.status,
      count: sql<number>`count(*)`,
    })
    .from(productVariants)
    .where(eq(productVariants.userId, userId))
    .groupBy(productVariants.status);

  const STATUS_LABELS: Record<string, string> = {
    en_attente: "En attente",
    en_stock: "En stock",
    liste: "Liste",
    reserve: "Reserve",
    expedie: "Expedie",
    vendu: "Vendu",
    en_litige: "En litige",
    return_waiting_rf: "Retour en cours",
    hold: "En pause",
    reship: "Reship",
    consign: "Consign",
  };

  return result.map((r) => ({
    status: r.status,
    label: STATUS_LABELS[r.status] ?? r.status,
    count: Number(r.count),
  }));
}
