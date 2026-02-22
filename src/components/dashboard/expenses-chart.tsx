"use client";

import {
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/format";

interface ExpensesChartDataPoint {
  day: number;
  label: string;
  current: number | null;
  previous: number | null;
}

interface ExpensesChartProps {
  data: ExpensesChartDataPoint[];
  periodLabel?: string;
}

export function ExpensesChart({ data, periodLabel = "30j" }: ExpensesChartProps) {
  if (data.length === 0 || data.every((d) => d.current === null && d.previous === null)) {
    return (
      <Card className="p-4 bg-card border-border">
        <p className="text-sm text-muted-foreground text-center py-8">
          Pas encore de depenses
        </p>
      </Card>
    );
  }

  // Get last known current value
  const lastCurrent = data.filter((d) => d.current !== null).pop();
  const currentTotal = lastCurrent?.current ?? 0;

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium">Depenses cumulees ({periodLabel})</h3>
          <p className="text-lg font-bold mt-0.5 text-warning">
            -{formatCurrency(currentTotal)}
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data}>
          <defs>
            <linearGradient id="expensesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#FB923C" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#FB923C" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
            vertical={false}
          />
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
            contentStyle={{
              backgroundColor: "#24262D",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              fontSize: "12px",
              color: "#E4E4E7",
            }}
            labelStyle={{ color: "#919191", marginBottom: 4 }}
            itemStyle={{ color: "#C9CEEE", padding: "2px 0" }}
            formatter={(value, name) => {
              const v = Number(value ?? 0);
              if (value === null || value === undefined) return ["", ""];
              const label = name === "current" ? "Periode actuelle" : "Periode precedente";
              return [`-${formatCurrency(v)}`, label];
            }}
          />

          {/* Previous period — dashed line */}
          <Line
            type="monotone"
            dataKey="previous"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            activeDot={false}
            connectNulls
          />

          {/* Current period — solid line with gradient fill */}
          <Area
            type="monotone"
            dataKey="current"
            stroke="#FB923C"
            strokeWidth={2}
            fill="url(#expensesGradient)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff", fill: "#FB923C" }}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded-full" style={{ backgroundColor: "#FB923C" }} />
          <span className="text-[10px] text-muted-foreground">Periode actuelle</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded-full border-b border-dashed" style={{ borderColor: "rgba(255,255,255,0.3)" }} />
          <span className="text-[10px] text-muted-foreground">Periode prec.</span>
        </div>
      </div>
    </Card>
  );
}
