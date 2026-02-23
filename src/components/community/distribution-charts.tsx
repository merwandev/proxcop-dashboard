"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Card } from "@/components/ui/card";
import { PLATFORMS, CATEGORIES } from "@/lib/utils/constants";

interface PlatformDist {
  platform: string;
  count: number;
  percentage: number;
}

interface CategoryBreakdown {
  category: string;
  count: number;
  percentage: number;
}

interface DistributionChartsProps {
  platformDistribution: PlatformDist[];
  categoryBreakdown: CategoryBreakdown[];
  daysBack: number;
}

const PLATFORM_COLORS: Record<string, string> = {
  stockx: "#00B140",
  vinted: "#09B1BA",
  ebay: "#E53238",
  laced: "#8B5CF6",
  hypeboost: "#F59E0B",
  alias: "#3B82F6",
  discord: "#5865F2",
  other: "#6B7280",
};

const CATEGORY_COLORS: Record<string, string> = {
  sneakers: "#C9CEEE",
  pokemon: "#F59E0B",
  lego: "#EF4444",
  random: "#6B7280",
};

const tooltipStyle = {
  backgroundColor: "#24262D",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px",
  fontSize: "12px",
  color: "#C9CEEE",
};

export function DistributionCharts({
  platformDistribution,
  categoryBreakdown,
  daysBack,
}: DistributionChartsProps) {
  const platformData = platformDistribution.map((d) => ({
    name: PLATFORMS.find((p) => p.value === d.platform)?.label ?? d.platform,
    value: d.count,
    percentage: d.percentage,
    fill: PLATFORM_COLORS[d.platform] ?? "#6B7280",
  }));

  const categoryData = categoryBreakdown.map((d) => ({
    name: CATEGORIES.find((c) => c.value === d.category)?.label ?? d.category,
    value: d.count,
    percentage: d.percentage,
    fill: CATEGORY_COLORS[d.category] ?? "#6B7280",
  }));

  return (
    <div>
      <h2 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">
        Répartition — {daysBack} jours
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Platform pie chart */}
        {platformData.length > 0 && (
          <Card className="p-3 gap-0 bg-card border-border">
            <h3 className="text-sm font-medium mb-2">Par plateforme</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={platformData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {platformData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: "#919191" }}
                  itemStyle={{ color: "#C9CEEE" }}
                  formatter={(value, name) => [
                    `${value} ventes`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 justify-center">
              {platformData.map((d) => (
                <div key={d.name} className="flex items-center gap-1">
                  <div
                    className="h-2 w-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: d.fill }}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {d.name} ({d.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Category bar chart */}
        {categoryData.length > 0 && (
          <Card className="p-3 gap-0 bg-card border-border">
            <h3 className="text-sm font-medium mb-2">Par catégorie</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={categoryData} layout="vertical" margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 9, fill: "#919191" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "#919191" }}
                  tickLine={false}
                  axisLine={false}
                  width={70}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: "#919191" }}
                  itemStyle={{ color: "#C9CEEE" }}
                  formatter={(value, _name, props) => [
                    `${value} ventes (${props.payload?.percentage}%)`,
                    "Catégorie",
                  ]}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={22}>
                  {categoryData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>
    </div>
  );
}
