import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getProductWithVariants } from "@/lib/queries/products";
import { getActiveAdviceForSkus } from "@/lib/queries/product-advice";
import { getMedianSalePricesBatch, getSalesBySku } from "@/lib/queries/sales";
import { DeleteProductButton } from "@/components/product/delete-product-button";
import { ProductDetailClient } from "@/components/product/product-detail-client";
import { SkuSalesSection } from "@/components/product/sku-sales-section";
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

  // Get advice + median prices + sku sales for this product's SKU
  const [advice, medianPrices, skuSales] = await Promise.all([
    product.sku ? getActiveAdviceForSkus([product.sku]) : Promise.resolve([]),
    product.sku ? getMedianSalePricesBatch(product.sku) : Promise.resolve({}),
    product.sku ? getSalesBySku(product.sku) : Promise.resolve([]),
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
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link href="/stock" className="p-1 flex-shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-base sm:text-xl font-bold truncate">{product.name}</h1>
        </div>
        <div className="flex-shrink-0">
          <DeleteProductButton productId={product.id} />
        </div>
      </div>

      {/* Client component for interactive variant management */}
      <ProductDetailClient product={product} medianPrices={medianPrices} />

      {/* SKU sales history (community data) */}
      {skuSales.length > 0 && (
        <SkuSalesSection sales={skuSales} sku={product.sku!} />
      )}
    </div>
  );
}
