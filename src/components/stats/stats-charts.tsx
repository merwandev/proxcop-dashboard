"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Area,
  ComposedChart,
  ReferenceLine,
  PieChart,
  Pie,
  FunnelChart,
  Funnel,
  LabelList,
} from "recharts";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatDateShort } from "@/lib/utils/format";
import { BarChart3, PieChart as PieChartIcon } from "lucide-react";

interface StatsChartsProps {
  roiByCategory: { category: string; profit: number; roi: number; count: number }[];
  roiByPlatform: { platform: string; profit: number; roi: number; count: number }[];
  stockByCategory: { category: string; count: number; value: number }[];
  stockEvolution: { date: string; stock: number }[];
  marginDistribution: number[];
}

const CATEGORY_COLORS = ["#C9CEEE", "#8B92C8", "#4ADE80", "#FB923C", "#F87171"];
const PLATFORM_COLORS = ["#4ADE80", "#C9CEEE", "#FB923C", "#8B92C8", "#F87171", "#38BDF8", "#A78BFA", "#FBBF24"];

const tooltipStyle = {
  backgroundColor: "#24262D",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px",
  fontSize: "12px",
  color: "#E4E4E7",
};

export function StatsCharts({
  roiByCategory,
  roiByPlatform,
  stockByCategory,
  stockEvolution,
  marginDistribution,
}: StatsChartsProps) {
  const [platformView, setPlatformView] = useState<"bar" | "pie">("bar");

  // Profit par categorie — total profit + funnel data (sorted descending by profit)
  const totalProfit = roiByCategory.reduce((s, c) => s + c.profit, 0);
  const categoryFunnelData = [...roiByCategory]
    .filter((c) => c.profit > 0)
    .sort((a, b) => b.profit - a.profit)
    .map((c, i) => ({
      name: c.category.charAt(0).toUpperCase() + c.category.slice(1),
      value: c.profit,
      count: c.count,
      fill: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }));

  // Build histogram buckets for margin distribution
  const buckets = [
    { label: "<0%", min: -Infinity, max: 0 },
    { label: "0-10%", min: 0, max: 10 },
    { label: "10-20%", min: 10, max: 20 },
    { label: "20-30%", min: 20, max: 30 },
    { label: "30-50%", min: 30, max: 50 },
    { label: "50%+", min: 50, max: Infinity },
  ];

  const histogramData = buckets.map((bucket) => ({
    label: bucket.label,
    count: marginDistribution.filter(
      (m) => m >= bucket.min && m < bucket.max
    ).length,
  }));

  // Stock totals (current)
  const totalStock = stockByCategory.reduce((s, c) => s + c.count, 0);
  const totalStockValue = stockByCategory.reduce((s, c) => s + c.value, 0);

  // Stock evolution chart data
  const stockChartData = stockEvolution.map((point) => ({
    label: formatDateShort(point.date),
    stock: point.stock,
  }));

  // Platform data for pie chart (only positive profits for pie)
  const platformPieData = roiByPlatform
    .filter((p) => p.profit > 0)
    .map((p, i) => ({
      ...p,
      fill: PLATFORM_COLORS[i % PLATFORM_COLORS.length],
    }));

  // Custom pie label for platform
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderPlatformPieLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, platform } = props;
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text
        x={x}
        y={y}
        fill="#fff"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={10}
        fontWeight={600}
      >
        {platform}
      </text>
    );
  };

  return (
    <>
      {/* ── Profit par categorie (funnel / cone chart) ── */}
      {roiByCategory.length > 0 && (
        <Card className="p-4 bg-card border-border">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-sm font-medium">Profit par categorie</h3>
              <p className={`text-lg font-bold mt-0.5 ${totalProfit >= 0 ? "text-success" : "text-danger"}`}>
                {totalProfit >= 0 ? "+" : ""}{formatCurrency(totalProfit)}
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase mt-1">
              {roiByCategory.reduce((s, c) => s + c.count, 0)} ventes
            </p>
          </div>

          {categoryFunnelData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <FunnelChart>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    itemStyle={{ color: "#C9CEEE" }}
                    formatter={(value) => [
                      `+${formatCurrency(Number(value ?? 0))}`,
                      "Profit",
                    ]}
                  />
                  <Funnel
                    dataKey="value"
                    nameKey="name"
                    data={categoryFunnelData}
                    isAnimationActive
                  >
                    {categoryFunnelData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} stroke="transparent" />
                    ))}
                    <LabelList
                      dataKey="name"
                      position="center"
                      fill="#fff"
                      fontSize={11}
                      fontWeight={600}
                    />
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2">
                {categoryFunnelData.map((c) => (
                  <div key={c.name} className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: c.fill }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {c.name} ({formatCurrency(c.value)})
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-8">
              Pas encore de profit positif par categorie
            </p>
          )}
        </Card>
      )}

      {/* ── Evolution du stock (timeline chart) ── */}
      {stockEvolution.length >= 2 && (
        <Card className="p-4 bg-card border-border">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-sm font-medium">Evolution du stock</h3>
              <p className="text-lg font-bold mt-0.5">
                {totalStock} <span className="text-sm font-normal text-muted-foreground">unites</span>
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase mt-1">
              {formatCurrency(totalStockValue)}
            </p>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={stockChartData}>
              <defs>
                <linearGradient id="stockEvoGradient" x1="0" y1="0" x2="0" y2="1">
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
                width={35}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={{ color: "#919191", marginBottom: 4 }}
                itemStyle={{ color: "#C9CEEE" }}
                formatter={(value) => {
                  const v = Number(value ?? 0);
                  return [`${v} unites`, "En stock"];
                }}
              />
              <Area
                type="monotone"
                dataKey="stock"
                stroke="#C9CEEE"
                strokeWidth={2}
                fill="url(#stockEvoGradient)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff", fill: "#C9CEEE" }}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* ── ROI par plateforme (toggle bar/pie) ── */}
      {roiByPlatform.length > 0 && (
        <Card className="p-4 bg-card border-border">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-sm font-medium">ROI par plateforme</h3>
              <p className="text-lg font-bold mt-0.5 text-success">
                +{formatCurrency(roiByPlatform.reduce((s, p) => s + p.profit, 0))}
              </p>
            </div>
            <div className="flex items-center gap-1 bg-background rounded-lg p-0.5">
              <button
                onClick={() => setPlatformView("bar")}
                className={`p-1.5 rounded-md transition-colors ${
                  platformView === "bar"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <BarChart3 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setPlatformView("pie")}
                className={`p-1.5 rounded-md transition-colors ${
                  platformView === "pie"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <PieChartIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {platformView === "bar" ? (
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={roiByPlatform}>
                <defs>
                  <linearGradient id="platformGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ADE80" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4ADE80" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="platform"
                  tick={{ fontSize: 10, fill: "#919191" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
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
                  itemStyle={{ color: "#C9CEEE" }}
                  formatter={(value, name) => {
                    const v = Number(value ?? 0);
                    if (name === "profit") {
                      return [`${v >= 0 ? "+" : ""}${formatCurrency(v)}`, "Profit"];
                    }
                    return [`${v}`, String(name)];
                  }}
                  labelFormatter={(label) => String(label).charAt(0).toUpperCase() + String(label).slice(1)}
                />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="#4ADE80"
                  strokeWidth={2}
                  fill="url(#platformGradient)"
                  dot={{ r: 4, strokeWidth: 2, stroke: "#fff", fill: "#4ADE80" }}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff", fill: "#4ADE80" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={platformPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="profit"
                    nameKey="platform"
                    label={renderPlatformPieLabel}
                    labelLine={false}
                  >
                    {platformPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    itemStyle={{ color: "#C9CEEE" }}
                    formatter={(value) => [
                      `+${formatCurrency(Number(value ?? 0))}`,
                      "Profit",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Pie legend */}
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2">
                {roiByPlatform.map((p, i) => (
                  <div key={p.platform} className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: PLATFORM_COLORS[i % PLATFORM_COLORS.length] }}
                    />
                    <span className="text-[10px] text-muted-foreground capitalize">
                      {p.platform} ({p.count})
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      )}

      {/* ── Distribution des marges ── */}
      {marginDistribution.length > 0 && (
        <Card className="p-4 bg-card border-border">
          <h3 className="text-sm font-medium mb-3">Distribution des marges</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={histogramData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#919191" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#919191" }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                itemStyle={{ color: "#C9CEEE" }}
                formatter={(value) => [`${Number(value ?? 0)} ventes`]}
              />
              <Bar dataKey="count" fill="#C9CEEE" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </>
  );
}
