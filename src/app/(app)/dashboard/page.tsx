import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDashboardKPIs, getProfitChartData, getPendingDeals } from "@/lib/queries/dashboard";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ProfitChart } from "@/components/dashboard/profit-chart";
import { ChartExport } from "@/components/dashboard/chart-export";
import { PeriodSelector } from "@/components/dashboard/period-selector";
import { formatCurrency } from "@/lib/utils/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TimeBadge } from "@/components/product/time-badge";
import { CopyableSku } from "@/components/ui/copyable-sku";
import { PendingDealRow } from "@/components/dashboard/pending-deal-row";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

interface DashboardPageProps {
  searchParams: Promise<{ period?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const period = params.period ?? "30j";

  const [kpis, chartData, pendingDeals] = await Promise.all([
    getDashboardKPIs(session.user.id, period),
    getProfitChartData(session.user.id, period),
    getPendingDeals(session.user.id),
  ]);

  // Period label for display
  const periodLabel = period === "ytd"
    ? "YTD"
    : period.includes("_")
      ? (() => {
          const [from, to] = period.split("_");
          const d = Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1;
          return `${d}j`;
        })()
      : "30j";

  return (
    <div className="py-4 space-y-4 lg:py-6 lg:space-y-6">
      {/* Header with greeting, clock, weather + export */}
      <div className="flex items-center justify-between gap-3">
        <DashboardHeader userName={session.user.name ?? ""} />
        <ChartExport
          kpis={kpis}
          chartData={chartData}
          periodLabel={periodLabel}
          userName={session.user.name ?? undefined}
        />
      </div>

      {/* Period selector */}
      <Suspense fallback={<div className="h-8" />}>
        <PeriodSelector />
      </Suspense>

      {/* KPIs — 2 cols mobile, 5 cols desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 lg:gap-3">
        <KpiCard
          label={`CA (${periodLabel})`}
          value={formatCurrency(kpis.revenue)}
          sub={kpis.revenuePrev > 0 ? `Prec: ${formatCurrency(kpis.revenuePrev)}` : undefined}
        />
        <KpiCard
          label={`Profit net (${periodLabel})`}
          value={formatCurrency(kpis.profit)}
          trend={kpis.profit >= 0 ? "up" : "down"}
          sub={kpis.profitPrev !== 0 ? `Prec: ${formatCurrency(kpis.profitPrev)}` : undefined}
        />
        <KpiCard
          label="En stock"
          value={kpis.stock.count.toString()}
          sub={formatCurrency(kpis.stock.purchaseValue)}
        />
        <KpiCard
          label="Cash immobilise"
          value={formatCurrency(kpis.cashImmobilized)}
        />
        <KpiCard
          label="Rotation moy."
          value={`${kpis.rotation}j`}
          sub={`${kpis.salesCount} ventes`}
        />
      </div>

      {/* Profit chart */}
      <ProfitChart data={chartData} periodLabel={periodLabel} />

      {/* Desktop: 2-column grid for cards / Mobile: stack */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Pending deals */}
        {pendingDeals.length > 0 && (
          <Card className="p-4 lg:p-5 bg-card border-warning/30">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              Deals en attente
              <Badge variant="outline" className="bg-warning/20 text-warning border-0 text-[10px]">
                {pendingDeals.length}
              </Badge>
            </h3>
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
          </Card>
        )}

        {/* Top 5 */}
        {kpis.top5.length > 0 && (
          <Card className="p-4 lg:p-5 bg-card border-border">
            <h3 className="text-sm font-medium mb-3">Top 5 les plus rentables ({periodLabel})</h3>
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
          </Card>
        )}

        {/* Sleeping products */}
        {kpis.sleeping.length > 0 && (
          <Card className="p-4 lg:p-5 bg-card border-border border-warning/30">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              Produits dormants
              <Badge variant="outline" className="bg-warning/20 text-warning border-0 text-[10px]">
                60j+
              </Badge>
            </h3>
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
          </Card>
        )}
      </div>
    </div>
  );
}
