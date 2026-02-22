"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CommunityFeed } from "./community-feed";
import { VentesClient } from "./ventes-client";
import { Users, User } from "lucide-react";

interface SaleItem {
  sale: {
    id: string;
    salePrice: string;
    saleDate: string;
    platform: string | null;
    platformFee: string | null;
    shippingCost: string | null;
    otherFees: string | null;
    buyerUsername: string | null;
    paymentStatus: string | null;
  };
  variant: {
    purchasePrice: string;
    sizeVariant: string | null;
  };
  product: {
    name: string;
    imageUrl: string | null;
    sku: string | null;
  };
}

interface CommunitySale {
  saleId: string;
  productName: string;
  sku: string | null;
  imageUrl: string | null;
  sizeVariant: string | null;
  salePrice: string;
  platform: string | null;
  saleDate: string;
  category: string;
}

interface VentesTabsProps {
  userSales: SaleItem[];
  communitySales: CommunitySale[];
  userName?: string;
}

export function VentesTabs({ userSales, communitySales, userName }: VentesTabsProps) {
  return (
    <Tabs defaultValue="me">
      <TabsList className="w-full">
        <TabsTrigger value="me" className="gap-1.5">
          <User className="h-3.5 w-3.5" />
          Mes ventes
          {userSales.length > 0 && (
            <span className="ml-1 rounded-full bg-primary/20 text-primary px-1.5 text-[10px] font-bold">
              {userSales.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="community" className="gap-1.5">
          <Users className="h-3.5 w-3.5" />
          Communaute
          {communitySales.length > 0 && (
            <span className="ml-1 rounded-full bg-primary/20 text-primary px-1.5 text-[10px] font-bold">
              {communitySales.length}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="me" className="mt-4 space-y-4">
        <VentesClient salesData={userSales} userName={userName} />
      </TabsContent>

      <TabsContent value="community" className="mt-4 space-y-3">
        <p className="text-xs text-muted-foreground">
          Ventes recentes de la communaute (anonymes)
        </p>
        <CommunityFeed sales={communitySales} />
      </TabsContent>
    </Tabs>
  );
}
