import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils/format";

interface CashbackSummary {
  totalReceived: number;
  totalPending: number;
  countTotal: number;
  countToRequest: number;
  countRequested: number;
  countApproved: number;
  countReceived: number;
}

interface CashbackPreviewWidgetProps {
  summary: CashbackSummary;
}

export function CashbackPreviewWidget({ summary }: CashbackPreviewWidgetProps) {
  const hasData = summary.countTotal > 0;

  return (
    <Card className="p-4 lg:p-5 bg-card border-border h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Coins className="h-3.5 w-3.5 text-muted-foreground" />
          Cashback
          {summary.countTotal > 0 && (
            <Badge variant="outline" className="bg-success/20 text-success border-0 text-[10px]">
              {summary.countTotal}
            </Badge>
          )}
        </h3>
        <Link href="/cashback" className="text-[10px] text-primary hover:underline">
          Voir tout
        </Link>
      </div>

      {!hasData ? (
        <p className="text-xs text-muted-foreground">Aucun cashback enregistre</p>
      ) : (
        <div className="space-y-3">
          {/* Amount summary */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-success/10 p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground">Recu</p>
              <p className="text-sm font-bold text-success">{formatCurrency(summary.totalReceived)}</p>
            </div>
            <div className="rounded-lg bg-warning/10 p-2.5 text-center">
              <p className="text-[10px] text-muted-foreground">En attente</p>
              <p className="text-sm font-bold text-warning">{formatCurrency(summary.totalPending)}</p>
            </div>
          </div>

          {/* Status breakdown */}
          <div className="space-y-1.5">
            {summary.countToRequest > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">A demander</span>
                </div>
                <span className="text-[11px] font-medium">{summary.countToRequest}</span>
              </div>
            )}
            {summary.countRequested > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-orange-400" />
                  <span className="text-[11px] text-muted-foreground">Demande</span>
                </div>
                <span className="text-[11px] font-medium">{summary.countRequested}</span>
              </div>
            )}
            {summary.countApproved > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="text-[11px] text-muted-foreground">Approuve</span>
                </div>
                <span className="text-[11px] font-medium">{summary.countApproved}</span>
              </div>
            )}
            {summary.countReceived > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-success" />
                  <span className="text-[11px] text-muted-foreground">Recu</span>
                </div>
                <span className="text-[11px] font-medium">{summary.countReceived}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
