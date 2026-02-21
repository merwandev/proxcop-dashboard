import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getProductsByUser, getStockProducts } from "@/lib/queries/products";
import { ProductCard } from "@/components/product/product-card";
import { ProductFilters } from "@/components/product/product-filters";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface StockPageProps {
  searchParams: Promise<{ category?: string; platform?: string; status?: string }>;
}

export default async function StockPage({ searchParams }: StockPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;

  // By default, exclude sold products from stock view.
  // If user explicitly filters by a status (including "vendu"), show that status.
  const allProducts = params.status
    ? await getProductsByUser(session.user.id)
    : await getStockProducts(session.user.id);

  // Apply filters
  let filtered = allProducts;
  if (params.category) {
    filtered = filtered.filter((p) => p.category === params.category);
  }
  if (params.platform) {
    filtered = filtered.filter((p) => p.platform === params.platform);
  }
  if (params.status) {
    filtered = filtered.filter((p) => p.status === params.status);
  }

  return (
    <div className="py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Stock</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} produit{filtered.length !== 1 ? "s" : ""}
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
            <p className="text-sm">Aucun produit</p>
            <Link href="/stock/add">
              <Button variant="outline" size="sm" className="mt-3">
                Ajouter un produit
              </Button>
            </Link>
          </div>
        ) : (
          filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))
        )}
      </div>
    </div>
  );
}

export function StockPageSkeleton() {
  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-8 w-20" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-xl" />
      ))}
    </div>
  );
}
