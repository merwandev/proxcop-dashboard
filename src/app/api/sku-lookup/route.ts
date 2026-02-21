import { auth } from "@/lib/auth";
import {
  getSkuImage,
  upsertSkuImage,
  getUserSkuImage,
  upsertUserSkuImage,
} from "@/lib/queries/sku-images";
import { searchBySkuStockX } from "@/lib/stockx/client";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/sku-lookup?sku=XX-XXX
 * Lookup SKU image with fallback chain:
 * 1. Global cache (found/manual) -> return image
 * 2. Global cache (not_found) -> check user's private image
 * 3. Not cached -> search StockX API (3-step flow)
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const sku = req.nextUrl.searchParams.get("sku")?.trim().toUpperCase();
  if (!sku || sku.length < 3) {
    return NextResponse.json({ error: "SKU invalide" }, { status: 400 });
  }

  const userId = session.user.id;

  // 1. Check global cache
  const cached = await getSkuImage(sku);
  if (cached) {
    // Found or manually set by staff -> return the image
    if ((cached.status === "found" || cached.status === "manual") && cached.imageUrl) {
      return NextResponse.json({
        imageUrl: cached.imageUrl,
        source: cached.source,
        status: "found",
      });
    }

    // Not found globally -> check user's private image
    if (cached.status === "not_found") {
      const userImage = await getUserSkuImage(userId, sku);
      if (userImage) {
        return NextResponse.json({
          imageUrl: userImage.imageUrl,
          source: "user",
          status: "not_found_global",
        });
      }
      return NextResponse.json({
        imageUrl: null,
        status: "not_found",
        message: "Image non trouvee pour ce SKU. Un staff l'ajoutera bientot.",
      });
    }
  }

  // 2. Not in cache -> search StockX API (3-step flow)
  const stockxResult = await searchBySkuStockX(sku);

  // API unreachable or rate limited -> don't cache, return error
  if (!stockxResult) {
    return NextResponse.json({
      imageUrl: null,
      status: "error",
      message: "Service StockX temporairement indisponible.",
    });
  }

  if (stockxResult.status === "found" && stockxResult.imageUrl) {
    // Cache globally for all users
    await upsertSkuImage(
      sku,
      stockxResult.imageUrl,
      "stockx",
      "found",
      stockxResult.productId
    );
    return NextResponse.json({
      imageUrl: stockxResult.imageUrl,
      title: stockxResult.title,
      source: "stockx",
      status: "found",
    });
  }

  // Not found on StockX -> cache as not_found + check user's private image
  await upsertSkuImage(
    sku,
    null,
    "stockx",
    "not_found",
    stockxResult.productId
  );

  const userImage = await getUserSkuImage(userId, sku);
  if (userImage) {
    return NextResponse.json({
      imageUrl: userImage.imageUrl,
      source: "user",
      status: "not_found_global",
    });
  }

  return NextResponse.json({
    imageUrl: null,
    status: "not_found",
    message: "Image non trouvee pour ce SKU. Un staff l'ajoutera bientot.",
  });
}

/**
 * POST /api/sku-lookup
 * Save a user's private fallback image for a SKU
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const body = await req.json();
  const sku = (body.sku as string)?.trim().toUpperCase();
  const imageUrl = body.imageUrl as string;

  if (!sku || sku.length < 3) {
    return NextResponse.json({ error: "SKU invalide" }, { status: 400 });
  }
  if (!imageUrl) {
    return NextResponse.json({ error: "imageUrl requis" }, { status: 400 });
  }

  await upsertUserSkuImage(session.user.id, sku, imageUrl);

  return NextResponse.json({ success: true });
}
