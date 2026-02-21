import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSalesByUser } from "@/lib/queries/sales";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExportCsvButton } from "@/components/sales/export-csv-button";

export default async function VentesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const salesData = await getSalesByUser(session.user.id);

  // Compute totals
  const totalRevenue = salesData.reduce(
    (sum, s) => sum + Number(s.sale.salePrice),
    0
  );
  const totalProfit = salesData.reduce((sum, s) => {
    const profit =
      Number(s.sale.salePrice) -
      Number(s.product.purchasePrice) -
      Number(s.sale.platformFee ?? 0) -
      Number(s.sale.shippingCost ?? 0) -
      Number(s.sale.otherFees ?? 0);
    return sum + profit;
  }, 0);

  return (
    <div className="py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Ventes</h1>
          <p className="text-sm text-muted-foreground">
            {salesData.length} vente{salesData.length !== 1 ? "s" : ""}
          </p>
        </div>
        <ExportCsvButton />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="p-3 bg-card border-border">
          <p className="text-[10px] text-muted-foreground uppercase">Total ventes</p>
          <p className="text-lg font-bold">{formatCurrency(totalRevenue)}</p>
        </Card>
        <Card className="p-3 bg-card border-border">
          <p className="text-[10px] text-muted-foreground uppercase">Profit total</p>
          <p className="text-lg font-bold text-success">{formatCurrency(totalProfit)}</p>
        </Card>
      </div>

      {/* Sales list */}
      <div className="space-y-2">
        {salesData.length === 0 ? (
          <p className="text-center py-12 text-sm text-muted-foreground">
            Aucune vente enregistree
          </p>
        ) : (
          salesData.map(({ sale, product }) => {
            const profit =
              Number(sale.salePrice) -
              Number(product.purchasePrice) -
              Number(sale.platformFee ?? 0) -
              Number(sale.shippingCost ?? 0) -
              Number(sale.otherFees ?? 0);
            const margin =
              Number(sale.salePrice) > 0
                ? (profit / Number(sale.salePrice)) * 100
                : 0;

            return (
              <Card key={sale.id} className="p-3 bg-card border-border">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-sm truncate">
                      {product.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(sale.saleDate)}
                      </span>
                      {sale.platform && (
                        <Badge
                          variant="outline"
                          className="text-[10px] border-border capitalize"
                        >
                          {sale.platform}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span>Achat: {formatCurrency(Number(product.purchasePrice))}</span>
                      <span>Vente: {formatCurrency(Number(sale.salePrice))}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className={`text-sm font-bold ${profit >= 0 ? "text-success" : "text-danger"}`}>
                      {profit >= 0 ? "+" : ""}{formatCurrency(profit)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {margin.toFixed(1)}% marge
                    </p>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
