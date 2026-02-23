"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyableSku } from "@/components/ui/copyable-sku";
import { formatCurrency } from "@/lib/utils/format";
import { CASHBACK_STATUSES, CASHBACK_APPS } from "@/lib/utils/constants";
import { Coins, Package, Filter, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { AddCashbackDialog } from "./add-cashback-dialog";

interface CashbackItem {
  id: string;
  amount: string;
  source: string;
  status: string;
  requestedAt: string;
  receivedAt: string | null;
  createdAt: string;
  variantId: string;
  productName: string;
  productImage: string | null;
  productSku: string | null;
  sizeVariant: string | null;
}

interface CashbackSummary {
  totalReceived: number;
  totalPending: number;
  countTotal: number;
  countToRequest: number;
  countRequested: number;
  countApproved: number;
  countReceived: number;
}

interface VariantOption {
  variantId: string;
  productName: string;
  productImage: string | null;
  productSku: string | null;
  sizeVariant: string | null;
  purchasePrice: string;
}

interface CashbackPageClientProps {
  cashbacks: CashbackItem[];
  summary: CashbackSummary;
  availableVariants: VariantOption[];
}

function getStatusInfo(status: string) {
  return CASHBACK_STATUSES.find((s) => s.value === status) ?? { value: status, label: status, color: "bg-muted-foreground" };
}

function getAppLabel(source: string) {
  return CASHBACK_APPS.find((a) => a.value === source)?.label ?? source;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

type StatusFilter = "all" | "to_request" | "requested" | "approved" | "received";

export function CashbackPageClient({ cashbacks, summary, availableVariants }: CashbackPageClientProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);

  const filtered = statusFilter === "all"
    ? cashbacks
    : cashbacks.filter((c) => c.status === statusFilter);

  return (
    <div className="space-y-4">
      {/* KPI cards + Add button */}
      <div className="flex items-start gap-2">
        <div className="grid grid-cols-2 gap-2 flex-1">
          <Card className="p-2.5 bg-card gap-0">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Total recu</p>
            <p className="text-sm font-bold text-success mt-0.5">{formatCurrency(summary.totalReceived)}</p>
            <p className="text-[9px] text-muted-foreground">{summary.countReceived} cashback{summary.countReceived > 1 ? "s" : ""}</p>
          </Card>
          <Card className="p-2.5 bg-card gap-0">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">En attente</p>
            <p className="text-sm font-bold text-warning mt-0.5">{formatCurrency(summary.totalPending)}</p>
            <p className="text-[9px] text-muted-foreground">{summary.countTotal - summary.countReceived} en cours</p>
          </Card>
        </div>
        <Button
          size="sm"
          className="h-full min-h-[60px] px-3 gap-1"
          onClick={() => setShowAddDialog(true)}
        >
          <Plus className="h-4 w-4" />
          <span className="text-xs">Ajouter</span>
        </Button>
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        {(["all", "to_request", "requested", "approved", "received"] as const).map((filter) => {
          const isActive = statusFilter === filter;
          const count = filter === "all" ? cashbacks.length : cashbacks.filter((c) => c.status === filter).length;
          const label = filter === "all" ? "Tous" : getStatusInfo(filter).label;
          return (
            <Button
              key={filter}
              variant="ghost"
              size="sm"
              onClick={() => setStatusFilter(filter)}
              className={cn(
                "flex-shrink-0 text-xs h-7 px-2.5 gap-1",
                isActive ? "bg-primary/20 text-primary" : "text-muted-foreground"
              )}
            >
              {label}
              {count > 0 && (
                <span className={cn(
                  "rounded-full px-1 text-[9px] font-bold",
                  isActive ? "bg-primary/30" : "bg-secondary"
                )}>
                  {count}
                </span>
              )}
            </Button>
          );
        })}
      </div>

      {/* Cashback list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl bg-secondary p-10 text-center">
          <Coins className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">
            {statusFilter === "all" ? "Aucun cashback enregistre" : "Aucun cashback avec ce statut"}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Ajoutez des cashbacks depuis la fiche produit
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((cb) => {
            const statusInfo = getStatusInfo(cb.status);
            return (
              <Card key={cb.id} className="p-3 lg:p-4 bg-card">
                <div className="flex items-start gap-3">
                  {/* Product image */}
                  <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-white flex-shrink-0">
                    {cb.productImage ? (
                      <Image
                        src={cb.productImage}
                        alt={cb.productName}
                        fill
                        className="object-contain p-0.5"
                        sizes="48px"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-tight line-clamp-1">
                          {cb.productName}
                          {cb.sizeVariant && (
                            <span className="text-muted-foreground font-normal"> — {cb.sizeVariant}</span>
                          )}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {cb.productSku && (
                            <CopyableSku sku={cb.productSku} className="text-[10px]" />
                          )}
                          <span className="text-[10px] text-muted-foreground">{getAppLabel(cb.source)}</span>
                        </div>
                      </div>
                      <span className={cn(
                        "text-sm font-bold flex-shrink-0",
                        cb.status === "received" ? "text-success" : "text-warning"
                      )}>
                        {formatCurrency(Number(cb.amount))}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] h-4 px-1.5 border-0",
                          statusInfo.color.replace("bg-", "bg-") + "/20",
                          statusInfo.color === "bg-success" && "text-success bg-success/20",
                          statusInfo.color === "bg-blue-500" && "text-blue-500 bg-blue-500/20",
                          statusInfo.color === "bg-orange-400" && "text-orange-400 bg-orange-400/20",
                          statusInfo.color === "bg-muted-foreground" && "text-muted-foreground bg-muted-foreground/20",
                        )}
                      >
                        {statusInfo.label}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {cb.receivedAt ? `Recu le ${formatDate(cb.receivedAt)}` : formatDate(cb.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <AddCashbackDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        variants={availableVariants}
        onCreated={() => router.refresh()}
      />
    </div>
  );
}
