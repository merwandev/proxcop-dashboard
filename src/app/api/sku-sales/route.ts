import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSalesBySku } from "@/lib/queries/sales";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const sku = req.nextUrl.searchParams.get("sku");
  if (!sku) {
    return NextResponse.json({ error: "SKU requis" }, { status: 400 });
  }

  const sales = await getSalesBySku(sku);
  return NextResponse.json({ sales });
}
