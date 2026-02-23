import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { TimeBadge } from "./time-badge";
import { formatCurrency } from "@/lib/utils/format";
import { Package, AlertTriangle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CopyableSku } from "@/components/ui/copyable-sku";
import { CATEGORIES } from "@/lib/utils/constants";

function getReturnDeadlineStatus(deadline: string | null) {
  if (!deadline) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { label: `Retour dépassé (${Math.abs(daysLeft)}j)`, daysLeft, color: "muted-foreground" as const };
  if (daysLeft <= 3) return { label: `Retour dans ${daysLeft}j`, daysLeft, color: "danger" as const };
  if (daysLeft <= 7) return { label: `Retour dans ${daysLeft}j`, daysLeft, color: "warning" as const };
  return { label: `Retour dans ${daysLeft}j`, daysLeft, color: "success" as const };
}

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
    nearestReturnDeadline: string | null;
  };
  hasAdvice?: boolean;
  disableLink?: boolean;
  onClick?: () => void;
}

export function ProductGroupCard({ product, hasAdvice, disableLink, onClick }: ProductGroupCardProps) {
  const categoryLabel = CATEGORIES.find((c) => c.value === product.category)?.label ?? product.category;
  const soldCount = product.totalCount - product.inStockCount;
  const returnStatus = getReturnDeadlineStatus(product.nearestReturnDeadline);

  const cardContent = (
    <Card className="flex flex-row gap-3 p-3 hover:border-border-hover transition-colors bg-card border-border flex-1">
      {/* Image */}
      <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-white flex-shrink-0">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-contain p-1"
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
          <h3 className="font-medium text-[13px] leading-tight line-clamp-2 flex-1 min-w-0 flex items-start gap-1">
            {product.name}
            {hasAdvice && (
              <Info className="h-3.5 w-3.5 text-blue-400 flex-shrink-0 mt-0.5" />
            )}
          </h3>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {returnStatus && (
              <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${
                returnStatus.color === "danger"
                  ? "text-danger"
                  : returnStatus.color === "warning"
                    ? "text-warning"
                    : returnStatus.color === "success"
                      ? "text-success"
                      : "text-muted-foreground"
              }`}>
                <AlertTriangle className="h-3 w-3" />
                {returnStatus.label}
              </span>
            )}
            {product.oldestPurchaseDate && (
              <TimeBadge purchaseDate={product.oldestPurchaseDate} />
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
            {categoryLabel}
          </Badge>
          <CopyableSku sku={product.sku} fallback={product.name} className="text-[10px]" />
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
  );

  if (disableLink) {
    return (
      <div onClick={onClick} className="cursor-pointer flex flex-1">
        {cardContent}
      </div>
    );
  }

  return (
    <Link href={`/stock/${product.id}`} className="flex flex-1">
      {cardContent}
    </Link>
  );
}
