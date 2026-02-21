"use server";

import { db } from "@/lib/db";
import { stockxTokens } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

// ─── Token Management ───────────────────────────────────────────────

/**
 * Get a valid StockX access token, refreshing if expired.
 * Returns null if no tokens are stored (needs initial OAuth setup).
 */
export async function getStockXAccessToken(): Promise<string | null> {
  const rows = await db
    .select()
    .from(stockxTokens)
    .orderBy(desc(stockxTokens.updatedAt))
    .limit(1);

  const token = rows[0];
  if (!token) return null;

  // Check if token is still valid (with 5 min buffer)
  const now = new Date();
  const buffer = 5 * 60 * 1000; // 5 minutes
  if (token.expiresAt.getTime() - buffer > now.getTime()) {
    return token.accessToken;
  }

  // Token expired — refresh it
  try {
    const refreshed = await refreshStockXToken(token.refreshToken);
    if (!refreshed) return null;

    // Update in DB
    await db
      .update(stockxTokens)
      .set({
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        expiresAt: refreshed.expiresAt,
        updatedAt: new Date(),
      });

    return refreshed.accessToken;
  } catch {
    return null;
  }
}

async function refreshStockXToken(refreshToken: string) {
  const res = await fetch("https://accounts.stockx.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: process.env.STOCKX_CLIENT_ID!,
      client_secret: process.env.STOCKX_CLIENT_SECRET!,
      audience: "gateway.stockx.com",
      refresh_token: refreshToken,
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) return null;

  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    refreshToken: (data.refresh_token ?? refreshToken) as string,
    expiresAt: new Date(Date.now() + (data.expires_in as number) * 1000),
  };
}

// ─── StockX API helpers ─────────────────────────────────────────────

function stockxHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "x-api-key": process.env.STOCKX_API_KEY!,
  };
}

// ─── Image-only Search (used by admin panel / SKU image lookup) ─────

export interface StockXImageResult {
  imageUrl: string | null;
  title: string;
  styleId: string;
  productId: string;
  status: "found" | "not_found";
}

/**
 * Search StockX catalog by SKU — returns image only (3-step flow).
 * Used by the admin panel and SKU image cache system.
 */
export async function searchBySkuStockX(
  sku: string
): Promise<StockXImageResult | null> {
  const accessToken = await getStockXAccessToken();
  if (!accessToken) return null;

  try {
    // ── Step 1: Search catalog ──
    const searchUrl = new URL("https://api.stockx.com/v2/catalog/search");
    searchUrl.searchParams.set("query", sku);
    searchUrl.searchParams.set("pageSize", "1");
    searchUrl.searchParams.set("pageNumber", "1");

    const searchRes = await fetch(searchUrl.toString(), {
      headers: stockxHeaders(accessToken),
      signal: AbortSignal.timeout(10000),
    });

    if (searchRes.status === 429) return null;
    if (!searchRes.ok) return null;

    const searchData = await searchRes.json();
    const product = searchData?.products?.[0];

    if (!product?.productId) return null;

    const productId = product.productId as string;
    const title = (product.title ?? "") as string;
    const styleId = (product.styleId ?? sku) as string;

    // ── Step 2: Get variants ──
    const variantsUrl = `https://api.stockx.com/v2/catalog/products/${productId}/variants`;

    const variantsRes = await fetch(variantsUrl, {
      headers: stockxHeaders(accessToken),
      signal: AbortSignal.timeout(10000),
    });

    if (variantsRes.status === 429) return null;
    if (!variantsRes.ok) {
      return { imageUrl: null, title, styleId, productId, status: "not_found" };
    }

    const variants = await variantsRes.json();
    const variantArray = Array.isArray(variants) ? variants : variants?.variants ?? [];

    if (variantArray.length === 0) {
      return { imageUrl: null, title, styleId, productId, status: "not_found" };
    }

    // Extract variantName and split by ":" to get the slug
    const rawVariantName = (variantArray[0].variantName ?? "") as string;
    const variantSlug = rawVariantName.includes(":")
      ? rawVariantName.split(":")[0]
      : rawVariantName;

    if (!variantSlug) {
      return { imageUrl: null, title, styleId, productId, status: "not_found" };
    }

    // ── Step 3: Construct & test image URLs ──
    const imageUrl = await testImageUrls(variantSlug);
    return {
      imageUrl,
      title,
      styleId,
      productId,
      status: imageUrl ? "found" : "not_found",
    };
  } catch {
    return null;
  }
}

