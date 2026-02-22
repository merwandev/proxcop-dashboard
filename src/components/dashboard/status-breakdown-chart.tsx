"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/card";

interface StatusData {
  status: string;
  label: string;
  count: number;
}

interface StatusBreakdownChartProps {
  data: StatusData[];
}

const STATUS_COLORS: Record<string, string> = {
  en_attente: "#FB923C",     // warning
  en_stock: "#4ADE80",       // success
  liste: "#C9CEEE",          // primary
  reserve: "#A78BFA",        // purple
  expedie: "#38BDF8",        // sky
  vendu: "#8B92C8",          // muted primary
  en_litige: "#F87171",      // danger
  return_waiting_rf: "#FBBF24", // amber
  hold: "#919191",           // gray
  reship: "#FB7185",         // rose
  consign: "#2DD4BF",        // teal
};

const tooltipStyle = {
  backgroundColor: "#24262D",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px",
  fontSize: "12px",
  color: "#E4E4E7",
};

export function StatusBreakdownChart({ data }: StatusBreakdownChartProps) {
  if (data.length === 0) {
    return (
      <Card className="p-4 bg-card border-border h-full">
        <p className="text-sm text-muted-foreground text-center py-8">
          Aucun produit en stock
        </p>
      </Card>
    );
  }

  const total = data.reduce((s, d) => s + d.count, 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, label } = props;
    if (percent < 0.08) return null;
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
        fontSize={9}
        fontWeight={600}
      >
        {label}
      </text>
    );
  };

  return (
    <Card className="p-4 bg-card border-border h-full">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-medium">Repartition statuts</h3>
          <p className="text-lg font-bold mt-0.5">
            {total} <span className="text-sm font-normal text-muted-foreground">variants</span>
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={80}
            paddingAngle={3}
            dataKey="count"
            nameKey="label"
            label={renderLabel}
            labelLine={false}
          >
            {data.map((entry) => (
              <Cell
                key={entry.status}
                fill={STATUS_COLORS[entry.status] ?? "#919191"}
                stroke="transparent"
              />
            ))}
          </Pie>
          <Tooltip
            cursor={false}
            contentStyle={tooltipStyle}
            itemStyle={{ color: "#C9CEEE" }}
            formatter={(value) => [`${Number(value ?? 0)} variants`]}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2">
        {data.map((d) => (
          <div key={d.status} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[d.status] ?? "#919191" }}
            />
            <span className="text-[10px] text-muted-foreground">
              {d.label} ({d.count})
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
