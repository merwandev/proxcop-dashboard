"use client";

import Image from "next/image";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/format";
import { Package, TrendingUp, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopROIItem {
  productName: string;
  sku: string | null;
  imageUrl: string | null;
  avgRoi: number;
  saleCount: number;
}

interface TopVolumeItem {
  productName: string;
  sku: string | null;
  imageUrl: string | null;
  saleCount: number;
  avgPrice: number;
}

interface TopPerformersProps {
  topROI: TopROIItem[];
  topVolume: TopVolumeItem[];
  daysBack: number;
}

export function TopPerformers({ topROI, topVolume, daysBack }: TopPerformersProps) {
  if (topROI.length === 0 && topVolume.length === 0) return null;

  return (
    <div>
      <h2 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">
        Top {daysBack} jours
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {topROI.length > 0 && (
          <Card className="p-3 gap-0 bg-card border-border">
            <div className="flex items-center gap-1.5 mb-1.5">
              <TrendingUp className="h-3 w-3 text-success" />
              <h4 className="text-[11px] font-semibold text-muted-foreground">Meilleur ROI</h4>
            </div>
            <div className="space-y-1.5">
              {topROI.map((item, i) => (
                <div key={item.sku ?? i} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-3 text-right flex-shrink-0">
                    {i + 1}.
                  </span>
                  <div className="relative h-7 w-7 rounded overflow-hidden bg-white flex-shrink-0">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.productName}
                        fill
                        className="object-contain p-0.5"
                        sizes="28px"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Package className="h-3 w-3 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium leading-tight truncate">{item.productName}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className={cn(
                      "text-xs font-bold",
                      item.avgRoi >= 0 ? "text-success" : "text-danger"
                    )}>
                      {item.avgRoi >= 0 ? "+" : ""}{item.avgRoi}%
                    </span>
                    <p className="text-[9px] text-muted-foreground">{item.saleCount} ventes</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {topVolume.length > 0 && (
          <Card className="p-3 gap-0 bg-card border-border">
            <div className="flex items-center gap-1.5 mb-1.5">
              <BarChart3 className="h-3 w-3 text-primary" />
              <h4 className="text-[11px] font-semibold text-muted-foreground">Plus vendus</h4>
            </div>
            <div className="space-y-1.5">
              {topVolume.map((item, i) => (
                <div key={item.sku ?? i} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-3 text-right flex-shrink-0">
                    {i + 1}.
                  </span>
                  <div className="relative h-7 w-7 rounded overflow-hidden bg-white flex-shrink-0">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.productName}
                        fill
                        className="object-contain p-0.5"
                        sizes="28px"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Package className="h-3 w-3 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium leading-tight truncate">{item.productName}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-bold">{item.saleCount}</span>
                    <p className="text-[9px] text-muted-foreground">{formatCurrency(item.avgPrice)} moy.</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
