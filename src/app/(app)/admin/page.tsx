import { auth } from "@/lib/auth";
import { isAdminRole } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { getNotFoundSkuImages, getProductsWithoutImages, getUserUploadedImages } from "@/lib/queries/sku-images";
import { getAllAdvice } from "@/lib/queries/product-advice";
import { getAllAdminProducts } from "@/lib/queries/admin-products";
import { getAllSalesWithUsers } from "@/lib/queries/admin-sales";
import { getConfigValue } from "@/lib/queries/config";
import { getAllSentMessages } from "@/lib/queries/messages";
import { getAdminLogs } from "@/lib/queries/admin-logs";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { AdminAnalytics } from "@/components/admin/admin-analytics";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    redirect("/dashboard");
  }

  const [notFoundSkus, adviceItems, productsNoImage, userUploadedImagesRaw, adminProductsRaw, adminSalesRaw, sentMessagesRaw, adminLogsRaw, webhookUrl] = await Promise.all([
    getNotFoundSkuImages(),
    getAllAdvice(),
    getProductsWithoutImages(),
    getUserUploadedImages(),
    getAllAdminProducts(),
    getAllSalesWithUsers(200),
    getAllSentMessages(200),
    getAdminLogs(200),
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

      {/* Analytics Vercel */}
      <AdminAnalytics />

      <AdminTabs
        skus={notFoundSkus.map((s) => ({
          id: s.id,
          sku: s.sku,
          stockxProductId: s.stockxProductId,
          createdAt: s.createdAt.toISOString(),
        }))}
        userUploadedImages={userUploadedImagesRaw.map((img) => ({
          imageUrl: img.imageUrl,
          name: img.name,
          sku: img.sku,
          category: img.category,
          ownerUsername: img.ownerUsername,
          count: img.count,
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
        adminProducts={adminProductsRaw.map((p) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          imageUrl: p.imageUrl,
          category: p.category,
          sizes: (p.sizes as string[]) ?? [],
          createdAt: p.createdAt.toISOString(),
          creatorUsername: p.creatorUsername,
        }))}
        adminSales={adminSalesRaw.map((s) => ({
          saleId: s.saleId,
          salePrice: s.salePrice,
          saleDate: s.saleDate,
          platform: s.platform,
          purchasePrice: s.purchasePrice,
          sizeVariant: s.sizeVariant,
          productName: s.productName,
          productSku: s.productSku,
          productImageUrl: s.productImageUrl,
          userId: s.userId,
          discordUsername: s.discordUsername,
          discordAvatar: s.discordAvatar,
          discordId: s.discordId,
        }))}
        sentMessages={sentMessagesRaw.map((m) => ({
          id: m.id,
          subject: m.subject,
          body: m.body,
          read: m.read,
          createdAt: m.createdAt.toISOString(),
          fromUsername: m.fromUsername,
          fromAvatar: m.fromAvatar,
          fromDiscordId: m.fromDiscordId,
          toUsername: m.toUsername,
        }))}
        adminLogs={adminLogsRaw.map((l) => ({
          id: l.id,
          action: l.action,
          target: l.target,
          details: l.details,
          createdAt: l.createdAt.toISOString(),
          adminUsername: l.adminUsername,
          adminAvatar: l.adminAvatar,
          adminDiscordId: l.adminDiscordId,
        }))}
        webhookUrl={webhookUrl}
      />
    </div>
  );
}
