import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProductForm } from "@/components/product/product-form";
import { getUserSuppliers } from "@/lib/queries/suppliers";
import { getRecentProducts, getTrendingProducts } from "@/lib/queries/products";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function AddProductPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [suppliers, recentProducts, trendingProducts] = await Promise.all([
    getUserSuppliers(session.user.id),
    getRecentProducts(session.user.id, 5),
    getTrendingProducts(7, 5),
  ]);

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/stock" className="p-1">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Ajouter un produit</h1>
          <p className="text-sm text-muted-foreground">Recherche StockX ou ajout manuel</p>
        </div>
      </div>
      <ProductForm
        suppliers={suppliers}
        recentProducts={recentProducts}
        trendingProducts={trendingProducts}
      />
    </div>
  );
}
