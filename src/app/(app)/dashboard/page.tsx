import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDashboardKPIs, getProfitChartData } from "@/lib/queries/dashboard";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ProfitChart } from "@/components/dashboard/profit-chart";
import { ChartExport } from "@/components/dashboard/chart-export";
import { formatCurrency } from "@/lib/utils/format";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TimeBadge } from "@/components/product/time-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [kpis, chartData] = await Promise.all([
    getDashboardKPIs(session.user.id),
    getProfitChartData(session.user.id),
  ]);

  return (
    <div className="py-4 space-y-4">
      {/* Header with export */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <ChartExport />
      </div>

      {/* Exportable section */}
      <div id="dashboard-export" className="space-y-4">
        {/* Profit KPIs */}
        <Tabs defaultValue="30j">
          <TabsList className="w-full">
            <TabsTrigger value="30j" className="flex-1">30j</TabsTrigger>
            <TabsTrigger value="90j" className="flex-1">90j</TabsTrigger>
            <TabsTrigger value="ytd" className="flex-1">YTD</TabsTrigger>
          </TabsList>
          <TabsContent value="30j">
            <div className="grid grid-cols-2 gap-2 mt-2">
              <KpiCard
                label="CA"
                value={formatCurrency(kpis.revenue.days30)}
              />
              <KpiCard
                label="Profit net"
                value={formatCurrency(kpis.profit.days30)}
                trend={kpis.profit.days30 >= 0 ? "up" : "down"}
              />
            </div>
          </TabsContent>
          <TabsContent value="90j">
            <div className="grid grid-cols-2 gap-2 mt-2">
              <KpiCard
                label="CA"
                value={formatCurrency(kpis.revenue.days90)}
              />
              <KpiCard
                label="Profit net"
                value={formatCurrency(kpis.profit.days90)}
                trend={kpis.profit.days90 >= 0 ? "up" : "down"}
              />
            </div>
          </TabsContent>
          <TabsContent value="ytd">
            <div className="grid grid-cols-2 gap-2 mt-2">
              <KpiCard
                label="CA"
                value={formatCurrency(kpis.revenue.ytd)}
              />
              <KpiCard
                label="Profit net"
                value={formatCurrency(kpis.profit.ytd)}
                trend={kpis.profit.ytd >= 0 ? "up" : "down"}
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Stock & rotation */}
        <div className="grid grid-cols-3 gap-2">
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
          />
        </div>

        {/* Profit chart */}
        <ProfitChart data={chartData} />
      </div>

      {/* Top 5 */}
      {kpis.top5.length > 0 && (
        <Card className="p-4 bg-card border-border">
          <h3 className="text-sm font-medium mb-3">Top 5 les plus rentables</h3>
          <div className="space-y-2">
            {kpis.top5.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-4">
                    {i + 1}.
                  </span>
                  <span className="text-sm truncate max-w-[180px]">
                    {item.name}
                  </span>
                </div>
                <span className="text-sm font-medium text-success">
                  +{formatCurrency(item.profit)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Sleeping products */}
      {kpis.sleeping.length > 0 && (
        <Card className="p-4 bg-card border-border border-warning/30">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
            Produits dormants
            <Badge variant="outline" className="bg-warning/20 text-warning border-0 text-[10px]">
              60j+
            </Badge>
          </h3>
          <div className="space-y-2">
            {kpis.sleeping.map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <span className="text-sm truncate max-w-[200px]">{item.name}</span>
                <TimeBadge purchaseDate={item.purchaseDate} />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
