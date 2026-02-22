"use client";

import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
} from "recharts";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/format";

interface ChartDataPoint {
  day: number;
  label: string;
  current: number | null;
  previous: number | null;
  projection: number | null;
  cumRevenue: number | null;
}

interface ProfitChartProps {
  data: ChartDataPoint[];
  periodLabel?: string;
  taxRate?: number;
}

export function ProfitChart({ data, periodLabel = "30j", taxRate = 0 }: ProfitChartProps) {
  if (data.length === 0 || data.every((d) => d.current === null && d.previous === null)) {
    return (
      <Card className="p-4 bg-card border-border h-full">
        <p className="text-sm text-muted-foreground text-center py-8">
          Pas encore de donnees de vente
        </p>
      </Card>
    );
  }

  // Compute after-tax data if taxRate > 0
  const hasTax = taxRate > 0;
  const chartData = hasTax
    ? data.map((d) => ({
        ...d,
        afterTax:
          d.current !== null && d.cumRevenue !== null
            ? Math.round((d.current - d.cumRevenue * taxRate) * 100) / 100
            : null,
      }))
    : data.map((d) => ({ ...d, afterTax: null as number | null }));

  // Get last known current value for display
  const lastCurrent = chartData.filter((d) => d.current !== null).pop();
  const lastPrevious = chartData[chartData.length - 1];
  const currentTotal = lastCurrent?.current ?? 0;
  const afterTaxTotal = lastCurrent?.afterTax ?? 0;
  const previousTotal = lastPrevious?.previous ?? 0;
  const projectionEnd = chartData.filter((d) => d.projection !== null).pop();
  const projectedTotal = projectionEnd?.projection ?? currentTotal;

  // Determine color based on current profit
  const profitColor = currentTotal >= 0 ? "#4ADE80" : "#F87171";
  const afterTaxColor = "#FB923C"; // warning/orange for after-tax line

  return (
    <Card className="p-4 bg-card border-border h-full" id="profit-chart">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium">
            Profit cumulé ({periodLabel})
          </h3>
          <p className={`text-lg font-bold mt-0.5 ${currentTotal >= 0 ? "text-success" : "text-danger"}`}>
            {currentTotal >= 0 ? "+" : ""}{formatCurrency(currentTotal)}
          </p>
          {hasTax && (
            <p className="text-xs mt-0.5" style={{ color: afterTaxColor }}>
              Après cotis: {afterTaxTotal >= 0 ? "+" : ""}{formatCurrency(afterTaxTotal)}
            </p>
          )}
        </div>
        {projectionEnd && (
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase">Projection</p>
            <p className="text-sm font-medium text-muted-foreground">
              {projectedTotal >= 0 ? "+" : ""}{formatCurrency(projectedTotal)}
            </p>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={chartData}>
          <defs>
            <linearGradient id="currentGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={profitColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={profitColor} stopOpacity={0.02} />
            </linearGradient>
            {hasTax && (
              <linearGradient id="afterTaxGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={afterTaxColor} stopOpacity={0.2} />
                <stop offset="95%" stopColor={afterTaxColor} stopOpacity={0.02} />
              </linearGradient>
            )}
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
              const label =
                name === "current"
                  ? "Profit brut"
                  : name === "afterTax"
                    ? "Après cotis."
                    : name === "previous"
                      ? "Période précédente"
                      : "Projection";
              return [`${v >= 0 ? "+" : ""}${formatCurrency(v)}`, label];
            }}
          />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />

          {/* Previous period — dashed line, no fill */}
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

          {/* Projection — dashed line */}
          <Line
            type="monotone"
            dataKey="projection"
            stroke={profitColor}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            strokeOpacity={0.5}
            dot={false}
            activeDot={false}
            connectNulls
          />

          {/* Current period — solid line with gradient fill */}
          <Area
            type="monotone"
            dataKey="current"
            stroke={profitColor}
            strokeWidth={2}
            fill="url(#currentGradient)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff", fill: profitColor }}
            connectNulls
          />

          {/* After cotisations — orange line */}
          {hasTax && (
            <Area
              type="monotone"
              dataKey="afterTax"
              stroke={afterTaxColor}
              strokeWidth={1.5}
              fill="url(#afterTaxGradient)"
              dot={false}
              activeDot={{ r: 3, strokeWidth: 2, stroke: "#fff", fill: afterTaxColor }}
              connectNulls
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded-full" style={{ backgroundColor: profitColor }} />
          <span className="text-[10px] text-muted-foreground">Profit brut</span>
        </div>
        {hasTax && (
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 rounded-full" style={{ backgroundColor: afterTaxColor }} />
            <span className="text-[10px] text-muted-foreground">Après cotis.</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded-full border-b border-dashed" style={{ borderColor: "rgba(255,255,255,0.3)" }} />
          <span className="text-[10px] text-muted-foreground">Période préc.</span>
        </div>
        {projectionEnd && (
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 rounded-full border-b border-dashed" style={{ borderColor: profitColor, opacity: 0.5 }} />
            <span className="text-[10px] text-muted-foreground">Projection</span>
          </div>
        )}
      </div>
    </Card>
  );
}
