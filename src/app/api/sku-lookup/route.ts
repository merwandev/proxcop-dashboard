import { auth } from "@/lib/auth";
import { getSkuImage, upsertSkuImage } from "@/lib/queries/sku-images";
import { searchBySkuStockX } from "@/lib/stockx/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const sku = req.nextUrl.searchParams.get("sku")?.trim().toUpperCase();
  if (!sku || sku.length < 3) {
    return NextResponse.json({ error: "SKU invalide" }, { status: 400 });
  }

  // 1. Check cache (sku_images table — shared across all users)
  const cached = await getSkuImage(sku);
  if (cached) {
    return NextResponse.json({
      imageUrl: cached.imageUrl,
      source: cached.source,
    });
  }

  // 2. Search via StockX official API
  const stockxResult = await searchBySkuStockX(sku);
  if (stockxResult) {
    // Cache for future lookups (all users benefit)
    await upsertSkuImage(sku, stockxResult.imageUrl, "stockx");
    return NextResponse.json({
      imageUrl: stockxResult.imageUrl,
      title: stockxResult.title,
      source: "stockx",
    });
  }

  // 3. Not found — user can still upload manually in edit mode
  return NextResponse.json({ imageUrl: null }, { status: 404 });
}
