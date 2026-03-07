"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { incomes } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createIncomeAction(data: {
  category: "parrainage" | "salaire" | "commission" | "autre";
  description: string;
  amount: string;
  date: string;
  recurring: boolean;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");

  await db.insert(incomes).values({
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

export async function toggleIncomeAction(incomeId: string, active: boolean) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");

  await db
    .update(incomes)
    .set({ active })
    .where(and(eq(incomes.id, incomeId), eq(incomes.userId, session.user.id)));

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}

export async function deleteIncomeAction(incomeId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");

  await db
    .delete(incomes)
    .where(and(eq(incomes.id, incomeId), eq(incomes.userId, session.user.id)));

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}
