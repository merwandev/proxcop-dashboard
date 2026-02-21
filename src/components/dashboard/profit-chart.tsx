"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/card";

interface ProfitChartProps {
  data: { month: string; profit: number; revenue: number }[];
}

export function ProfitChart({ data }: ProfitChartProps) {
  if (data.length === 0) {
    return (
      <Card className="p-4 bg-card border-border">
        <p className="text-sm text-muted-foreground text-center py-8">
          Pas encore de donnees de vente
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-card border-border" id="profit-chart">
      <h3 className="text-sm font-medium mb-3">Profit mensuel</h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#C9CEEE" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#C9CEEE" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="month"
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
            labelStyle={{ color: "#919191" }}
            formatter={(value) => [`${Number(value).toFixed(2)}€`]}
          />
          <Area
            type="monotone"
            dataKey="profit"
            stroke="#C9CEEE"
            strokeWidth={2}
            fill="url(#profitGradient)"
            name="Profit"
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}
