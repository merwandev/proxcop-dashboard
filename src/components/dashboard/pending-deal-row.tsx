"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { markDealAsPaid } from "@/lib/actions/sale-actions";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { Loader2, Check } from "lucide-react";
import { toast } from "sonner";

interface PendingDeal {
  saleId: string;
  salePrice: string;
  saleDate: string;
  buyerUsername: string | null;
  productName: string;
  productImage: string | null;
  sizeVariant: string | null;
}

export function PendingDealRow({ deal }: { deal: PendingDeal }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleMarkPaid = async () => {
    setLoading(true);
    try {
      await markDealAsPaid(deal.saleId);
      toast.success("Paiement recu !");
      router.refresh();
    } catch {
      toast.error("Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1.5">
          <span className="text-sm truncate block">
            {deal.productName}
            {deal.sizeVariant && (
              <span className="text-muted-foreground"> — {deal.sizeVariant}</span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <span className="font-medium text-foreground">
            {formatCurrency(Number(deal.salePrice))}
          </span>
          {deal.buyerUsername && (
            <span className="text-[#5865F2]">@{deal.buyerUsername}</span>
          )}
          <span>{formatDate(deal.saleDate)}</span>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-7 gap-1 text-xs border-success/40 text-success hover:bg-success/10 flex-shrink-0"
        onClick={handleMarkPaid}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Check className="h-3 w-3" />
        )}
        Recu
      </Button>
    </div>
  );
}
