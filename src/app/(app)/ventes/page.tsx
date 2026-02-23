import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSalesByUser } from "@/lib/queries/sales";
import { ExportCsvButton } from "@/components/sales/export-csv-button";
import { VentesTabs } from "@/components/sales/ventes-tabs";

export default async function VentesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const salesData = await getSalesByUser(session.user.id);

  // Serialize for client component (VentesClient format)
  const serialized = salesData.map(({ sale, variant, product }) => ({
    sale: {
      id: sale.id,
      salePrice: sale.salePrice,
      saleDate: sale.saleDate,
      platform: sale.platform,
      platformFee: sale.platformFee,
      shippingCost: sale.shippingCost,
      otherFees: sale.otherFees,
      buyerUsername: sale.buyerUsername ?? null,
      paymentStatus: sale.paymentStatus ?? null,
    },
    variant: {
      purchasePrice: variant.purchasePrice,
      sizeVariant: variant.sizeVariant,
    },
    product: {
      name: product.name,
      imageUrl: product.imageUrl,
      sku: product.sku,
    },
  }));

  return (
    <div className="py-4 space-y-4 lg:py-6 lg:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold lg:text-2xl">Ventes</h1>
          <p className="text-sm text-muted-foreground">
            {salesData.length} vente{salesData.length !== 1 ? "s" : ""}
          </p>
        </div>
        <ExportCsvButton />
      </div>

      <VentesTabs
        userSales={serialized}
        userName={session.user.discordUsername ?? session.user.name ?? undefined}
      />
    </div>
  );
}
