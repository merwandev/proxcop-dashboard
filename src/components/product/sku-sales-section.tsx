"use client";

import {
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
} from "recharts";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { formatCurrency, formatDateShort } from "@/lib/utils/format";
import { PLATFORMS } from "@/lib/utils/constants";

interface SkuSale {
  saleId: string;
  salePrice: number;
  purchasePrice: number;
  profit: number;
  saleDate: string;
  platform: string | null;
  sizeVariant: string | null;
}

interface SkuSalesSectionProps {
  sales: SkuSale[];
  sku: string;
}

const tooltipStyle = {
  backgroundColor: "#24262D",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px",
  fontSize: "12px",
};

export function SkuSalesSection({ sales, sku }: SkuSalesSectionProps) {
  // KPIs
  const totalSales = sales.length;
  const lastSale = sales[sales.length - 1];
  const totalProfit = sales.reduce((s, sale) => s + sale.profit, 0);
  const profitColor = totalProfit >= 0 ? "#4ADE80" : "#F87171";

  // Most used platform
  const platformCounts: Record<string, number> = {};
  for (const sale of sales) {
    const p = sale.platform ?? "N/A";
    platformCounts[p] = (platformCounts[p] ?? 0) + 1;
  }
  const topPlatform = Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0];
  const topPlatformLabel = topPlatform
    ? PLATFORMS.find((p) => p.value === topPlatform[0])?.label ?? topPlatform[0]
    : "N/A";

  // Build cumulative profit chart data
  const chartData: { label: string; profit: number }[] = [];
  let cumProfit = 0;
  for (const sale of sales) {
    cumProfit += sale.profit;
    chartData.push({
      label: formatDateShort(sale.saleDate),
      profit: Math.round(cumProfit * 100) / 100,
    });
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground px-1">
        Ventes du SKU ({totalSales})
      </h3>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-2">
        <KpiCard
          label="Derniere vente"
          value={lastSale ? formatDateShort(lastSale.saleDate) : "—"}
          sub={lastSale ? formatCurrency(lastSale.salePrice) : undefined}
        />
        <KpiCard
          label="Plateforme top"
          value={topPlatformLabel}
          sub={topPlatform ? `${topPlatform[1]} ventes` : undefined}
        />
        <KpiCard
          label="Profit total"
          value={formatCurrency(totalProfit)}
          trend={totalProfit >= 0 ? "up" : "down"}
        />
      </div>

      {/* Cumulative profit chart */}
      {chartData.length >= 2 && (
        <Card className="p-4 bg-card border-border">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-sm font-medium">Profit cumule — {sku}</h3>
              <p className={`text-lg font-bold mt-0.5 ${totalProfit >= 0 ? "text-success" : "text-danger"}`}>
                {totalProfit >= 0 ? "+" : ""}{formatCurrency(totalProfit)}
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase mt-1">
              {totalSales} ventes
            </p>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="skuProfitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={profitColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={profitColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: "#919191" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 9, fill: "#919191" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}€`}
                width={50}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={{ color: "#919191", marginBottom: 4 }}
                formatter={(value) => {
                  const v = Number(value ?? 0);
                  return [`${v >= 0 ? "+" : ""}${formatCurrency(v)}`, "Profit cumule"];
                }}
              />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
              <Area
                type="monotone"
                dataKey="profit"
                stroke={profitColor}
                strokeWidth={2}
                fill="url(#skuProfitGradient)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff", fill: profitColor }}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Sales history list */}
      <Card className="p-4 bg-card border-border">
        <h3 className="text-sm font-medium mb-3">Historique des ventes</h3>
        <div className="space-y-2">
          {[...sales].reverse().map((sale) => {
            const platformLabel = PLATFORMS.find((p) => p.value === sale.platform)?.label ?? sale.platform ?? "—";
            return (
              <div key={sale.saleId} className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    {sale.sizeVariant && (
                      <span className="font-medium">{sale.sizeVariant}</span>
                    )}
                    <span className="text-muted-foreground text-xs">{platformLabel}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {formatDateShort(sale.saleDate)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium">{formatCurrency(sale.salePrice)}</p>
                  <p className={`text-[10px] font-medium ${sale.profit >= 0 ? "text-success" : "text-danger"}`}>
                    {sale.profit >= 0 ? "+" : ""}{formatCurrency(sale.profit)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
