import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getStockProductsGrouped } from "@/lib/queries/products";
import { getActiveAdviceForSkus } from "@/lib/queries/product-advice";
import { ProductGroupCard } from "@/components/product/product-card";
import { ProductFilters } from "@/components/product/product-filters";
import { AdviceBanner } from "@/components/product/advice-banner";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

interface StockPageProps {
  searchParams: Promise<{ category?: string }>;
}

export default async function StockPage({ searchParams }: StockPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;

  // Get stock products grouped by parent (excludes fully-sold products)
  const allProducts = await getStockProductsGrouped(session.user.id);

  // Get active advice for user's products
  const userSkus = allProducts
    .map((p) => p.sku)
    .filter((sku): sku is string => sku !== null && sku !== undefined);
  const advice = await getActiveAdviceForSkus(userSkus);

  // Apply category filter
  let filtered = allProducts;
  if (params.category) {
    filtered = filtered.filter((p) => p.category === params.category);
  }

  // Count total variants in stock
  const totalInStock = filtered.reduce((sum, p) => sum + Number(p.inStockCount), 0);

  return (
    <div className="py-4 space-y-4">
      {/* Admin advice banners */}
      {advice.length > 0 && (
        <div className="space-y-2">
          {advice.map((a) => (
            <AdviceBanner
              key={a.id}
              title={a.title}
              message={a.message}
              severity={a.severity}
              sku={a.sku}
            />
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Stock</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} produit{filtered.length !== 1 ? "s" : ""} &middot; {totalInStock} unit{totalInStock !== 1 ? "es" : "e"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Suspense fallback={null}>
            <ProductFilters />
          </Suspense>
          <Link href="/stock/add">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Ajouter
            </Button>
          </Link>
        </div>
      </div>

      {/* Product list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">Aucun produit en stock</p>
            <Link href="/stock/add">
              <Button variant="outline" size="sm" className="mt-3">
                Ajouter un produit
              </Button>
            </Link>
          </div>
        ) : (
          filtered.map((product) => (
            <ProductGroupCard key={product.id} product={product} />
          ))
        )}
      </div>
    </div>
  );
}
