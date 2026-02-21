import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getNotFoundSkuImages } from "@/lib/queries/sku-images";
import { MissingSkuList } from "@/components/admin/missing-sku-list";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "staff") {
    redirect("/dashboard");
  }

  const notFoundSkus = await getNotFoundSkuImages();

  return (
    <div className="py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Admin — Images SKU</h1>
        <p className="text-sm text-muted-foreground mt-1">
          SKUs dont l&apos;image n&apos;a pas pu etre trouvee automatiquement.
          Vous pouvez ajouter manuellement une image pour chaque SKU.
        </p>
      </div>

      {notFoundSkus.length === 0 ? (
        <div className="rounded-xl bg-secondary p-8 text-center">
          <p className="text-muted-foreground">
            Aucun SKU en attente d&apos;image. Tout est a jour !
          </p>
        </div>
      ) : (
        <MissingSkuList
          skus={notFoundSkus.map((s) => ({
            id: s.id,
            sku: s.sku,
            stockxProductId: s.stockxProductId,
            createdAt: s.createdAt.toISOString(),
          }))}
        />
      )}
    </div>
  );
}
