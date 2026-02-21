"use server";

import { db } from "@/lib/db";
import { skuImages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getSkuImage(sku: string) {
  const normalized = sku.trim().toUpperCase();
  const result = await db
    .select()
    .from(skuImages)
    .where(eq(skuImages.sku, normalized))
    .limit(1);
  return result[0] ?? null;
}

export async function upsertSkuImage(
  sku: string,
  imageUrl: string,
  source: string = "stockx"
) {
  const normalized = sku.trim().toUpperCase();
  await db
    .insert(skuImages)
    .values({ sku: normalized, imageUrl, source })
    .onConflictDoUpdate({
      target: skuImages.sku,
      set: { imageUrl, source, updatedAt: new Date() },
    });
}
