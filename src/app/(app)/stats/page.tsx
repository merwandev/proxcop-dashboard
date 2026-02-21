import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getStatsData } from "@/lib/queries/stats";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import { StatsCharts } from "@/components/stats/stats-charts";

export default async function StatsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const stats = await getStatsData(session.user.id);

  const hasData =
    stats.roiByCategory.length > 0 || stats.roiByPlatform.length > 0;

  return (
    <div className="py-4 space-y-4">
      <h1 className="text-xl font-bold">Analytics</h1>

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
        <>
          {/* ROI by category */}
          <Card className="p-4 bg-card border-border">
            <h3 className="text-sm font-medium mb-3">ROI par categorie</h3>
            <div className="space-y-2">
              {stats.roiByCategory.map((cat) => (
                <div key={cat.category} className="flex items-center justify-between">
                  <div>
                    <span className="text-sm capitalize">{cat.category}</span>
                    <span className="text-[10px] text-muted-foreground ml-1.5">
                      ({cat.count} ventes)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-medium ${cat.profit >= 0 ? "text-success" : "text-danger"}`}>
                      {formatCurrency(cat.profit)}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-1.5">
                      ROI {formatPercent(cat.roi)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* ROI by platform */}
          <Card className="p-4 bg-card border-border">
            <h3 className="text-sm font-medium mb-3">ROI par plateforme</h3>
            <div className="space-y-2">
              {stats.roiByPlatform.map((plat) => (
                <div key={plat.platform} className="flex items-center justify-between">
                  <div>
                    <span className="text-sm capitalize">{plat.platform}</span>
                    <span className="text-[10px] text-muted-foreground ml-1.5">
                      ({plat.count} ventes)
                    </span>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-medium ${plat.profit >= 0 ? "text-success" : "text-danger"}`}>
                      {formatCurrency(plat.profit)}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-1.5">
                      ROI {formatPercent(plat.roi)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Charts (client component) */}
          <StatsCharts
            roiByCategory={stats.roiByCategory}
            marginDistribution={stats.marginDistribution}
          />
        </>
      )}
    </div>
  );
}
