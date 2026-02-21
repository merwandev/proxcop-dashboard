import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "./status-badge";
import { TimeBadge } from "./time-badge";
import { formatCurrency } from "@/lib/utils/format";
import { Package } from "lucide-react";

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    category: string;
    sizeVariant: string | null;
    imageUrl: string | null;
    purchasePrice: string;
    targetPrice: string | null;
    platform: string | null;
    status: string;
    purchaseDate: string;
  };
}

export function ProductCard({ product }: ProductCardProps) {
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
            <TimeBadge purchaseDate={product.purchaseDate} />
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <StatusBadge status={product.status} />
            {product.sizeVariant && (
              <span className="text-[10px] text-muted-foreground">
                {product.sizeVariant}
              </span>
            )}
            {product.platform && (
              <span className="text-[10px] text-muted-foreground capitalize">
                {product.platform}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs text-muted-foreground">
              Achat: {formatCurrency(Number(product.purchasePrice))}
            </span>
            {product.targetPrice && (
              <span className="text-xs text-primary">
                Cible: {formatCurrency(Number(product.targetPrice))}
              </span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
