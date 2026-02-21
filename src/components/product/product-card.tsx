import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { TimeBadge } from "./time-badge";
import { formatCurrency } from "@/lib/utils/format";
import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CATEGORIES } from "@/lib/utils/constants";

interface ProductGroupCardProps {
  product: {
    id: string;
    name: string;
    sku: string | null;
    category: string;
    imageUrl: string | null;
    inStockCount: number;
    totalCount: number;
    totalValue: number;
    oldestPurchaseDate: string | null;
  };
}

export function ProductGroupCard({ product }: ProductGroupCardProps) {
  const categoryLabel = CATEGORIES.find((c) => c.value === product.category)?.label ?? product.category;
  const soldCount = product.totalCount - product.inStockCount;

  return (
    <Link href={`/stock/${product.id}`}>
      <Card className="flex gap-3 p-3 hover:border-border-hover transition-colors bg-card border-border">
        {/* Image */}
        <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
          {product.imageUrl ? (
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              sizes="64px"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Package className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-sm truncate">{product.name}</h3>
            {product.oldestPurchaseDate && (
              <TimeBadge purchaseDate={product.oldestPurchaseDate} />
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
              {categoryLabel}
            </Badge>
            {product.sku && (
              <span className="text-[10px] text-muted-foreground font-mono">
                {product.sku}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xs text-muted-foreground">
              {product.inStockCount} en stock
              {soldCount > 0 && (
                <span className="text-[10px]"> ({soldCount} vendu{soldCount > 1 ? "s" : ""})</span>
              )}
            </span>
            <span className="text-xs font-medium">
              {formatCurrency(Number(product.totalValue))}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
