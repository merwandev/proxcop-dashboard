import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { products, productVariants } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const result = await db
    .select({
      productName: products.name,
      sku: products.sku,
      category: products.category,
      sizeVariant: productVariants.sizeVariant,
      purchasePrice: productVariants.purchasePrice,
      purchaseDate: productVariants.purchaseDate,
      targetPrice: productVariants.targetPrice,
      status: productVariants.status,
      storageLocation: productVariants.storageLocation,
      returnDeadline: productVariants.returnDeadline,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(and(eq(productVariants.userId, session.user.id), ne(productVariants.status, "vendu")))
    .orderBy(products.name, productVariants.sizeVariant);

  const headers = [
    "Produit",
    "SKU",
    "Categorie",
    "Taille",
    "Prix Achat",
    "Prix Cible",
    "Date Achat",
    "Statut",
    "Lieu Stockage",
    "Date Retour",
  ];

  const rows = result.map((r) => [
    r.productName,
    r.sku ?? "",
    r.category,
    r.sizeVariant ?? "",
    r.purchasePrice,
    r.targetPrice ?? "",
    r.purchaseDate,
    r.status,
    r.storageLocation ?? "",
    r.returnDeadline ?? "",
  ]);

  const csv =
    headers.join(",") +
    "\n" +
    rows.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="proxstock-stock-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
