import { ProductForm } from "@/components/product/product-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AddProductPage() {
  return (
    <div className="py-4 space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/stock" className="p-1">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Ajouter un produit</h1>
      </div>
      <ProductForm />
    </div>
  );
}
