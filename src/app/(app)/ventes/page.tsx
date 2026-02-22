import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSalesByUser, getCommunitySales } from "@/lib/queries/sales";
import { ExportCsvButton } from "@/components/sales/export-csv-button";
import { VentesTabs } from "@/components/sales/ventes-tabs";

export default async function VentesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [salesData, communitySalesRaw] = await Promise.all([
    getSalesByUser(session.user.id),
    getCommunitySales(50),
  ]);

  // Compute totals
  const totalRevenue = salesData.reduce(
    (sum, s) => sum + Number(s.sale.salePrice),
    0
  );
  const totalProfit = salesData.reduce((sum, s) => {
    const profit =
      Number(s.sale.salePrice) -
      Number(s.variant.purchasePrice) -
      Number(s.sale.platformFee ?? 0) -
      Number(s.sale.shippingCost ?? 0) -
      Number(s.sale.otherFees ?? 0);
    return sum + profit;
  }, 0);

  // Serialize community sales for client component
  const communitySales = communitySalesRaw.map((s) => ({
    saleId: s.saleId,
    productName: s.productName,
    sku: s.sku,
    imageUrl: s.imageUrl,
    sizeVariant: s.sizeVariant,
    salePrice: s.salePrice,
    platform: s.platform,
    saleDate: s.saleDate,
    category: s.category,
  }));

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

      <VentesTabs
        userSales={salesData}
        communitySales={communitySales}
        totalRevenue={totalRevenue}
        totalProfit={totalProfit}
      />
    </div>
  );
}
