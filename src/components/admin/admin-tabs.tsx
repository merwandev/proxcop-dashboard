"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MissingSkuList } from "./missing-sku-list";
import { MissingImageProducts } from "./missing-image-products";
import { AdviceForm } from "./advice-form";
import { AdviceList } from "./advice-list";
import { WebhookConfig } from "./webhook-config";
import { RoleManager } from "./role-manager";
import { AdminProducts } from "./admin-products";
import { AdminSalesList, type AdminSaleItem } from "./admin-sales-list";
import { AdminSentMessages, type AdminSentMessage } from "./admin-sent-messages";
import { AdminLogs, type AdminLogItem } from "./admin-logs";
import { UserUploadedImages } from "./user-uploaded-images";
import { ImageIcon, Megaphone, Settings, Package, ShoppingCart, Mail, ScrollText } from "lucide-react";

interface SkuItem {
  id: string;
  sku: string;
  stockxProductId: string | null;
  createdAt: string;
}

interface ProductNoImage {
  id: string;
  name: string;
  sku: string | null;
  category: string;
  createdAt: string;
  ownerUsername: string;
}

interface AdviceItem {
  id: string;
  sku: string;
  title: string;
  message: string;
  severity: string;
  active: boolean;
  createdAt: string;
  creatorUsername: string | null;
}

interface AllowedRole {
  id: string;
  roleId: string;
  roleName: string;
  roleColor: string;
  createdAt: string;
}

interface AdminProductItem {
  id: string;
  name: string;
  sku: string | null;
  imageUrl: string | null;
  category: string;
  sizes: string[];
  createdAt: string;
  creatorUsername: string | null;
}

interface UserUploadedImage {
  imageUrl: string;
  name: string;
  sku: string | null;
  category: string;
  ownerUsername: string;
  count: number;
}

interface AdminTabsProps {
  skus: SkuItem[];
  productsNoImage: ProductNoImage[];
  userUploadedImages: UserUploadedImage[];
  adviceItems: AdviceItem[];
  adminProducts: AdminProductItem[];
  adminSales: AdminSaleItem[];
  sentMessages: AdminSentMessage[];
  adminLogs: AdminLogItem[];
  webhookUrl: string | null;
  allowedRoles: AllowedRole[];
}

export function AdminTabs({ skus, productsNoImage, userUploadedImages, adviceItems, adminProducts, adminSales, sentMessages, adminLogs, webhookUrl, allowedRoles }: AdminTabsProps) {
  const totalMissing = skus.length + productsNoImage.length;

  return (
    <Tabs defaultValue="advice">
      <TabsList className="w-full overflow-x-auto overflow-y-hidden scrollbar-hide flex-nowrap justify-start lg:justify-center">
        <TabsTrigger value="advice" className="gap-1 px-2 text-xs flex-shrink-0">
          <Megaphone className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Conseils</span>
        </TabsTrigger>
        <TabsTrigger value="products" className="gap-1 px-2 text-xs flex-shrink-0">
          <Package className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Produits</span>
          {adminProducts.length > 0 && (
            <span className="rounded-full bg-primary/20 text-primary px-1.5 text-[10px] font-bold">
              {adminProducts.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="images" className="gap-1 px-2 text-xs flex-shrink-0">
          <ImageIcon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Images</span>
          {totalMissing > 0 && (
            <span className="rounded-full bg-warning/20 text-warning px-1.5 text-[10px] font-bold">
              {totalMissing}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="sales" className="gap-1 px-2 text-xs flex-shrink-0">
          <ShoppingCart className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Ventes</span>
          {adminSales.length > 0 && (
            <span className="rounded-full bg-primary/20 text-primary px-1.5 text-[10px] font-bold">
              {adminSales.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="messages" className="gap-1 px-2 text-xs flex-shrink-0">
          <Mail className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Messages</span>
          {sentMessages.length > 0 && (
            <span className="rounded-full bg-primary/20 text-primary px-1.5 text-[10px] font-bold">
              {sentMessages.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="logs" className="gap-1 px-2 text-xs flex-shrink-0">
          <ScrollText className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Logs</span>
        </TabsTrigger>
        <TabsTrigger value="config" className="gap-1 px-2 text-xs flex-shrink-0">
          <Settings className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Config</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="advice" className="space-y-6 mt-4">
        <div>
          <h2 className="text-base font-semibold mb-3">Nouveau conseil</h2>
          <AdviceForm />
        </div>

        <div>
          <h2 className="text-base font-semibold mb-3">
            Conseils publies ({adviceItems.length})
          </h2>
          <AdviceList items={adviceItems} />
        </div>
      </TabsContent>

      <TabsContent value="products" className="mt-4 space-y-4">
        <AdminProducts products={adminProducts} />
      </TabsContent>

      <TabsContent value="images" className="mt-4 space-y-6">
        {/* User-uploaded images available for global linking */}
        {userUploadedImages.length > 0 && (
          <div>
            <h2 className="text-base font-semibold mb-3">
              Images utilisateurs ({userUploadedImages.length})
            </h2>
            <p className="text-xs text-muted-foreground mb-2">
              Images uploadees par les membres. Cliquez pour les lier a tous les utilisateurs.
            </p>
            <UserUploadedImages images={userUploadedImages} />
          </div>
        )}

        {totalMissing === 0 && userUploadedImages.length === 0 ? (
          <div className="rounded-xl bg-secondary p-8 text-center">
            <p className="text-muted-foreground">
              Aucun produit en attente d&apos;image. Tout est a jour !
            </p>
          </div>
        ) : (
          <>
            {productsNoImage.length > 0 && (
              <div>
                <h2 className="text-base font-semibold mb-3">
                  Produits sans image ({productsNoImage.length})
                </h2>
                <MissingImageProducts products={productsNoImage} />
              </div>
            )}
            {skus.length > 0 && (
              <div>
                <h2 className="text-base font-semibold mb-3">
                  SKU non trouves ({skus.length})
                </h2>
                <MissingSkuList skus={skus} />
              </div>
            )}
          </>
        )}
      </TabsContent>

      <TabsContent value="sales" className="mt-4 space-y-4">
        <AdminSalesList sales={adminSales} />
      </TabsContent>

      <TabsContent value="messages" className="mt-4 space-y-4">
        <AdminSentMessages messages={sentMessages} />
      </TabsContent>

      <TabsContent value="logs" className="mt-4 space-y-4">
        <h2 className="text-base font-semibold mb-3">
          Journal d&apos;activite ({adminLogs.length})
        </h2>
        <AdminLogs logs={adminLogs} />
      </TabsContent>

      <TabsContent value="config" className="mt-4 space-y-6">
        <div>
          <h2 className="text-base font-semibold mb-3">Acces au dashboard</h2>
          <RoleManager allowedRoles={allowedRoles} />
        </div>
        <div>
          <h2 className="text-base font-semibold mb-3">Configuration</h2>
          <WebhookConfig currentUrl={webhookUrl} />
        </div>
      </TabsContent>
    </Tabs>
  );
}
