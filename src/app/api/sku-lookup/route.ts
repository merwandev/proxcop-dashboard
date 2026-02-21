import { auth } from "@/lib/auth";
import { getSkuImage, upsertSkuImage } from "@/lib/queries/sku-images";
import { NextRequest, NextResponse } from "next/server";

// Known image URL patterns for sneaker SKUs
const IMAGE_SOURCES = [
  (sku: string) =>
    `https://images.stockx.com/images/${sku}.png?fit=fill&bg=FFFFFF&w=700&h=500&fm=webp&auto=compress&trim=color&q=90`,
  (sku: string) =>
    `https://images.stockx.com/images/${sku}_Product.jpg`,
];

async function tryFetchImage(sku: string): Promise<string | null> {
  for (const urlFn of IMAGE_SOURCES) {
    const url = urlFn(sku);
    try {
      const response = await fetch(url, {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        return url;
      }
    } catch {
      // Try next source
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const sku = req.nextUrl.searchParams.get("sku")?.trim().toUpperCase();
  if (!sku || sku.length < 3) {
    return NextResponse.json({ error: "SKU invalide" }, { status: 400 });
  }

  // 1. Check cache
  const cached = await getSkuImage(sku);
  if (cached) {
    return NextResponse.json({
      imageUrl: cached.imageUrl,
      source: cached.source,
    });
  }

  // 2. Try to fetch from external sources
  const externalUrl = await tryFetchImage(sku);
  if (externalUrl) {
    // Cache for future lookups
    await upsertSkuImage(sku, externalUrl, "stockx");
    return NextResponse.json({ imageUrl: externalUrl, source: "stockx" });
  }

  // 3. Not found
  return NextResponse.json({ imageUrl: null }, { status: 404 });
}
