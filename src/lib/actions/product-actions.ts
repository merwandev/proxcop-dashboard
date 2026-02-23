"use server";

import { db } from "@/lib/db";
import { products, productVariants, users } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth-utils";
import { createProductSchema, updateProductSchema, updateVariantSchema } from "@/lib/validators/product";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/queries/admin-logs";

export async function createProductWithVariants(data: {
  name: string;
  sku?: string;
  imageUrl?: string;
  category: "sneakers" | "pokemon" | "lego" | "random";
  purchaseDate: string;
  targetPrice?: number;
  returnDeadline?: string;
  notes?: string;
  supplierName?: string;
  variants: Array<{
    sizeVariant?: string;
    purchasePrice: number;
    quantity?: number;
    storageLocation?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifie");

  // Verify user exists in DB (JWT may reference a deleted user after DB rebuild)
  const [userExists] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!userExists) {
    throw new Error("Session expirée. Déconnectez-vous et reconnectez-vous.");
  }

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
      status: "en_attente" as const,
      storageLocation: v.storageLocation ?? null,
      returnDeadline: parsed.returnDeadline || null,
      supplierName: parsed.supplierName ?? null,
    }));
  });

  let insertedVariantIds: string[] = [];
  if (variantRows.length > 0) {
    const inserted = await db.insert(productVariants).values(variantRows).returning({ id: productVariants.id, sizeVariant: productVariants.sizeVariant });
    insertedVariantIds = inserted.map((v) => v.id);
  }

  revalidatePath("/stock");
  revalidatePath("/dashboard");

  return { productId: parent.id, variantIds: insertedVariantIds };
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
  supplierName?: string;
  listedOn?: string[];
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
      supplierName: parsed.supplierName ?? null,
      listedOn: parsed.listedOn ?? [],
      updatedAt: new Date(),
    })
    .where(and(eq(productVariants.id, variantId), eq(productVariants.userId, session.user.id)));

  revalidatePath("/stock");
  revalidatePath("/dashboard");
}

export async function toggleVariantListing(variantId: string, platform: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifie");

  const [variant] = await db
    .select({ listedOn: productVariants.listedOn })
    .from(productVariants)
    .where(and(eq(productVariants.id, variantId), eq(productVariants.userId, session.user.id)))
    .limit(1);

  if (!variant) throw new Error("Variant introuvable");

  const current: string[] = (variant.listedOn as string[]) ?? [];
  const updated = current.includes(platform)
    ? current.filter((p) => p !== platform)
    : [...current, platform];

  await db
    .update(productVariants)
    .set({ listedOn: updated, updatedAt: new Date() })
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

  await logAdminAction({
    adminId: session.user.id,
    action: "set_product_image",
    target: `product:${productId}`,
    details: `Image ajoutee a un produit`,
  });

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

export async function deleteProducts(productIds: string[]) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifie");

  if (productIds.length === 0) return;

  // CASCADE will delete all variants + their sales + cashbacks
  for (const productId of productIds) {
    await db
      .delete(products)
      .where(and(eq(products.id, productId), eq(products.userId, session.user.id)));
  }

  revalidatePath("/stock");
  revalidatePath("/dashboard");
  revalidatePath("/ventes");
  revalidatePath("/stats");
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
  const productDeleted = Number(remaining[0]?.count ?? 0) === 0;
  if (productDeleted) {
    await db
      .delete(products)
      .where(eq(products.id, variant.productId));
  }

  revalidatePath("/stock");
  revalidatePath("/dashboard");
  revalidatePath("/ventes");

  return { productDeleted };
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

export async function getProductsWithSizes(productIds: string[]) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifie");

  if (productIds.length === 0) return [];

  const results = [];
  for (const productId of productIds) {
    const [product] = await db
      .select({ name: products.name, sku: products.sku })
      .from(products)
      .where(and(eq(products.id, productId), eq(products.userId, session.user.id)))
      .limit(1);

    if (!product) continue;

    const variants = await db
      .select({
        sizeVariant: productVariants.sizeVariant,
        purchasePrice: productVariants.purchasePrice,
      })
      .from(productVariants)
      .where(
        and(
          eq(productVariants.productId, productId),
          sql`${productVariants.status} != 'vendu'`
        )
      )
      .orderBy(productVariants.sizeVariant);

    results.push({
      name: product.name,
      sku: product.sku,
      sizes: variants.map((v) => ({
        size: v.sizeVariant,
        price: v.purchasePrice,
      })),
    });
  }

  return results;
}

export async function bulkListProducts(productIds: string[], platform: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifie");

  if (productIds.length === 0) return;

  for (const productId of productIds) {
    // Get all non-sold variants for this product
    const variants = await db
      .select({ id: productVariants.id, listedOn: productVariants.listedOn })
      .from(productVariants)
      .where(
        and(
          eq(productVariants.productId, productId),
          eq(productVariants.userId, session.user.id),
          sql`${productVariants.status} != 'vendu'`
        )
      );

    for (const variant of variants) {
      const current: string[] = (variant.listedOn as string[]) ?? [];
      if (!current.includes(platform)) {
        await db
          .update(productVariants)
          .set({ listedOn: [...current, platform], updatedAt: new Date() })
          .where(eq(productVariants.id, variant.id));
      }
    }
  }

  revalidatePath("/stock");
  revalidatePath("/dashboard");
}