// ─── Full Product Search (returns ALL variants with sizes) ──────────

export interface StockXVariant {
  variantId: string;
  sizeUS: string;
  sizeEU: string | null;
}

/** Shape stored in stockx_products_cache.variants jsonb column */
export type StockXCachedVariant = StockXVariant;

export interface StockXProductResult {
  productId: string;
  title: string;
  styleId: string;
  imageUrl: string | null;
  variants: StockXVariant[];
  status: "found" | "not_found";
}

/**
 * Search StockX catalog by SKU — returns product info + ALL available sizes.
 * Used by the product creation wizard.
 */
export async function searchProductBySkuStockX(
  sku: string
): Promise<StockXProductResult | null> {
  const accessToken = await getStockXAccessToken();
  if (!accessToken) return null;

  try {
    // ── Step 1: Search catalog ──
    const searchUrl = new URL("https://api.stockx.com/v2/catalog/search");
    searchUrl.searchParams.set("query", sku);
    searchUrl.searchParams.set("pageSize", "1");
    searchUrl.searchParams.set("pageNumber", "1");

    const searchRes = await fetch(searchUrl.toString(), {
      headers: stockxHeaders(accessToken),
      signal: AbortSignal.timeout(10000),
    });

    if (searchRes.status === 429) return null;
    if (!searchRes.ok) return null;

    const searchData = await searchRes.json();
    const product = searchData?.products?.[0];

    if (!product?.productId) return null;

    const productId = product.productId as string;
    const title = (product.title ?? "") as string;
    const styleId = (product.styleId ?? sku) as string;

    // ── Step 2: Get ALL variants ──
    const variantsUrl = `https://api.stockx.com/v2/catalog/products/${productId}/variants`;

    const variantsRes = await fetch(variantsUrl, {
      headers: stockxHeaders(accessToken),
      signal: AbortSignal.timeout(10000),
    });

    if (variantsRes.status === 429) return null;
    if (!variantsRes.ok) {
      return { productId, title, styleId, imageUrl: null, variants: [], status: "not_found" };
    }

    const variantsData = await variantsRes.json();
    const variantArray = Array.isArray(variantsData)
      ? variantsData
      : variantsData?.variants ?? [];

    if (variantArray.length === 0) {
      return { productId, title, styleId, imageUrl: null, variants: [], status: "not_found" };
    }

    // Parse all variants — use variantValue for the real size
    const variants: StockXVariant[] = variantArray
      .map((v: Record<string, unknown>) => {
        const variantId = (v.variantId ?? v.id ?? "") as string;
        const sizeUS = (v.variantValue ?? "") as string;

        // Extract EU size from sizeChart.availableConversions
        let sizeEU: string | null = null;
        const sizeChart = v.sizeChart as { availableConversions?: { size: string; type: string }[] } | undefined;
        if (sizeChart?.availableConversions) {
          const euConv = sizeChart.availableConversions.find((c) => c.type === "eu");
          if (euConv) {
            // "EU 36.5" → "36.5"
            sizeEU = euConv.size.replace(/^EU\s*/i, "");
          }
        }

        return { variantId, sizeUS, sizeEU };
      })
      .filter((v: StockXVariant) => v.sizeUS !== "");

    // ── Step 3: Image from first variant slug ──
    const firstVariantName = (variantArray[0].variantName ?? "") as string;
    const variantSlug = firstVariantName.includes(":")
      ? firstVariantName.split(":")[0]
      : firstVariantName;

    const imageUrl = variantSlug ? await testImageUrls(variantSlug) : null;

    return {
      productId,
      title,
      styleId,
      imageUrl,
      variants,
      status: "found",
    };
  } catch {
    return null;
  }
}

// ─── Shared helpers ─────────────────────────────────────────────────

async function testImageUrls(variantSlug: string): Promise<string | null> {
  const imagePatterns = [
    `https://images.stockx.com/images/${variantSlug}.jpg`,
    `https://images.stockx.com/images/${variantSlug}-Product.jpg`,
  ];

  for (const imageUrl of imagePatterns) {
    try {
      const headRes = await fetch(imageUrl, {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
      });
      if (headRes.ok) return imageUrl;
    } catch {
      // Try next pattern
    }
  }

  return null;
}
