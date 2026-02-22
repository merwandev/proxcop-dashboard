"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CommunityFeed } from "./community-feed";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { Users, User } from "lucide-react";

interface UserSale {
  sale: {
    id: string;
    salePrice: string;
    saleDate: string;
    platform: string | null;
    platformFee: string | null;
    shippingCost: string | null;
    otherFees: string | null;
  };
  variant: {
    sizeVariant: string | null;
    purchasePrice: string;
  };
  product: {
    name: string;
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
  userSales: UserSale[];
  communitySales: CommunitySale[];
  totalRevenue: number;
  totalProfit: number;
}

export function VentesTabs({ userSales, communitySales, totalRevenue, totalProfit }: VentesTabsProps) {
  return (
    <Tabs defaultValue="me">
      <TabsList className="w-full">
        <TabsTrigger value="me" className="gap-1.5">
          <User className="h-3.5 w-3.5" />
          Mes ventes
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
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-2">
          <Card className="p-3 bg-card border-border">
            <p className="text-[10px] text-muted-foreground uppercase">Total ventes</p>
            <p className="text-lg font-bold">{formatCurrency(totalRevenue)}</p>
          </Card>
          <Card className="p-3 bg-card border-border">
            <p className="text-[10px] text-muted-foreground uppercase">Profit total</p>
            <p className="text-lg font-bold text-success">{formatCurrency(totalProfit)}</p>
          </Card>
        </div>

        {/* User's sales list */}
        <div className="space-y-2">
          {userSales.length === 0 ? (
            <p className="text-center py-12 text-sm text-muted-foreground">
              Aucune vente enregistree
            </p>
          ) : (
            userSales.map(({ sale, variant, product }) => {
              const profit =
                Number(sale.salePrice) -
                Number(variant.purchasePrice) -
                Number(sale.platformFee ?? 0) -
                Number(sale.shippingCost ?? 0) -
                Number(sale.otherFees ?? 0);
              const margin =
                Number(sale.salePrice) > 0
                  ? (profit / Number(sale.salePrice)) * 100
                  : 0;

              return (
                <Card key={sale.id} className="p-3 bg-card border-border">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-sm truncate">
                        {product.name}
                        {variant.sizeVariant && (
                          <span className="text-muted-foreground font-normal"> &mdash; {variant.sizeVariant}</span>
                        )}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(sale.saleDate)}
                        </span>
                        {sale.platform && (
                          <Badge variant="outline" className="text-[10px] border-border capitalize">
                            {sale.platform}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span>Achat: {formatCurrency(Number(variant.purchasePrice))}</span>
                        <span>Vente: {formatCurrency(Number(sale.salePrice))}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className={`text-sm font-bold ${profit >= 0 ? "text-success" : "text-danger"}`}>
                        {profit >= 0 ? "+" : ""}{formatCurrency(profit)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {margin.toFixed(1)}% marge
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
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
