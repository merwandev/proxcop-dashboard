"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import {
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  BarChart,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { formatCurrency, formatDateShort } from "@/lib/utils/format";
import { PLATFORMS } from "@/lib/utils/constants";
import { lookupMarketData } from "@/lib/actions/community-actions";
import { Search, X, Loader2, SearchX } from "lucide-react";

interface MarketSale {
  saleId: string;
  salePrice: number;
  saleDate: string;
  platform: string | null;
  sizeVariant: string | null;
}

interface MarketData {
  sales: MarketSale[];
  medianBySize: Record<string, { median: number; saleCount: number }>;
  overallMedian: { median: number; saleCount: number } | null;
}

const tooltipStyle = {
  backgroundColor: "#24262D",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px",
  fontSize: "12px",
  color: "#C9CEEE",
};

export function MarketExplorer() {
  const [query, setQuery] = useState("");
  const [searchedSku, setSearchedSku] = useState("");
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<MarketData | null>(null);

  const doSearch = useCallback(
    (sku: string) => {
      if (!sku || sku.trim().length < 2) return;
      const normalized = sku.trim().toUpperCase();
      setSearchedSku(normalized);
      startTransition(async () => {
        const result = await lookupMarketData(normalized);
        setData(result as MarketData);
      });
    },
    []
  );

  // Debounce 1000ms
  useEffect(() => {
    if (!query || query.trim().length < 2) return;
    const timer = setTimeout(() => {
      doSearch(query);
    }, 1000);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  // Chart data from sales
  const chartData = data?.sales.map((sale) => ({
    label: formatDateShort(sale.saleDate),
    price: Math.round(sale.salePrice * 100) / 100,
  })) ?? [];

  // Median by size for bar chart
  const sizeData = data
    ? Object.entries(data.medianBySize)
        .map(([size, d]) => ({
          size,
          median: Math.round(d.median),
          count: d.saleCount,
        }))
        .sort((a, b) => {
          const numA = parseFloat(a.size);
          const numB = parseFloat(b.size);
          if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
          return a.size.localeCompare(b.size);
        })
    : [];

  // KPI calculations
  const totalSales = data?.sales.length ?? 0;
  const lastSale = data?.sales[data.sales.length - 1];

  // Compute median from sales data client-side (fallback when < 3 sales for DB median)
  const computedMedian = (() => {
    if (data?.overallMedian) return data.overallMedian.median;
    if (!data?.sales || data.sales.length === 0) return 0;
    const sorted = [...data.sales].map((s) => s.salePrice).sort((a, b) => a - b);
    if (sorted.length % 2 === 1) return sorted[Math.floor(sorted.length / 2)];
    return (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
  })();

  // Most used platform
  const platformCounts: Record<string, number> = {};
  if (data?.sales) {
    for (const sale of data.sales) {
      const p = sale.platform ?? "N/A";
      platformCounts[p] = (platformCounts[p] ?? 0) + 1;
    }
  }
  const topPlatform = Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0];
  const topPlatformLabel = topPlatform
    ? PLATFORMS.find((p) => p.value === topPlatform[0])?.label ?? topPlatform[0]
    : "—";

  return (
    <div>
      <h2 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">
        Market Explorer
      </h2>

      {/* Search input */}
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un SKU (ex: DD1391-100)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 bg-card border-border h-9 text-sm"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setData(null);
              setSearchedSku("");
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Loading state */}
      {isPending && (
        <Card className="p-6 bg-card border-border flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Recherche en cours...</span>
        </Card>
      )}

      {/* Empty state */}
      {!isPending && !data && !searchedSku && (
        <Card className="p-6 bg-card border-border text-center">
          <Search className="h-6 w-6 text-muted-foreground mx-auto mb-1.5 opacity-40" />
          <p className="text-sm text-muted-foreground">
            Recherche un SKU pour explorer le marché
          </p>
        </Card>
      )}

      {/* No results */}
      {!isPending && data && data.sales.length === 0 && searchedSku && (
        <Card className="p-6 bg-card border-border text-center">
          <SearchX className="h-6 w-6 text-muted-foreground mx-auto mb-1.5 opacity-40" />
          <p className="text-sm text-muted-foreground">
            Aucune vente pour <span className="font-mono font-medium text-foreground">{searchedSku}</span>
          </p>
        </Card>
      )}

      {/* Results */}
      {!isPending && data && data.sales.length > 0 && (
        <div className="space-y-2">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <KpiCard
              label="Nb ventes"
              value={String(totalSales)}
              sub={searchedSku}
            />
            <KpiCard
              label="Prix médian"
              value={formatCurrency(computedMedian)}
              sub={`${totalSales} ventes`}
            />
            <KpiCard
              label="Dernière vente"
              value={lastSale ? formatDateShort(lastSale.saleDate) : "—"}
              sub={lastSale ? formatCurrency(lastSale.salePrice) : undefined}
            />
            <KpiCard
              label="Plateforme top"
              value={topPlatformLabel}
              sub={topPlatform ? `${topPlatform[1]} ventes` : undefined}
            />
          </div>

          {/* Price chart */}
          {chartData.length >= 2 && (
            <Card className="p-3 gap-0 bg-card border-border">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-sm font-medium">Prix de vente — {searchedSku}</h3>
                  <p className="text-lg font-bold mt-0.5">
                    {formatCurrency(computedMedian)}{" "}
                    <span className="text-sm font-normal text-muted-foreground">médian</span>
                  </p>
                </div>
                <p className="text-[10px] text-muted-foreground uppercase mt-1">
                  {totalSales} ventes
                </p>
              </div>

              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={chartData}>
                  <defs>
                    <linearGradient id="marketPriceGradient" x1="0" y1="0" x2="0" y2="1">
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
                    fill="url(#marketPriceGradient)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff", fill: "#C9CEEE" }}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Median by size bar chart */}
          {sizeData.length > 0 && (
            <Card className="p-3 gap-0 bg-card border-border">
              <h3 className="text-sm font-medium mb-2">Prix médian par taille</h3>
              <ResponsiveContainer width="100%" height={Math.max(150, sizeData.length * 28)}>
                <BarChart data={sizeData} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 9, fill: "#919191" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}€`}
                  />
                  <YAxis
                    type="category"
                    dataKey="size"
                    tick={{ fontSize: 10, fill: "#919191" }}
                    tickLine={false}
                    axisLine={false}
                    width={45}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.03)" }}
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: "#919191", marginBottom: 4 }}
                    itemStyle={{ color: "#C9CEEE" }}
                    formatter={(value, _name, props) => {
                      const v = Number(value ?? 0);
                      const count = props.payload?.count ?? 0;
                      return [
                        `${formatCurrency(v)} (${count} ventes)`,
                        "Médian",
                      ];
                    }}
                  />
                  <Bar
                    dataKey="median"
                    fill="#C9CEEE"
                    radius={[0, 4, 4, 0]}
                    barSize={16}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
