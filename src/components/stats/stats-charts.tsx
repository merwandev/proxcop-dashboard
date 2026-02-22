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
} from "recharts";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/format";
import { BarChart3, PieChart as PieChartIcon } from "lucide-react";

interface StatsChartsProps {
  roiByCategory: { category: string; profit: number; roi: number; count: number }[];
  roiByPlatform: { platform: string; profit: number; roi: number; count: number }[];
  stockByCategory: { category: string; count: number; value: number }[];
  marginDistribution: number[];
}

const COLORS = ["#C9CEEE", "#8B92C8", "#4ADE80", "#FB923C", "#F87171"];
const PLATFORM_COLORS = ["#4ADE80", "#C9CEEE", "#FB923C", "#8B92C8", "#F87171", "#38BDF8", "#A78BFA", "#FBBF24"];

const tooltipStyle = {
  backgroundColor: "#24262D",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px",
  fontSize: "12px",
};

export function StatsCharts({
  roiByCategory,
  roiByPlatform,
  stockByCategory,
  marginDistribution,
}: StatsChartsProps) {
  const [platformView, setPlatformView] = useState<"bar" | "pie">("bar");

  // Profit par categorie — total profit
  const totalProfit = roiByCategory.reduce((s, c) => s + c.profit, 0);
  const profitColor = totalProfit >= 0 ? "#4ADE80" : "#F87171";

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

  // Stock total
  const totalStock = stockByCategory.reduce((s, c) => s + c.count, 0);
  const totalStockValue = stockByCategory.reduce((s, c) => s + c.value, 0);

  // Platform data for pie chart (only positive profits for pie)
  const platformPieData = roiByPlatform
    .filter((p) => p.profit > 0)
    .map((p, i) => ({
      ...p,
      fill: PLATFORM_COLORS[i % PLATFORM_COLORS.length],
    }));

  // Custom pie label
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderPieLabel = (props: any) => {
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
      {/* ── Profit par categorie (dashboard style) ── */}
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

          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={roiByCategory}>
              <defs>
                <linearGradient id="categoryGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={profitColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={profitColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="category"
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
                formatter={(value) => {
                  const v = Number(value ?? 0);
                  return [`${v >= 0 ? "+" : ""}${formatCurrency(v)}`, "Profit"];
                }}
                labelFormatter={(label) => String(label).charAt(0).toUpperCase() + String(label).slice(1)}
              />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
              <Area
                type="monotone"
                dataKey="profit"
                stroke={profitColor}
                strokeWidth={2}
                fill="url(#categoryGradient)"
                dot={{ r: 4, strokeWidth: 2, stroke: "#fff", fill: profitColor }}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff", fill: profitColor }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* ── Stock par categorie (dashboard style) ── */}
      {stockByCategory.length > 0 && (
        <Card className="p-4 bg-card border-border">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-sm font-medium">Produits en stock</h3>
              <p className="text-lg font-bold mt-0.5">
                {totalStock} <span className="text-sm font-normal text-muted-foreground">unites</span>
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase mt-1">
              {formatCurrency(totalStockValue)}
            </p>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={stockByCategory}>
              <defs>
                <linearGradient id="stockGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C9CEEE" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#C9CEEE" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="category"
                tick={{ fontSize: 10, fill: "#919191" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
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
                formatter={(value, name) => {
                  const v = Number(value ?? 0);
                  if (name === "count") return [`${v} unites`, "En stock"];
                  return [`${formatCurrency(v)}`, "Valeur"];
                }}
                labelFormatter={(label) => String(label).charAt(0).toUpperCase() + String(label).slice(1)}
              />
              <Bar dataKey="count" fill="#C9CEEE" radius={[6, 6, 0, 0]}>
                {stockByCategory.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
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
                <Bar dataKey="profit" radius={[6, 6, 0, 0]}>
                  {roiByPlatform.map((_, i) => (
                    <Cell key={i} fill={PLATFORM_COLORS[i % PLATFORM_COLORS.length]} />
                  ))}
                </Bar>
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
                    label={renderPieLabel}
                    labelLine={false}
                  >
                    {platformPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
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
