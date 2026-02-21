import { auth } from "@/lib/auth";
import { getSalesByUser } from "@/lib/queries/sales";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const salesData = await getSalesByUser(session.user.id);

  const headers = [
    "Produit",
    "Categorie",
    "Taille",
    "Prix Achat",
    "Prix Vente",
    "Commission",
    "Frais Envoi",
    "Autres Frais",
    "Profit Net",
    "Marge %",
    "Plateforme",
    "Date Achat",
    "Date Vente",
  ];

  const rows = salesData.map(({ sale, product }) => {
    const profit =
      Number(sale.salePrice) -
      Number(product.purchasePrice) -
      Number(sale.platformFee ?? 0) -
      Number(sale.shippingCost ?? 0) -
      Number(sale.otherFees ?? 0);
    const margin =
      Number(sale.salePrice) > 0
        ? ((profit / Number(sale.salePrice)) * 100).toFixed(1)
        : "0";

    return [
      product.name,
      product.category,
      product.sizeVariant ?? "",
      product.purchasePrice,
      sale.salePrice,
      sale.platformFee ?? "0",
      sale.shippingCost ?? "0",
      sale.otherFees ?? "0",
      profit.toFixed(2),
      margin,
      sale.platform ?? "",
      product.purchaseDate,
      sale.saleDate,
    ];
  });

  const csv =
    headers.join(",") +
    "\n" +
    rows.map((row) => row.map((v) => `"${v}"`).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="proxcop-ventes.csv"`,
    },
  });
}
