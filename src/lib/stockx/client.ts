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

// ─── Product Search ─────────────────────────────────────────────────

interface StockXProduct {
  imageUrl: string;
  title: string;
  styleId: string;
}

/**
 * Search StockX catalog by SKU. Returns the first matching product.
 */
export async function searchBySkuStockX(
  sku: string
): Promise<StockXProduct | null> {
  const accessToken = await getStockXAccessToken();
  if (!accessToken) return null;

  try {
    const url = new URL("https://api.stockx.com/v2/catalog/search");
    url.searchParams.set("query", sku);
    url.searchParams.set("pageSize", "1");
    url.searchParams.set("pageNumber", "1");

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "x-api-key": process.env.STOCKX_API_KEY!,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const product = data?.products?.[0];

    if (!product?.image) return null;

    // Add Imgix optimization params if not present
    let imageUrl = product.image as string;
    if (!imageUrl.includes("?")) {
      imageUrl += "?fit=fill&bg=FFFFFF&w=700&h=500&fm=webp&auto=compress&q=90&trim=color";
    }

    return {
      imageUrl,
      title: product.title ?? "",
      styleId: product.styleId ?? sku,
    };
  } catch {
    return null;
  }
}
