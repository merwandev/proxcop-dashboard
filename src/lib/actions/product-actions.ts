"use server";

import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { productSchema } from "@/lib/validators/product";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createProduct(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifie");

  const raw = Object.fromEntries(formData.entries());
  const parsed = productSchema.parse(raw);

  await db.insert(products).values({
    userId: session.user.id,
    name: parsed.name,
    sku: parsed.sku,
    category: parsed.category,
    sizeVariant: parsed.sizeVariant,
    purchasePrice: parsed.purchasePrice.toString(),
    purchaseDate: parsed.purchaseDate,
    targetPrice: parsed.targetPrice?.toString(),
    shippingFee: parsed.shippingFee.toString(),
    platformFee: parsed.platformFee.toString(),
    platform: parsed.platform,
    status: parsed.status,
    storageLocation: parsed.storageLocation,
    returnDeadline: parsed.returnDeadline || null,
    notes: parsed.notes,
  });

  revalidatePath("/stock");
  revalidatePath("/dashboard");
}

export async function updateProduct(productId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifie");

  const raw = Object.fromEntries(formData.entries());
  const parsed = productSchema.parse(raw);

  await db
    .update(products)
    .set({
      name: parsed.name,
      sku: parsed.sku,
      category: parsed.category,
      sizeVariant: parsed.sizeVariant,
      purchasePrice: parsed.purchasePrice.toString(),
      purchaseDate: parsed.purchaseDate,
      targetPrice: parsed.targetPrice?.toString(),
      shippingFee: parsed.shippingFee.toString(),
      platformFee: parsed.platformFee.toString(),
      platform: parsed.platform,
      status: parsed.status,
      storageLocation: parsed.storageLocation,
      returnDeadline: parsed.returnDeadline || null,
      notes: parsed.notes,
      updatedAt: new Date(),
    })
    .where(and(eq(products.id, productId), eq(products.userId, session.user.id)));

  revalidatePath("/stock");
  revalidatePath(`/stock/${productId}`);
  revalidatePath("/dashboard");
}

export async function updateProductStatus(productId: string, status: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifie");

  await db
    .update(products)
    .set({
      status: status as typeof products.status.enumValues[number],
      updatedAt: new Date(),
    })
    .where(and(eq(products.id, productId), eq(products.userId, session.user.id)));

  revalidatePath("/stock");
  revalidatePath(`/stock/${productId}`);
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

export async function deleteProduct(productId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifie");

  await db
    .delete(products)
    .where(and(eq(products.id, productId), eq(products.userId, session.user.id)));

  revalidatePath("/stock");
  revalidatePath("/dashboard");
}
