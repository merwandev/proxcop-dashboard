import { NextRequest, NextResponse } from "next/server";

const STOCK_TEMPLATE_HEADERS = [
  "Produit",
  "SKU",
  "Categorie",
  "Taille",
  "Prix Achat",
  "Date Achat",
  "Prix Cible",
  "Statut",
  "Lieu Stockage",
  "Date Retour",
  "Fournisseur",
];

const STOCK_TEMPLATE_EXAMPLE = [
  "Nike Dunk Low Panda",
  "DD1391-100",
  "sneakers",
  "42",
  "110",
  "2025-01-15",
  "180",
  "en_stock",
  "",
  "2025-02-15",
  "",
];

const SALES_TEMPLATE_HEADERS = [
  "Produit",
  "SKU",
  "Categorie",
  "Taille",
  "Prix Achat",
  "Date Achat",
  "Prix Vente",
  "Date Vente",
  "Plateforme",
  "Commission",
  "Frais Envoi",
  "Autres Frais",
];

const SALES_TEMPLATE_EXAMPLE = [
  "Nike Dunk Low Panda",
  "DD1391-100",
  "sneakers",
  "42",
  "110",
  "2025-01-15",
  "180",
  "2025-02-10",
  "stockx",
  "18",
  "5",
  "0",
];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;

  if (type !== "stock" && type !== "sales") {
    return NextResponse.json({ error: "Type invalide" }, { status: 400 });
  }

  const headers = type === "stock" ? STOCK_TEMPLATE_HEADERS : SALES_TEMPLATE_HEADERS;
  const example = type === "stock" ? STOCK_TEMPLATE_EXAMPLE : SALES_TEMPLATE_EXAMPLE;

  const csv =
    headers.join(",") +
    "\n" +
    example.map((v) => `"${v}"`).join(",") +
    "\n";

  const filename = type === "stock" ? "template-stock.csv" : "template-ventes.csv";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
