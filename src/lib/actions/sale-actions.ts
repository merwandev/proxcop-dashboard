"use server";

import { db } from "@/lib/db";
import { sales, productVariants, products } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { saleSchema } from "@/lib/validators/sale";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { sendSaleWebhook } from "@/lib/discord-webhook";

export async function createSale(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");

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
    buyerUsername: parsed.buyerUsername || null,
    paymentStatus: parsed.paymentStatus || "paid",
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

  // Fire-and-forget: send Discord webhook notification (anonymous)
  const variantInfo = await db
    .select({
      productName: products.name,
      sku: products.sku,
      imageUrl: products.imageUrl,
      sizeVariant: productVariants.sizeVariant,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(eq(productVariants.id, parsed.variantId))
    .limit(1);

  const isAnonymous = raw.anonymousSale === "true" || raw.anonymousSale === "on";

  if (variantInfo[0]) {
    sendSaleWebhook({
      productName: variantInfo[0].productName,
      sku: variantInfo[0].sku,
      sizeVariant: variantInfo[0].sizeVariant,
      imageUrl: variantInfo[0].imageUrl,
      salePrice: parsed.salePrice,
      platform: parsed.platform ?? null,
      saleDate: parsed.saleDate,
      anonymous: isAnonymous,
    }).catch(() => {});
  }
}

export async function updateSale(
  saleId: string,
  data: {
    salePrice: number;
    saleDate: string;
    platform?: string;
    platformFee?: number;
    shippingCost?: number;
    otherFees?: number;
    notes?: string;
    buyerUsername?: string;
    paymentStatus?: string;
  }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");

  const sale = await db
    .select()
    .from(sales)
    .where(and(eq(sales.id, saleId), eq(sales.userId, session.user.id)))
    .limit(1);

  if (!sale[0]) throw new Error("Vente introuvable");

  await db
    .update(sales)
    .set({
      salePrice: data.salePrice.toString(),
      saleDate: data.saleDate,
      platform: (data.platform as "stockx" | "vinted" | "ebay" | "laced" | "hypeboost" | "alias" | "leboncoin" | "vestiaire" | "fb_groups" | "direct" | "discord" | "other") || null,
      platformFee: (data.platformFee ?? 0).toString(),
      shippingCost: (data.shippingCost ?? 0).toString(),
      otherFees: (data.otherFees ?? 0).toString(),
      notes: data.notes || null,
      buyerUsername: data.buyerUsername || null,
      paymentStatus: (data.paymentStatus as "paid" | "pending") || "paid",
    })
    .where(and(eq(sales.id, saleId), eq(sales.userId, session.user.id)));

  revalidatePath("/stock");
  revalidatePath("/ventes");
  revalidatePath("/dashboard");
  revalidatePath("/stats");
}

export async function markDealAsPaid(saleId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");

  const sale = await db
    .select()
    .from(sales)
    .where(and(eq(sales.id, saleId), eq(sales.userId, session.user.id)))
    .limit(1);

  if (!sale[0]) throw new Error("Vente introuvable");

  await db
    .update(sales)
    .set({
      paymentStatus: "paid",
      paymentCollectedAt: new Date(),
    })
    .where(and(eq(sales.id, saleId), eq(sales.userId, session.user.id)));

  revalidatePath("/ventes");
  revalidatePath("/dashboard");
}

export async function deleteSale(saleId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");

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

export async function createBulkSales(data: {
  variantIds: string[];
  salePrice: number;
  saleDate: string;
  platform?: string;
  platformFee?: number;
  shippingCost?: number;
  otherFees?: number;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifié");

  for (const variantId of data.variantIds) {
    await db.insert(sales).values({
      variantId,
      userId: session.user.id,
      salePrice: data.salePrice.toString(),
      saleDate: data.saleDate,
      platform: (data.platform as "stockx" | "vinted" | "ebay" | "laced" | "hypeboost" | "alias" | "leboncoin" | "vestiaire" | "fb_groups" | "direct" | "discord" | "other") || null,
      platformFee: (data.platformFee ?? 0).toString(),
      shippingCost: (data.shippingCost ?? 0).toString(),
      otherFees: (data.otherFees ?? 0).toString(),
    });

    await db
      .update(productVariants)
      .set({ status: "vendu", updatedAt: new Date() })
      .where(and(eq(productVariants.id, variantId), eq(productVariants.userId, session.user.id)));
  }

  revalidatePath("/stock");
  revalidatePath("/ventes");
  revalidatePath("/dashboard");
  revalidatePath("/stats");
}
