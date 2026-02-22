import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { getNotFoundSkuImages } from "@/lib/queries/sku-images";
import { getAllAdvice } from "@/lib/queries/product-advice";
import { AdminTabs } from "@/components/admin/admin-tabs";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    redirect("/dashboard");
  }

  const [notFoundSkus, adviceItems] = await Promise.all([
    getNotFoundSkuImages(),
    getAllAdvice(),
  ]);

  return (
    <div className="py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold">Admin</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gestion des images SKU et conseils pour la communaute.
        </p>
      </div>

      <AdminTabs
        skus={notFoundSkus.map((s) => ({
          id: s.id,
          sku: s.sku,
          stockxProductId: s.stockxProductId,
          createdAt: s.createdAt.toISOString(),
        }))}
        adviceItems={adviceItems.map((a) => ({
          id: a.id,
          sku: a.sku,
          title: a.title,
          message: a.message,
          severity: a.severity,
          active: a.active,
          createdAt: a.createdAt.toISOString(),
          creatorUsername: a.creatorUsername,
        }))}
      />
    </div>
  );
}
