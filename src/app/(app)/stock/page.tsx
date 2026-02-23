import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getStockProductsGrouped, getStockKPIs } from "@/lib/queries/products";
import { getActiveAdviceForSkus } from "@/lib/queries/product-advice";
import { StockClient } from "@/components/product/stock-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Package, Wallet, TrendingUp, Clock } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils/format";

export default async function StockPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [allProducts, stockKPIs] = await Promise.all([
    getStockProductsGrouped(session.user.id),
    getStockKPIs(session.user.id),
  ]);

  // Get active advice for user's products (for filter chip, not display)
  const userSkus = allProducts
    .map((p) => p.sku)
    .filter((sku): sku is string => sku !== null && sku !== undefined);
  const advice = await getActiveAdviceForSkus(userSkus);
  // Only include advice that the user hasn't dismissed/read
  const unreadAdvice = advice.filter(
    (a) => !(a.readBy ?? []).includes(session.user.id)
  );
  const adviceSkus = unreadAdvice.map((a) => a.sku.toUpperCase());

  // Count total variants in stock
  const totalInStock = allProducts.reduce(
    (sum, p) => sum + Number(p.inStockCount),
    0
  );

  return (
    <div className="py-4 space-y-4 lg:py-6 lg:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold lg:text-2xl">Stock</h1>
          <p className="text-sm text-muted-foreground">
            {allProducts.length} produit{allProducts.length !== 1 ? "s" : ""}{" "}
            &middot; {totalInStock} unité{totalInStock !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/stock/add">
          <Button size="sm" className="gap-1.5 hover:bg-background hover:text-primary hover:border hover:border-primary/50">
            <Plus className="h-3.5 w-3.5" />
            Ajouter
          </Button>
        </Link>
      </div>

      {/* KPIs */}
      {stockKPIs.totalPairs > 0 && (
        <div className="grid grid-cols-4 gap-2">
          <Card className="p-2.5 gap-0 bg-card border-border">
            <div className="flex items-center gap-1 mb-1">
              <Package className="h-3 w-3 text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground uppercase">Paires</p>
            </div>
            <p className="text-sm font-bold">{stockKPIs.totalPairs}</p>
          </Card>
          <Card className="p-2.5 gap-0 bg-card border-border">
            <div className="flex items-center gap-1 mb-1">
              <Wallet className="h-3 w-3 text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground uppercase">Valeur</p>
            </div>
            <p className="text-sm font-bold">{formatCurrency(stockKPIs.totalValue)}</p>
          </Card>
          <Card className="p-2.5 gap-0 bg-card border-border">
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="h-3 w-3 text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground uppercase">Moy.</p>
            </div>
            <p className="text-sm font-bold">{formatCurrency(stockKPIs.avgPrice)}</p>
          </Card>
          <Card className="p-2.5 gap-0 bg-card border-border">
            <div className="flex items-center gap-1 mb-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground uppercase">Jours</p>
            </div>
            <p className="text-sm font-bold">{stockKPIs.avgDaysInStock}j</p>
          </Card>
        </div>
      )}

      <StockClient products={allProducts} adviceSkus={adviceSkus} />
    </div>
  );
}
