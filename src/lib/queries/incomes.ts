import { db } from "@/lib/db";
import { incomes } from "@/lib/db/schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";

export async function getUserIncomes(userId: string) {
  return db
    .select({
      id: incomes.id,
      category: incomes.category,
      description: incomes.description,
      amount: incomes.amount,
      date: incomes.date,
      recurring: incomes.recurring,
      active: incomes.active,
      createdAt: incomes.createdAt,
    })
    .from(incomes)
    .where(eq(incomes.userId, userId))
    .orderBy(desc(incomes.createdAt));
}

/**
 * Get total incomes for a date range.
 * Same logic as expenses: recurring = monthly, fixed = in range.
 */
export async function getTotalIncomesForPeriod(
  userId: string,
  from: string,
  to: string
) {
  // One-time (fixed) incomes in range
  const fixedResult = await db
    .select({
      total: sql<number>`coalesce(sum(cast(${incomes.amount} as decimal)), 0)`,
    })
    .from(incomes)
    .where(
      and(
        eq(incomes.userId, userId),
        eq(incomes.recurring, false),
        eq(incomes.active, true),
        gte(incomes.date, from),
        lte(incomes.date, to)
      )
    );

  // Recurring (monthly) incomes
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const monthsCovered = getMonthsBetween(fromDate, toDate);

  const recurringResult = await db
    .select({
      id: incomes.id,
      amount: incomes.amount,
      date: incomes.date,
    })
    .from(incomes)
    .where(
      and(
        eq(incomes.userId, userId),
        eq(incomes.recurring, true),
        eq(incomes.active, true)
      )
    );

  let recurringTotal = 0;
  for (const inc of recurringResult) {
    const incomeStart = new Date(inc.date);
    const applicableMonths = monthsCovered.filter((m) => m >= incomeStart);
    recurringTotal += applicableMonths.length * Number(inc.amount);
  }

  const fixedTotal = Number(fixedResult[0]?.total ?? 0);
  return { fixedTotal, recurringTotal, total: fixedTotal + recurringTotal };
}

function getMonthsBetween(from: Date, to: Date): Date[] {
  const months: Date[] = [];
  const current = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);

  while (current <= end) {
    months.push(new Date(current));
    current.setMonth(current.getMonth() + 1);
  }
  return months;
}
