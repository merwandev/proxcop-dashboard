"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MissingSkuList } from "./missing-sku-list";
import { MissingImageProducts } from "./missing-image-products";
import { AdviceForm } from "./advice-form";
import { AdviceList } from "./advice-list";
import { WebhookConfig } from "./webhook-config";
import { RoleManager } from "./role-manager";
import { ImageIcon, Megaphone, Settings } from "lucide-react";

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

interface AdminTabsProps {
  skus: SkuItem[];
  productsNoImage: ProductNoImage[];
  adviceItems: AdviceItem[];
  webhookUrl: string | null;
  allowedRoles: AllowedRole[];
}

export function AdminTabs({ skus, productsNoImage, adviceItems, webhookUrl, allowedRoles }: AdminTabsProps) {
  const totalMissing = skus.length + productsNoImage.length;

  return (
    <Tabs defaultValue="advice">
      <TabsList className="w-full">
        <TabsTrigger value="advice" className="gap-1.5">
          <Megaphone className="h-3.5 w-3.5" />
          Conseils
        </TabsTrigger>
        <TabsTrigger value="images" className="gap-1.5">
          <ImageIcon className="h-3.5 w-3.5" />
          Images
          {totalMissing > 0 && (
            <span className="ml-1 rounded-full bg-warning/20 text-warning px-1.5 text-[10px] font-bold">
              {totalMissing}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="config" className="gap-1.5">
          <Settings className="h-3.5 w-3.5" />
          Config
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

      <TabsContent value="images" className="mt-4 space-y-6">
        {totalMissing === 0 ? (
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
