"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { expenses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createExpenseAction(data: {
  category: "bot" | "proxy" | "shipping_materials" | "subscription" | "other";
  description: string;
  amount: string;
  date: string;
  recurring: boolean;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");

  await db.insert(expenses).values({
    userId: session.user.id,
    category: data.category,
    description: data.description,
    amount: data.amount,
    date: data.date,
    recurring: data.recurring,
    active: true,
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function toggleExpenseAction(expenseId: string, active: boolean) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");

  await db
    .update(expenses)
    .set({ active })
    .where(and(eq(expenses.id, expenseId), eq(expenses.userId, session.user.id)));

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function deleteExpenseAction(expenseId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");

  await db
    .delete(expenses)
    .where(and(eq(expenses.id, expenseId), eq(expenses.userId, session.user.id)));

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}
