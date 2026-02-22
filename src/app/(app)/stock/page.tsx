import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getStockProductsGrouped } from "@/lib/queries/products";
import { getActiveAdviceForSkus } from "@/lib/queries/product-advice";
import { StockClient } from "@/components/product/stock-client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function StockPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const allProducts = await getStockProductsGrouped(session.user.id);

  // Get active advice for user's products (for filter chip, not display)
  const userSkus = allProducts
    .map((p) => p.sku)
    .filter((sku): sku is string => sku !== null && sku !== undefined);
  const advice = await getActiveAdviceForSkus(userSkus);
  const adviceSkus = advice.map((a) => a.sku.toUpperCase());

  // Count total variants in stock
  const totalInStock = allProducts.reduce(
    (sum, p) => sum + Number(p.inStockCount),
    0
  );

  return (
    <div className="py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Stock</h1>
          <p className="text-sm text-muted-foreground">
            {allProducts.length} produit{allProducts.length !== 1 ? "s" : ""}{" "}
            &middot; {totalInStock} unité{totalInStock !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/stock/add">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Ajouter
          </Button>
        </Link>
      </div>

      <StockClient products={allProducts} adviceSkus={adviceSkus} />
    </div>
  );
}
