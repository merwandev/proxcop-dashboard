"use client";

import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Package, Flame } from "lucide-react";

interface TrendingItem {
  name: string;
  sku: string | null;
  imageUrl: string | null;
  addCount: number;
}

interface TrendingSectionProps {
  trending: TrendingItem[];
  daysBack: number;
}

export function TrendingSection({ trending, daysBack }: TrendingSectionProps) {
  if (trending.length === 0) return null;

  return (
    <div>
      <h2 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">
        Tendances — {daysBack} jours
      </h2>
      <Card className="p-3 bg-card border-border">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Flame className="h-3 w-3 text-warning" />
          <h4 className="text-[11px] font-semibold text-muted-foreground">Plus ajoutés au stock</h4>
        </div>
        <div className="space-y-1.5">
          {trending.map((item, i) => (
            <div key={item.sku ?? i} className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-3 text-right flex-shrink-0">
                {i + 1}.
              </span>
              <div className="relative h-7 w-7 rounded overflow-hidden bg-white flex-shrink-0">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
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
                <p className="text-[11px] font-medium leading-tight truncate">{item.name}</p>
                {item.sku && (
                  <p className="text-[9px] text-muted-foreground font-mono">{item.sku}</p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-xs font-bold">{item.addCount}</span>
                <p className="text-[9px] text-muted-foreground">ajouts</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
