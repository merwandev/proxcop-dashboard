import { NextRequest, NextResponse } from "next/server";
import { searchAdminProducts } from "@/lib/queries/admin-products";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (q.length < 1) {
    return NextResponse.json({ products: [] });
  }

  try {
    const results = await searchAdminProducts(q);
    return NextResponse.json({
      products: results.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        imageUrl: p.imageUrl,
        category: p.category,
        sizes: (p.sizes as string[]) ?? [],
      })),
    });
  } catch {
    return NextResponse.json({ products: [] });
  }
}
