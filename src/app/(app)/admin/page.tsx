import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { getNotFoundSkuImages, getProductsWithoutImages } from "@/lib/queries/sku-images";
import { getAllAdvice } from "@/lib/queries/product-advice";
import { getConfigValue } from "@/lib/queries/config";
import { AdminTabs } from "@/components/admin/admin-tabs";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    redirect("/dashboard");
  }

  const [notFoundSkus, adviceItems, productsNoImage, webhookUrl] = await Promise.all([
    getNotFoundSkuImages(),
    getAllAdvice(),
    getProductsWithoutImages(),
    getConfigValue("discord_webhook_url"),
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
        productsNoImage={productsNoImage.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          category: p.category,
          createdAt: p.createdAt.toISOString(),
          ownerUsername: p.ownerUsername,
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
        webhookUrl={webhookUrl}
      />
    </div>
  );
}
