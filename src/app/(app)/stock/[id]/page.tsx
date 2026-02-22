import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getProductWithVariants } from "@/lib/queries/products";
import { getActiveAdviceForSkus } from "@/lib/queries/product-advice";
import { getMedianSalePricesBatch } from "@/lib/queries/sales";
import { DeleteProductButton } from "@/components/product/delete-product-button";
import { ProductDetailClient } from "@/components/product/product-detail-client";
import { AdviceBanner } from "@/components/product/advice-banner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const product = await getProductWithVariants(id, session.user.id);
  if (!product) notFound();

  // Get advice + median prices for this product's SKU
  const [advice, medianPrices] = await Promise.all([
    product.sku ? getActiveAdviceForSkus([product.sku]) : Promise.resolve([]),
    product.sku ? getMedianSalePricesBatch(product.sku) : Promise.resolve({}),
  ]);

  return (
    <div className="py-4 space-y-4">
      {/* Advice banner */}
      {advice.map((a) => (
        <AdviceBanner
          key={a.id}
          title={a.title}
          message={a.message}
          severity={a.severity}
          sku={a.sku}
        />
      ))}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/stock" className="p-1">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold truncate">{product.name}</h1>
        </div>
        <DeleteProductButton productId={product.id} />
      </div>

      {/* Client component for interactive variant management */}
      <ProductDetailClient product={product} medianPrices={medianPrices} />
    </div>
  );
}
