import { auth } from "@/lib/auth";
import {
  getSkuImage,
  upsertSkuImage,
  getUserSkuImage,
  upsertUserSkuImage,
  getCachedStockXProduct,
  upsertCachedStockXProduct,
} from "@/lib/queries/sku-images";
import { searchBySkuStockX, searchProductBySkuStockX } from "@/lib/stockx/client";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/sku-lookup?sku=XX-XXX
 * GET /api/sku-lookup?sku=XX-XXX&mode=full  (returns all variants/sizes)
 *
 * Default mode: image-only lookup with fallback chain (for admin panel compat)
 * Full mode: returns product info + all available sizes (for product creation wizard)
 *
 * Full mode uses a DB cache (stockx_products_cache) to avoid re-calling StockX API.
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

  const mode = req.nextUrl.searchParams.get("mode");
  const userId = session.user.id;

  // ── Full mode: return product + all sizes ──
  if (mode === "full") {
    // 1. Check cache first — avoid calling StockX if we already have this product
    const cached = await getCachedStockXProduct(sku);
    if (cached && cached.variants.length > 0) {
      return NextResponse.json({
        status: "found",
        title: cached.title,
        styleId: cached.styleId,
        imageUrl: cached.imageUrl,
        variants: cached.variants.map((v) => ({
          variantId: v.variantId,
          sizeUS: v.sizeUS,
          sizeEU: v.sizeEU,
        })),
      });
    }

    // 2. Not in cache — search StockX API
    const result = await searchProductBySkuStockX(sku);

    if (!result) {
      return NextResponse.json({
        status: "error",
        message: "Service StockX temporairement indisponible.",
      });
    }

    if (result.status === "found" && result.variants.length > 0) {
      // 3. Store in cache for future lookups
      await upsertCachedStockXProduct(sku, {
        stockxProductId: result.productId,
        title: result.title,
        styleId: result.styleId,
        imageUrl: result.imageUrl,
        variants: result.variants,
      });

      // Also cache the image in sku_images table
      if (result.imageUrl) {
        await upsertSkuImage(sku, result.imageUrl, "stockx", "found", result.productId);
      }

      return NextResponse.json({
        status: "found",
        title: result.title,
        styleId: result.styleId,
        imageUrl: result.imageUrl,
        variants: result.variants.map((v) => ({
          variantId: v.variantId,
          sizeUS: v.sizeUS,
          sizeEU: v.sizeEU,
        })),
      });
    }

    return NextResponse.json({
      status: "not_found",
      message: "Produit non trouve sur StockX.",
    });
  }

  // ── Default mode: image-only lookup ──

  // 1. Check global cache
  const cachedImage = await getSkuImage(sku);
  if (cachedImage) {
    if ((cachedImage.status === "found" || cachedImage.status === "manual") && cachedImage.imageUrl) {
      return NextResponse.json({
        imageUrl: cachedImage.imageUrl,
        source: cachedImage.source,
        status: "found",
      });
    }

    if (cachedImage.status === "not_found") {
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

  if (!stockxResult) {
    return NextResponse.json({
      imageUrl: null,
      status: "error",
      message: "Service StockX temporairement indisponible.",
    });
  }

  if (stockxResult.status === "found" && stockxResult.imageUrl) {
    await upsertSkuImage(sku, stockxResult.imageUrl, "stockx", "found", stockxResult.productId);
    return NextResponse.json({
      imageUrl: stockxResult.imageUrl,
      title: stockxResult.title,
      source: "stockx",
      status: "found",
    });
  }

  await upsertSkuImage(sku, null, "stockx", "not_found", stockxResult.productId);

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
