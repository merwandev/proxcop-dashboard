"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { toast } from "sonner";
import {
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ComposedChart,
} from "recharts";

interface ExportKpi {
  revenue: number;
  profit: number;
  salesCount: number;
  stock: { count: number; purchaseValue: number };
  rotation: number;
  cashImmobilized: number;
}

interface ChartDataPoint {
  day: number;
  label: string;
  current: number | null;
  previous: number | null;
  projection: number | null;
}

interface ChartExportProps {
  kpis: ExportKpi;
  chartData: ChartDataPoint[];
  periodLabel: string;
  userName?: string;
}

export function ChartExport({ kpis, chartData, periodLabel, userName }: ChartExportProps) {
  const exportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const lastCurrent = chartData.filter((d) => d.current !== null).pop();
  const currentTotal = lastCurrent?.current ?? 0;
  const profitColor = currentTotal >= 0 ? "#4ADE80" : "#F87171";

  const handleExport = async () => {
    setExporting(true);
    try {
      const { toPng } = await import("html-to-image");
      const node = exportRef.current;
      if (!node) return;

      // Make visible for rendering (already on-screen with visibility hidden)
      node.style.visibility = "visible";
      node.style.opacity = "1";

      // Wait for any re-render to settle
      await new Promise((r) => setTimeout(r, 300));

      const dataUrl = await toPng(node, {
        backgroundColor: "#18191E",
        pixelRatio: 2,
        width: 430,
        height: node.offsetHeight,
        style: {
          transform: "none",
          margin: "0",
          visibility: "visible",
          opacity: "1",
        },
      });

      // Hide again
      node.style.visibility = "hidden";
      node.style.opacity = "0";

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `proxstock-${periodLabel}-${new Date().toISOString().split("T")[0]}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Image exportee !");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Erreur lors de l'export");
    } finally {
      setExporting(false);
    }
  };

  const today = new Date();
  const dateStr = `${today.getDate().toString().padStart(2, "0")}/${(today.getMonth() + 1).toString().padStart(2, "0")}/${today.getFullYear()}`;

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport} disabled={exporting}>
        {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        Export
      </Button>

      {/* Hidden export container — premium branded layout */}
      <div
        ref={exportRef}
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          width: 430,
          fontFamily: "'Inter', 'Geist', -apple-system, BlinkMacSystemFont, sans-serif",
          background: "#18191E",
          color: "#fff",
          overflow: "hidden",
          visibility: "hidden",
          zIndex: -9999,
          pointerEvents: "none",
        }}
      >
        {/* ── Background decorations ── */}
        <div style={{ position: "relative", padding: "28px 24px 20px" }}>
          {/* Gradient glow top-right */}
          <div
            style={{
              position: "absolute",
              top: -60,
              right: -60,
              width: 200,
              height: 200,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(201,206,238,0.15) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
          {/* Gradient glow bottom-left */}
          <div
            style={{
              position: "absolute",
              bottom: -40,
              left: -40,
              width: 160,
              height: 160,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${profitColor}10 0%, transparent 70%)`,
              pointerEvents: "none",
            }}
          />

          {/* ── Header with logo ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="ProxStock"
                width={40}
                height={40}
                style={{ borderRadius: 10 }}
              />
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>
                  ProxStock
                </div>
                <div style={{ fontSize: 11, color: "#919191", marginTop: 1 }}>
                  {userName ? `@${userName}` : "Dashboard"} · {dateStr}
                </div>
              </div>
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#C9CEEE",
                background: "rgba(201,206,238,0.12)",
                padding: "4px 10px",
                borderRadius: 6,
                border: "1px solid rgba(201,206,238,0.2)",
              }}
            >
              {periodLabel}
            </div>
          </div>

          {/* ── Main profit hero ── */}
          <div
            style={{
              background: "linear-gradient(135deg, rgba(201,206,238,0.08) 0%, rgba(201,206,238,0.03) 100%)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              padding: "20px 20px 16px",
              marginBottom: 16,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Subtle shine */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 1,
                background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 11, color: "#919191", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                  Profit net
                </div>
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 800,
                    color: profitColor,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.1,
                  }}
                >
                  {kpis.profit >= 0 ? "+" : ""}{formatCurrency(kpis.profit)}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "#919191", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                  CA
                </div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>
                  {formatCurrency(kpis.revenue)}
                </div>
              </div>
            </div>
          </div>

          {/* ── KPI grid ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
            <KpiBox label="Ventes" value={kpis.salesCount.toString()} />
            <KpiBox label="En stock" value={kpis.stock.count.toString()} />
            <KpiBox label="Rotation" value={`${kpis.rotation}j`} />
            <KpiBox label="Immobilisé" value={formatCurrency(kpis.cashImmobilized)} small />
          </div>

          {/* ── Chart ── */}
          <div
            style={{
              background: "rgba(36,38,45,0.6)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 12,
              padding: "16px 8px 8px 0",
              marginBottom: 20,
            }}
          >
            <div style={{ fontSize: 11, color: "#919191", marginBottom: 8, paddingLeft: 16 }}>
              Profit cumulé
            </div>
            <ComposedChart
              width={398}
              height={160}
              data={chartData}
              margin={{ top: 4, right: 12, bottom: 0, left: 4 }}
            >
              <defs>
                <linearGradient id="exportGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={profitColor} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={profitColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.04)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 8, fill: "#666" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 8, fill: "#666" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}€`}
                width={40}
              />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="previous"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="projection"
                stroke={profitColor}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                strokeOpacity={0.4}
                dot={false}
                connectNulls
              />
              <Area
                type="monotone"
                dataKey="current"
                stroke={profitColor}
                strokeWidth={2}
                fill="url(#exportGradient)"
                dot={false}
                connectNulls
              />
            </ComposedChart>
          </div>

          {/* ── Footer ── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingTop: 8,
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt=""
              width={16}
              height={16}
              style={{ borderRadius: 4, opacity: 0.6 }}
            />
            <span style={{ fontSize: 10, color: "#666", letterSpacing: "0.08em" }}>
              PROXSTOCK
            </span>
            <span style={{ fontSize: 10, color: "#444" }}>·</span>
            <span style={{ fontSize: 10, color: "#555" }}>
              proxcop.com
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Small KPI box for export ── */
function KpiBox({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div
      style={{
        background: "rgba(36,38,45,0.6)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 10,
        padding: "10px 8px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 9, color: "#919191", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>
        {label}
      </div>
      <div style={{ fontSize: small ? 13 : 16, fontWeight: 700 }}>
        {value}
      </div>
    </div>
  );
}
