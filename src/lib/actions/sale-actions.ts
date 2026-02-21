"use server";

import { db } from "@/lib/db";
import { sales, productVariants } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { saleSchema } from "@/lib/validators/sale";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createSale(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifie");

  const raw = Object.fromEntries(formData.entries());
  const parsed = saleSchema.parse(raw);

  // Create sale record
  await db.insert(sales).values({
    variantId: parsed.variantId,
    userId: session.user.id,
    salePrice: parsed.salePrice.toString(),
    saleDate: parsed.saleDate,
    platform: parsed.platform,
    platformFee: parsed.platformFee.toString(),
    shippingCost: parsed.shippingCost.toString(),
    otherFees: parsed.otherFees.toString(),
    notes: parsed.notes,
  });

  // Update variant status to vendu
  await db
    .update(productVariants)
    .set({ status: "vendu", updatedAt: new Date() })
    .where(and(eq(productVariants.id, parsed.variantId), eq(productVariants.userId, session.user.id)));

  revalidatePath("/stock");
  revalidatePath("/ventes");
  revalidatePath("/dashboard");
  revalidatePath("/stats");
}

export async function deleteSale(saleId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifie");

  // Get the sale to find the variant
  const sale = await db
    .select()
    .from(sales)
    .where(and(eq(sales.id, saleId), eq(sales.userId, session.user.id)))
    .limit(1);

  if (!sale[0]) throw new Error("Vente introuvable");

  // Delete sale
  await db
    .delete(sales)
    .where(and(eq(sales.id, saleId), eq(sales.userId, session.user.id)));

  // Revert variant status to en_stock
  await db
    .update(productVariants)
    .set({ status: "en_stock", updatedAt: new Date() })
    .where(eq(productVariants.id, sale[0].variantId));

  revalidatePath("/stock");
  revalidatePath("/ventes");
  revalidatePath("/dashboard");
  revalidatePath("/stats");
}
