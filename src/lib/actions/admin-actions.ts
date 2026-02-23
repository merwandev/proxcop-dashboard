"use server";

import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth-utils";
import { db } from "@/lib/db";
import { sales, productVariants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * Admin deletes a sale and puts the variant back to "en_stock"
 */
export async function adminDeleteSaleAction(saleId: string) {
  const session = await auth();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    throw new Error("Non autorise");
  }

  // Get the sale to find the variantId
  const [sale] = await db
    .select({ variantId: sales.variantId })
    .from(sales)
    .where(eq(sales.id, saleId))
    .limit(1);

  if (!sale) throw new Error("Vente non trouvee");

  // Delete the sale
  await db.delete(sales).where(eq(sales.id, saleId));

  // Put variant back to "en_stock"
  await db
    .update(productVariants)
    .set({ status: "en_stock", updatedAt: new Date() })
    .where(eq(productVariants.id, sale.variantId));

  revalidatePath("/admin");
  revalidatePath("/stock");
  revalidatePath("/ventes");
}
