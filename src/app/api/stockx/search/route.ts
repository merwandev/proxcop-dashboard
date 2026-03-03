import { auth } from "@/lib/auth";
import { searchCatalogStockX, getProductByIdStockX } from "@/lib/stockx/client";
import {
  getCachedStockXProduct,
  upsertCachedStockXProduct,
} from "@/lib/queries/sku-images";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/stockx/search?q=Nike+Dunk+Low+Black
 * Returns multiple product results from StockX catalog.
 *
 * GET /api/stockx/search?productId=xxx&styleId=DD1391-100&title=...
 * Returns full product details (variants/sizes) for a specific product.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const productId = req.nextUrl.searchParams.get("productId");

  // ── Mode 2: Get full product by ID (after user picks from search results) ──
  if (productId) {
    const title = req.nextUrl.searchParams.get("title") ?? "";
    const styleId = req.nextUrl.searchParams.get("styleId") ?? "";
    const thumbUrl = req.nextUrl.searchParams.get("imageUrl") ?? null;

    // Check cache first by styleId (SKU)
    if (styleId) {
      const cached = await getCachedStockXProduct(styleId.toUpperCase());
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
    }

    // Fetch from StockX API
    const result = await getProductByIdStockX(productId);

    if (!result) {
      return NextResponse.json({
        status: "error",
        message: "Service de search temporairement indisponible.",
      });
    }

    if (result.status === "found" && result.variants.length > 0) {
      // Use the title/styleId/imageUrl from the search result (more reliable)
      const finalTitle = title || result.title;
      const finalStyleId = styleId || result.styleId;
      const finalImageUrl = result.imageUrl || thumbUrl;

      // Cache for future
      if (finalStyleId) {
        await upsertCachedStockXProduct(finalStyleId.toUpperCase(), {
          stockxProductId: productId,
          title: finalTitle,
          styleId: finalStyleId,
          imageUrl: finalImageUrl,
          variants: result.variants,
        });
      }

      return NextResponse.json({
        status: "found",
        title: finalTitle,
        styleId: finalStyleId,
        imageUrl: finalImageUrl,
        variants: result.variants.map((v) => ({
          variantId: v.variantId,
          sizeUS: v.sizeUS,
          sizeEU: v.sizeEU,
        })),
      });
    }

    return NextResponse.json({
      status: "not_found",
      message: "Aucune variante trouvée pour ce produit.",
    });
  }

  // ── Mode 1: Text search (returns multiple results) ──
  const query = req.nextUrl.searchParams.get("q")?.trim();
  if (!query || query.length < 2) {
    return NextResponse.json({ error: "Query trop courte" }, { status: 400 });
  }

  const results = await searchCatalogStockX(query, 10);

  if (results === null) {
    return NextResponse.json({
      status: "error",
      message: "Service de search temporairement indisponible.",
    });
  }

  return NextResponse.json({
    status: "ok",
    products: results,
  });
}
