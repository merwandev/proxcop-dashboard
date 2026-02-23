import { NextRequest, NextResponse } from "next/server";
import { lookupByGtinStockX } from "@/lib/stockx/client";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ gtin: string }> }
) {
  const { gtin } = await params;

  if (!gtin || gtin.length < 8) {
    return NextResponse.json(
      { status: "error", message: "GTIN invalide" },
      { status: 400 }
    );
  }

  try {
    const result = await lookupByGtinStockX(gtin);

    if (!result) {
      return NextResponse.json({ status: "not_found" });
    }

    // Parse variantName: split by ":" to get name part, replace "-" with spaces
    const rawVariantName = (result as { variantName?: string }).variantName ?? "";
    let parsedName = "";
    if (rawVariantName) {
      const namePart = rawVariantName.includes(":") ? rawVariantName.split(":")[0] : rawVariantName;
      parsedName = namePart.replace(/-/g, " ").trim();
    }

    return NextResponse.json({
      status: result.status,
      title: result.title,
      styleId: result.styleId,
      imageUrl: result.imageUrl,
      variants: result.variants,
      variantName: parsedName || undefined,
    });
  } catch {
    return NextResponse.json(
      { status: "error", message: "Erreur lors de la recherche" },
      { status: 500 }
    );
  }
}
