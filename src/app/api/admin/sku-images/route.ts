import { requireStaff } from "@/lib/auth-utils";
import { upsertSkuImage } from "@/lib/queries/sku-images";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/admin/sku-images
 * Staff-only: manually set an image for a SKU.
 * This makes the image available to all users.
 */
export async function POST(req: NextRequest) {
  const authResult = await requireStaff();
  if (authResult instanceof NextResponse) return authResult;

  const body = await req.json();
  const sku = (body.sku as string)?.trim().toUpperCase();
  const imageUrl = body.imageUrl as string;

  if (!sku || sku.length < 3) {
    return NextResponse.json({ error: "SKU invalide" }, { status: 400 });
  }
  if (!imageUrl) {
    return NextResponse.json({ error: "imageUrl requis" }, { status: 400 });
  }

  // Update global SKU image with "manual" status
  await upsertSkuImage(sku, imageUrl, "manual", "manual");

  return NextResponse.json({ success: true });
}
