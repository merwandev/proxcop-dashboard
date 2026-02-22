import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getStatsData } from "@/lib/queries/stats";
import { getStatsLayout } from "@/lib/queries/user-preferences";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { formatPercent } from "@/lib/utils/format";
import { StatsWidgets } from "@/components/stats/stats-widgets";

export default async function StatsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [stats, statsLayout] = await Promise.all([
    getStatsData(session.user.id),
    getStatsLayout(session.user.id),
  ]);

  const hasData =
    stats.roiByCategory.length > 0 ||
    stats.roiByPlatform.length > 0 ||
    stats.stockByCategory.length > 0 ||
    stats.stockEvolution.length > 0;

  return (
    <div className="py-4 space-y-4 lg:py-6 lg:space-y-6">
      <h1 className="text-xl font-bold lg:text-2xl">Analytics</h1>

      {/* KPI summary */}
      <div className="grid grid-cols-2 gap-2">
        <KpiCard
          label="Marge moyenne"
          value={formatPercent(stats.avgMargin)}
          trend={stats.avgMargin >= 0 ? "up" : "down"}
        />
        <KpiCard
          label="Win rate"
          value={`${stats.winRate.toFixed(0)}%`}
          sub="Vendu au prix cible ou +"
        />
      </div>

      {!hasData ? (
        <Card className="p-8 bg-card border-border text-center">
          <p className="text-sm text-muted-foreground">
            Pas encore assez de donnees de vente pour afficher les analytics.
          </p>
        </Card>
      ) : (
        <StatsWidgets
          activeWidgets={statsLayout.widgets}
          widgetSizes={statsLayout.sizes}
          roiByCategory={stats.roiByCategory}
          roiByPlatform={stats.roiByPlatform}
          stockByCategory={stats.stockByCategory}
          stockEvolution={stats.stockEvolution}
          marginDistribution={stats.marginDistribution}
        />
      )}
    </div>
  );
}
