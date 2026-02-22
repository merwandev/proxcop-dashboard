"use client";

import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { CheckCircle2, Package } from "lucide-react";

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

interface CommunityFeedProps {
  sales: CommunitySale[];
}

export function CommunityFeed({ sales }: CommunityFeedProps) {
  if (sales.length === 0) {
    return (
      <p className="text-center py-12 text-sm text-muted-foreground">
        Aucune vente communautaire pour le moment
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {sales.map((sale) => (
        <Card key={sale.saleId} className="p-3 bg-card border-border">
          <div className="flex items-start gap-3">
            {/* Product image */}
            <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
              {sale.imageUrl ? (
                <Image
                  src={sale.imageUrl}
                  alt={sale.productName}
                  fill
                  className="object-contain p-0.5"
                  sizes="40px"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Package className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-medium text-sm truncate">
                  {sale.productName}
                  {sale.sizeVariant && (
                    <span className="text-muted-foreground font-normal">
                      {" "}&mdash; {sale.sizeVariant}
                    </span>
                  )}
                </h3>
                <CheckCircle2 className="h-3 w-3 text-success flex-shrink-0" />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  {formatDate(sale.saleDate)}
                </span>
                {sale.platform && (
                  <Badge
                    variant="outline"
                    className="text-[10px] border-border capitalize"
                  >
                    {sale.platform}
                  </Badge>
                )}
                {sale.sku && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {sale.sku}
                  </span>
                )}
              </div>
            </div>

            {/* Price */}
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold">
                {formatCurrency(Number(sale.salePrice))}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
