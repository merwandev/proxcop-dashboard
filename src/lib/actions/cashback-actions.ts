"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cashbacks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createCashback(data: {
  variantId: string;
  amount: number;
  source: string;
  status: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifie");

  await db.insert(cashbacks).values({
    variantId: data.variantId,
    userId: session.user.id,
    amount: data.amount.toFixed(2),
    source: data.source,
    status: data.status as "to_request" | "requested" | "approved" | "received",
    receivedAt: data.status === "received" ? new Date() : null,
  });

  revalidatePath("/stock");
}

export async function updateCashback(
  cashbackId: string,
  data: {
    amount?: number;
    source?: string;
    status?: string;
  }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifie");

  const updates: Record<string, unknown> = {};
  if (data.amount !== undefined) updates.amount = data.amount.toFixed(2);
  if (data.source !== undefined) updates.source = data.source;
  if (data.status !== undefined) {
    updates.status = data.status;
    if (data.status === "received") {
      updates.receivedAt = new Date();
    }
  }

  await db
    .update(cashbacks)
    .set(updates)
    .where(and(eq(cashbacks.id, cashbackId), eq(cashbacks.userId, session.user.id)));

  revalidatePath("/stock");
}

export async function deleteCashback(cashbackId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifie");

  await db
    .delete(cashbacks)
    .where(and(eq(cashbacks.id, cashbackId), eq(cashbacks.userId, session.user.id)));

  revalidatePath("/stock");
}
