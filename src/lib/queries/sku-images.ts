"use server";

import { db } from "@/lib/db";
import { skuImages, userSkuImages, stockxProductsCache } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { StockXCachedVariant } from "@/lib/stockx/client";

// ─── Global SKU Images (shared across all users) ────────────────────

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
  imageUrl: string | null,
  source: string = "stockx",
  status: "found" | "not_found" | "manual" = "found",
  stockxProductId?: string
) {
  const normalized = sku.trim().toUpperCase();
  await db
    .insert(skuImages)
    .values({ sku: normalized, imageUrl, source, status, stockxProductId })
    .onConflictDoUpdate({
      target: skuImages.sku,
      set: { imageUrl, source, status, stockxProductId, updatedAt: new Date() },
    });
}

// ─── User SKU Images (private per-user fallback) ────────────────────

export async function getUserSkuImage(userId: string, sku: string) {
  const normalized = sku.trim().toUpperCase();
  const result = await db
    .select()
    .from(userSkuImages)
    .where(
      and(eq(userSkuImages.userId, userId), eq(userSkuImages.sku, normalized))
    )
    .limit(1);
  return result[0] ?? null;
}

export async function upsertUserSkuImage(
  userId: string,
  sku: string,
  imageUrl: string
) {
  const normalized = sku.trim().toUpperCase();
  await db
    .insert(userSkuImages)
    .values({ userId, sku: normalized, imageUrl })
    .onConflictDoUpdate({
      target: [userSkuImages.userId, userSkuImages.sku],
      set: { imageUrl, updatedAt: new Date() },
    });
}

// ─── Admin queries ──────────────────────────────────────────────────

export async function getNotFoundSkuImages(limit = 50, offset = 0) {
  return db
    .select()
    .from(skuImages)
    .where(eq(skuImages.status, "not_found"))
    .orderBy(desc(skuImages.updatedAt))
    .limit(limit)
    .offset(offset);
}

// ─── StockX Products Cache (full product + variants) ────────────────

export interface CachedStockXProduct {
  sku: string;
  stockxProductId: string;
  title: string;
  styleId: string;
  imageUrl: string | null;
  variants: StockXCachedVariant[];
}

export async function getCachedStockXProduct(sku: string): Promise<CachedStockXProduct | null> {
  const normalized = sku.trim().toUpperCase();
  const result = await db
    .select()
    .from(stockxProductsCache)
    .where(eq(stockxProductsCache.sku, normalized))
    .limit(1);

  if (!result[0]) return null;

  return {
    sku: result[0].sku,
    stockxProductId: result[0].stockxProductId,
    title: result[0].title,
    styleId: result[0].styleId,
    imageUrl: result[0].imageUrl,
    variants: result[0].variants as StockXCachedVariant[],
  };
}

export async function upsertCachedStockXProduct(
  sku: string,
  data: {
    stockxProductId: string;
    title: string;
    styleId: string;
    imageUrl: string | null;
    variants: StockXCachedVariant[];
  }
) {
  const normalized = sku.trim().toUpperCase();
  await db
    .insert(stockxProductsCache)
    .values({
      sku: normalized,
      stockxProductId: data.stockxProductId,
      title: data.title,
      styleId: data.styleId,
      imageUrl: data.imageUrl,
      variants: data.variants,
    })
    .onConflictDoUpdate({
      target: stockxProductsCache.sku,
      set: {
        stockxProductId: data.stockxProductId,
        title: data.title,
        styleId: data.styleId,
        imageUrl: data.imageUrl,
        variants: data.variants,
        updatedAt: new Date(),
      },
    });
}
