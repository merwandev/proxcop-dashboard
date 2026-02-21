"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card } from "@/components/ui/card";

interface StatsChartsProps {
  roiByCategory: { category: string; profit: number; roi: number; count: number }[];
  marginDistribution: number[];
}

const COLORS = ["#C9CEEE", "#8B92C8", "#4ADE80", "#FB923C", "#F87171"];

export function StatsCharts({ roiByCategory, marginDistribution }: StatsChartsProps) {
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

  return (
    <>
      {/* ROI Bar Chart */}
      {roiByCategory.length > 0 && (
        <Card className="p-4 bg-card border-border">
          <h3 className="text-sm font-medium mb-3">Profit par categorie</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={roiByCategory}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="category"
                tick={{ fontSize: 10, fill: "#919191" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#919191" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}€`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#24262D",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value) => [`${Number(value).toFixed(2)}€`]}
              />
              <Bar dataKey="profit" radius={[6, 6, 0, 0]}>
                {roiByCategory.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Margin distribution */}
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
                contentStyle={{
                  backgroundColor: "#24262D",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value) => [`${value} ventes`]}
              />
              <Bar dataKey="count" fill="#C9CEEE" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
    </>
  );
}
