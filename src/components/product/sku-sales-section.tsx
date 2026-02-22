"use client";

import {
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { formatCurrency, formatDateShort } from "@/lib/utils/format";
import { PLATFORMS } from "@/lib/utils/constants";

interface SkuSale {
  saleId: string;
  salePrice: number;
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
  color: "#E4E4E7",
};

export function SkuSalesSection({ sales, sku }: SkuSalesSectionProps) {
  // KPIs
  const totalSales = sales.length;
  const lastSale = sales[sales.length - 1];

  // Median sale price
  const sortedPrices = [...sales].map((s) => s.salePrice).sort((a, b) => a - b);
  const medianPrice =
    sortedPrices.length > 0
      ? sortedPrices.length % 2 === 1
        ? sortedPrices[Math.floor(sortedPrices.length / 2)]
        : (sortedPrices[sortedPrices.length / 2 - 1] + sortedPrices[sortedPrices.length / 2]) / 2
      : 0;

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

  // Build per-sale price chart data (sale prices over time)
  const chartData = sales.map((sale) => ({
    label: formatDateShort(sale.saleDate),
    price: Math.round(sale.salePrice * 100) / 100,
  }));

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground px-1">
        Ventes membres — {sku} ({totalSales})
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
          label="Prix median"
          value={formatCurrency(medianPrice)}
          sub={`${totalSales} ventes`}
        />
      </div>

      {/* Per-sale price chart */}
      {chartData.length >= 2 && (
        <Card className="p-4 bg-card border-border">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-sm font-medium">Prix de vente — {sku}</h3>
              <p className="text-lg font-bold mt-0.5">
                {formatCurrency(medianPrice)} <span className="text-sm font-normal text-muted-foreground">median</span>
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase mt-1">
              {totalSales} ventes
            </p>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="skuPriceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C9CEEE" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#C9CEEE" stopOpacity={0.02} />
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
                cursor={false}
                contentStyle={tooltipStyle}
                labelStyle={{ color: "#919191", marginBottom: 4 }}
                itemStyle={{ color: "#C9CEEE" }}
                formatter={(value) => {
                  const v = Number(value ?? 0);
                  return [formatCurrency(v), "Prix de vente"];
                }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#C9CEEE"
                strokeWidth={2}
                fill="url(#skuPriceGradient)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff", fill: "#C9CEEE" }}
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
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
