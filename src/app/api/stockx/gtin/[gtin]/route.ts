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

    return NextResponse.json({
      status: result.status,
      title: result.title,
      styleId: result.styleId,
      imageUrl: result.imageUrl,
      variants: result.variants,
    });
  } catch {
    return NextResponse.json(
      { status: "error", message: "Erreur lors de la recherche" },
      { status: 500 }
    );
  }
}
