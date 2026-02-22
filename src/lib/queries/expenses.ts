import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { eq, and, asc, desc, gte, lte, sql } from "drizzle-orm";

export async function getUserExpenses(userId: string) {
  return db
    .select({
      id: expenses.id,
      category: expenses.category,
      description: expenses.description,
      amount: expenses.amount,
      date: expenses.date,
      recurring: expenses.recurring,
      active: expenses.active,
      createdAt: expenses.createdAt,
    })
    .from(expenses)
    .where(eq(expenses.userId, userId))
    .orderBy(desc(expenses.createdAt));
}

/**
 * Get total expenses for a date range.
 * For recurring (monthly) expenses: counts each active month within the period.
 * For one-time (fixed) expenses: includes those with date in range.
 */
export async function getTotalExpensesForPeriod(
  userId: string,
  from: string,
  to: string
) {
  // One-time (fixed) expenses in range
  const fixedResult = await db
    .select({
      total: sql<number>`coalesce(sum(cast(${expenses.amount} as decimal)), 0)`,
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
    );

  // Recurring (monthly) expenses — count months in period × amount per active recurring expense
  const fromDate = new Date(from);
  const toDate = new Date(to);

  // Count distinct months covered by the period
  const monthsCovered = getMonthsBetween(fromDate, toDate);

  const recurringResult = await db
    .select({
      id: expenses.id,
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

  // For each recurring expense, count how many months of the period it applies to
  // (only months starting from when the expense was created)
  let recurringTotal = 0;
  for (const exp of recurringResult) {
    const expenseStart = new Date(exp.date);
    const applicableMonths = monthsCovered.filter((m) => m >= expenseStart);
    recurringTotal += applicableMonths.length * Number(exp.amount);
  }

  const fixedTotal = Number(fixedResult[0]?.total ?? 0);
  return { fixedTotal, recurringTotal, total: fixedTotal + recurringTotal };
}

/**
 * Get expense summary for dashboard display.
 * Returns active recurring expenses and recent fixed expenses.
 */
export async function getExpenseSummary(userId: string, from: string, to: string) {
  const recurring = await db
    .select({
      id: expenses.id,
      description: expenses.description,
      amount: expenses.amount,
      category: expenses.category,
      active: expenses.active,
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.userId, userId),
        eq(expenses.recurring, true),
        eq(expenses.active, true)
      )
    )
    .orderBy(desc(sql`cast(${expenses.amount} as decimal)`));

  const fixed = await db
    .select({
      id: expenses.id,
      description: expenses.description,
      amount: expenses.amount,
      category: expenses.category,
      date: expenses.date,
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
    .orderBy(desc(expenses.date));

  return { recurring, fixed };
}

// Helper: get first day of each month between two dates
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
