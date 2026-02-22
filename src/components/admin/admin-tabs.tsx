"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MissingSkuList } from "./missing-sku-list";
import { AdviceForm } from "./advice-form";
import { AdviceList } from "./advice-list";
import { ImageIcon, Megaphone } from "lucide-react";

interface SkuItem {
  id: string;
  sku: string;
  stockxProductId: string | null;
  createdAt: string;
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

interface AdminTabsProps {
  skus: SkuItem[];
  adviceItems: AdviceItem[];
}

export function AdminTabs({ skus, adviceItems }: AdminTabsProps) {
  return (
    <Tabs defaultValue="advice">
      <TabsList className="w-full">
        <TabsTrigger value="advice" className="gap-1.5">
          <Megaphone className="h-3.5 w-3.5" />
          Conseils
        </TabsTrigger>
        <TabsTrigger value="images" className="gap-1.5">
          <ImageIcon className="h-3.5 w-3.5" />
          Images SKU
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

      <TabsContent value="images" className="mt-4">
        {skus.length === 0 ? (
          <div className="rounded-xl bg-secondary p-8 text-center">
            <p className="text-muted-foreground">
              Aucun SKU en attente d&apos;image. Tout est a jour !
            </p>
          </div>
        ) : (
          <MissingSkuList skus={skus} />
        )}
      </TabsContent>
    </Tabs>
  );
}
