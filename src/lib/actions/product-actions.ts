"use server";

import { db } from "@/lib/db";
import { products, productVariants } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth-utils";
import { createProductSchema, updateProductSchema, updateVariantSchema } from "@/lib/validators/product";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createProductWithVariants(data: {
  name: string;
  sku?: string;
  imageUrl?: string;
  category: "sneakers" | "pokemon" | "lego" | "random";
  purchaseDate: string;
  targetPrice?: number;
  returnDeadline?: string;
  notes?: string;
  variants: Array<{
    sizeVariant?: string;
    purchasePrice: number;
    quantity?: number;
    storageLocation?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifie");

  const parsed = createProductSchema.parse(data);

  // 1. Insert parent product
  const [parent] = await db
    .insert(products)
    .values({
      userId: session.user.id,
      name: parsed.name,
      sku: parsed.sku ?? null,
      imageUrl: parsed.imageUrl || null,
      category: parsed.category,
      notes: parsed.notes ?? null,
    })
    .returning({ id: products.id });

  // 2. Insert variants (1 row per physical unit)
  const variantRows = parsed.variants.flatMap((v) => {
    const qty = v.quantity ?? 1;
    return Array.from({ length: qty }, () => ({
      productId: parent.id,
      userId: session.user.id,
      sizeVariant: v.sizeVariant ?? null,
      purchasePrice: v.purchasePrice.toString(),
      purchaseDate: parsed.purchaseDate,
      targetPrice: parsed.targetPrice?.toString() ?? null,
      storageLocation: v.storageLocation ?? null,
      returnDeadline: parsed.returnDeadline || null,
    }));
  });

  if (variantRows.length > 0) {
    await db.insert(productVariants).values(variantRows);
  }

  revalidatePath("/stock");
  revalidatePath("/dashboard");

  return { productId: parent.id };
}

export async function updateProduct(productId: string, data: {
  name: string;
  sku?: string;
  imageUrl?: string;
  category: "sneakers" | "pokemon" | "lego" | "random";
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifie");

  const parsed = updateProductSchema.parse(data);

  await db
    .update(products)
    .set({
      name: parsed.name,
      sku: parsed.sku ?? null,
      ...(parsed.imageUrl ? { imageUrl: parsed.imageUrl } : {}),
      category: parsed.category,
      notes: parsed.notes ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(products.id, productId), eq(products.userId, session.user.id)));

  revalidatePath("/stock");
  revalidatePath(`/stock/${productId}`);
  revalidatePath("/dashboard");
}

export async function updateVariant(variantId: string, data: {
  sizeVariant?: string;
  purchasePrice: number;
  purchaseDate: string;
  targetPrice?: number;
  status: string;
  storageLocation?: string;
  returnDeadline?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifie");

  const parsed = updateVariantSchema.parse(data);

  await db
    .update(productVariants)
    .set({
      sizeVariant: parsed.sizeVariant ?? null,
      purchasePrice: parsed.purchasePrice.toString(),
      purchaseDate: parsed.purchaseDate,
      targetPrice: parsed.targetPrice?.toString() ?? null,
      status: parsed.status as typeof productVariants.status.enumValues[number],
      storageLocation: parsed.storageLocation ?? null,
      returnDeadline: parsed.returnDeadline || null,
      updatedAt: new Date(),
    })
    .where(and(eq(productVariants.id, variantId), eq(productVariants.userId, session.user.id)));

  revalidatePath("/stock");
  revalidatePath("/dashboard");
}

export async function updateProductImage(productId: string, imageUrl: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifie");

  await db
    .update(products)
    .set({ imageUrl, updatedAt: new Date() })
    .where(and(eq(products.id, productId), eq(products.userId, session.user.id)));

  revalidatePath("/stock");
  revalidatePath(`/stock/${productId}`);
}

export async function adminSetProductImage(productId: string, imageUrl: string) {
  const session = await auth();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    throw new Error("Acces refuse");
  }

  await db
    .update(products)
    .set({ imageUrl, updatedAt: new Date() })
    .where(eq(products.id, productId));

  revalidatePath("/stock");
  revalidatePath(`/stock/${productId}`);
  revalidatePath("/admin");
}

export async function deleteProduct(productId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifie");

  // CASCADE will delete all variants + their sales + cashbacks
  await db
    .delete(products)
    .where(and(eq(products.id, productId), eq(products.userId, session.user.id)));

  revalidatePath("/stock");
  revalidatePath("/dashboard");
  revalidatePath("/ventes");
}

export async function deleteVariant(variantId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifie");

  // Get the variant to find the parent product
  const [variant] = await db
    .select({ productId: productVariants.productId })
    .from(productVariants)
    .where(and(eq(productVariants.id, variantId), eq(productVariants.userId, session.user.id)))
    .limit(1);

  if (!variant) throw new Error("Variant introuvable");

  // Delete the variant (CASCADE deletes its sale + cashbacks)
  await db
    .delete(productVariants)
    .where(and(eq(productVariants.id, variantId), eq(productVariants.userId, session.user.id)));

  // Check if the parent has any remaining variants
  const remaining = await db
    .select({ count: sql<number>`count(*)` })
    .from(productVariants)
    .where(eq(productVariants.productId, variant.productId));

  // If no variants left, delete the parent product too
  if (Number(remaining[0]?.count ?? 0) === 0) {
    await db
      .delete(products)
      .where(eq(products.id, variant.productId));
  }

  revalidatePath("/stock");
  revalidatePath("/dashboard");
  revalidatePath("/ventes");
}

export async function addVariantToProduct(productId: string, data: {
  sizeVariant?: string;
  purchasePrice: number;
  purchaseDate: string;
  targetPrice?: number;
  quantity?: number;
  storageLocation?: string;
  returnDeadline?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifie");

  // Verify ownership
  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.userId, session.user.id)))
    .limit(1);

  if (!product) throw new Error("Produit introuvable");

  const qty = data.quantity ?? 1;
  const variantRows = Array.from({ length: qty }, () => ({
    productId,
    userId: session.user.id,
    sizeVariant: data.sizeVariant ?? null,
    purchasePrice: data.purchasePrice.toString(),
    purchaseDate: data.purchaseDate,
    targetPrice: data.targetPrice?.toString() ?? null,
    storageLocation: data.storageLocation ?? null,
    returnDeadline: data.returnDeadline || null,
  }));

  await db.insert(productVariants).values(variantRows);

  revalidatePath("/stock");
  revalidatePath(`/stock/${productId}`);
  revalidatePath("/dashboard");
}
