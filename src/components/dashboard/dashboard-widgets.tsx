"use client";

import { SortableWidgetList } from "@/components/dashboard/sortable-widget-list";
import { WidgetPicker } from "@/components/dashboard/widget-picker";
import { ProfitChart } from "@/components/dashboard/profit-chart";
import { ExpensesChart } from "@/components/dashboard/expenses-chart";
import { StatusBreakdownChart } from "@/components/dashboard/status-breakdown-chart";
import { PendingDealRow } from "@/components/dashboard/pending-deal-row";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyableSku } from "@/components/ui/copyable-sku";
import { TimeBadge } from "@/components/product/time-badge";
import { formatCurrency } from "@/lib/utils/format";
import { DASHBOARD_WIDGETS } from "@/lib/utils/widget-registry";
import { saveDashboardLayoutAction } from "@/lib/actions/preferences-actions";
import { type WidgetSize } from "@/lib/queries/user-preferences";
import { RotateCcw, Receipt, Wallet } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

interface DashboardWidgetsProps {
  activeWidgets: string[];
  widgetSizes: Record<string, WidgetSize>;
  periodLabel: string;
  // Data for each widget
  chartData: {
    day: number;
    label: string;
    current: number | null;
    previous: number | null;
    projection: number | null;
  }[];
  expensesChartData: {
    day: number;
    label: string;
    current: number | null;
    previous: number | null;
  }[];
  statusBreakdown: { status: string; label: string; count: number }[];
  pendingDeals: {
    saleId: string;
    salePrice: string;
    saleDate: string;
    buyerUsername: string | null;
    productName: string;
    productImage: string | null;
    sizeVariant: string | null;
  }[];
  kpis: {
    expenses: {
      total: number;
      recurring: { id: string; description: string; amount: number; category: string }[];
      fixed: { id: string; description: string; amount: number; category: string; date: string }[];
    };
    top5: { name: string; image: string | null; sku: string | null; size: string | null; profit: number }[];
    sleeping: {
      variantId: string;
      productId: string;
      productName: string;
      productImage: string | null;
      productSku: string | null;
      sizeVariant: string | null;
      purchasePrice: string;
      purchaseDate: string;
      status: string;
    }[];
  };
}

export function DashboardWidgets({
  activeWidgets,
  widgetSizes,
  periodLabel,
  chartData,
  expensesChartData,
  statusBreakdown,
  pendingDeals,
  kpis,
}: DashboardWidgetsProps) {
  const hasExpenses = kpis.expenses.total > 0;

  const renderWidget = (id: string): ReactNode => {
    switch (id) {
      case "profit-chart":
        return <ProfitChart data={chartData} periodLabel={periodLabel} />;

      case "expenses-chart":
        return <ExpensesChart data={expensesChartData} periodLabel={periodLabel} />;

      case "status-breakdown":
        return <StatusBreakdownChart data={statusBreakdown} />;

      case "pending-deals":
        return (
          <Card className="p-4 lg:p-5 bg-card border-warning/30 h-full">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              Deals en attente
              {pendingDeals.length > 0 && (
                <Badge variant="outline" className="bg-warning/20 text-warning border-0 text-[10px]">
                  {pendingDeals.length}
                </Badge>
              )}
            </h3>
            {pendingDeals.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucun deal en attente</p>
            ) : (
              <div className="space-y-3">
                {pendingDeals.map((deal) => (
                  <PendingDealRow
                    key={deal.saleId}
                    deal={{
                      saleId: deal.saleId,
                      salePrice: deal.salePrice,
                      saleDate: deal.saleDate,
                      buyerUsername: deal.buyerUsername,
                      productName: deal.productName,
                      productImage: deal.productImage,
                      sizeVariant: deal.sizeVariant,
                    }}
                  />
                ))}
              </div>
            )}
          </Card>
        );

      case "expenses-summary":
        return (
          <Card className="p-4 lg:p-5 bg-card border-border h-full">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                Depenses ({periodLabel})
              </h3>
              <Link href="/settings" className="text-[10px] text-primary hover:underline">
                Gerer
              </Link>
            </div>
            {!hasExpenses && kpis.expenses.recurring.length === 0 && kpis.expenses.fixed.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucune depense enregistree. <Link href="/settings" className="text-primary hover:underline">Ajouter</Link></p>
            ) : (
              <div className="space-y-2">
                {kpis.expenses.recurring.map((exp) => (
                  <div key={exp.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <RotateCcw className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs truncate">{exp.description}</span>
                    </div>
                    <span className="text-xs text-warning font-medium flex-shrink-0">
                      -{formatCurrency(exp.amount)}/m
                    </span>
                  </div>
                ))}
                {kpis.expenses.fixed.map((exp) => (
                  <div key={exp.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Receipt className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs truncate">{exp.description}</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-medium flex-shrink-0">
                      -{formatCurrency(exp.amount)}
                    </span>
                  </div>
                ))}
                {(hasExpenses) && (
                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Total depenses</span>
                    <span className="text-sm font-bold text-warning">
                      -{formatCurrency(kpis.expenses.total)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </Card>
        );

      case "top5":
        return (
          <Card className="p-4 lg:p-5 bg-card border-border h-full">
            <h3 className="text-sm font-medium mb-3">Top 5 les plus rentables ({periodLabel})</h3>
            {kpis.top5.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucune vente sur cette periode</p>
            ) : (
              <div className="space-y-2">
                {kpis.top5.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-xs text-muted-foreground w-4 flex-shrink-0 mt-0.5">
                      {i + 1}.
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs leading-tight line-clamp-2 flex-1 min-w-0">
                          {item.name}
                          {item.size && (
                            <span className="text-muted-foreground font-medium"> &mdash; {item.size}</span>
                          )}
                        </span>
                        <span className={`text-xs font-bold flex-shrink-0 ${item.profit >= 0 ? "text-success" : "text-danger"}`}>
                          {item.profit >= 0 ? "+" : ""}{formatCurrency(item.profit)}
                        </span>
                      </div>
                      {item.sku && (
                        <CopyableSku sku={item.sku} className="text-[10px]" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );

      case "sleeping":
        return (
          <Card className="p-4 lg:p-5 bg-card border-border border-warning/30 h-full">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              Produits dormants
              <Badge variant="outline" className="bg-warning/20 text-warning border-0 text-[10px]">
                60j+
              </Badge>
            </h3>
            {kpis.sleeping.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucun produit en stock depuis plus de 60 jours</p>
            ) : (
              <div className="space-y-2">
                {kpis.sleeping.map((item) => (
                  <div key={item.variantId} className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-sm truncate block">
                        {item.productName}
                        {item.sizeVariant && (
                          <span className="text-muted-foreground"> &mdash; {item.sizeVariant}</span>
                        )}
                      </span>
                      {item.productSku && (
                        <CopyableSku sku={item.productSku} className="text-[10px]" />
                      )}
                    </div>
                    <TimeBadge purchaseDate={item.purchaseDate} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Widget picker button */}
      <div className="flex justify-end">
        <WidgetPicker
          availableWidgets={DASHBOARD_WIDGETS}
          activeWidgets={activeWidgets}
          widgetSizes={widgetSizes}
          onSave={saveDashboardLayoutAction}
        />
      </div>

      {/* Sortable widgets */}
      <SortableWidgetList
        widgetIds={activeWidgets}
        widgetSizes={widgetSizes}
        renderWidget={renderWidget}
        onReorder={saveDashboardLayoutAction}
      />
    </div>
  );
}
