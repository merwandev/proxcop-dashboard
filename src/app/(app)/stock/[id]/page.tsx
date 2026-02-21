import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getProductWithSale } from "@/lib/queries/products";
import { ProductForm } from "@/components/product/product-form";
import { SaleDialog } from "@/components/sales/sale-dialog";
import { DeleteProductButton } from "@/components/product/delete-product-button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const product = await getProductWithSale(id, session.user.id);
  if (!product) notFound();

  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/stock" className="p-1">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold">Modifier</h1>
        </div>
        <div className="flex items-center gap-2">
          {product.status !== "vendu" && <SaleDialog productId={product.id} />}
          <DeleteProductButton productId={product.id} />
        </div>
      </div>
      <ProductForm product={product} />
    </div>
  );
}
