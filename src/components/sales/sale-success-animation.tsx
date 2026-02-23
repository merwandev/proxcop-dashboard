"use client";

import { useRef, useState, useEffect } from "react";
import { X, Share2, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { PLATFORMS } from "@/lib/utils/constants";
import { toast } from "sonner";

export interface SaleSuccessData {
  salePrice: number;
  purchasePrice: number;
  platformFee: number;
  shippingCost: number;
  otherFees: number;
  platform: string | null;
  saleDate: string;
  productName: string;
  productImage: string | null;
  productSku: string | null;
  sizeVariant: string | null;
  userName?: string;
}

interface SaleSuccessAnimationProps {
  data: SaleSuccessData;
  onClose: () => void;
}

/* ── Sparkle positions (pre-computed, deterministic) ── */
const SPARKLES = Array.from({ length: 14 }, (_, i) => ({
  left: `${10 + (i * 37 + 13) % 80}%`,
  top: `${5 + (i * 53 + 7) % 70}%`,
  delay: `${0.6 + i * 0.12}s`,
  size: 4 + (i % 3) * 3,
}));

export function SaleSuccessAnimation({ data, onClose }: SaleSuccessAnimationProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);
  const [actionsVisible, setActionsVisible] = useState(false);

  const fees = data.platformFee + data.shippingCost + data.otherFees;
  const profit = data.salePrice - data.purchasePrice - fees;
  const margin = data.salePrice > 0 ? (profit / data.salePrice) * 100 : 0;
  const profitColor = profit >= 0 ? "#4ADE80" : "#F87171";
  const platformLabel = PLATFORMS.find((p) => p.value === data.platform)?.label ?? data.platform;

  // Show action buttons after card animation completes
  useEffect(() => {
    const timer = setTimeout(() => setActionsVisible(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  // Lock scroll while overlay is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const generatePng = async (): Promise<Blob | null> => {
    const node = cardRef.current;
    if (!node) return null;

    const { toPng } = await import("html-to-image");
    const dataUrl = await toPng(node, {
      backgroundColor: "#18191E",
      pixelRatio: 2,
      width: 430,
      height: node.offsetHeight,
      style: { transform: "none", borderRadius: "0" },
    });

    const res = await fetch(dataUrl);
    return res.blob();
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const blob = await generatePng();
      if (!blob) return;

      const file = new File([blob], `proxstock-sale-${data.saleDate}.png`, { type: "image/png" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "ProxStock",
          text: `${profit >= 0 ? "+" : ""}${formatCurrency(profit)} de profit !`,
        });
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `proxstock-sale-${data.saleDate}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Image telechargee !");
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        toast.error("Erreur lors du partage");
      }
    } finally {
      setSharing(false);
    }
  };

  const handleDownload = async () => {
    setSharing(true);
    try {
      const blob = await generatePng();
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `proxstock-sale-${data.saleDate}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Image telechargee !");
    } catch {
      toast.error("Erreur lors de l'export");
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center sale-overlay-in">
      {/* Background overlay */}
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />

      {/* Glow pulse behind the card */}
      <div
        className="absolute sale-glow-pulse pointer-events-none"
        style={{
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${profitColor}30 0%, transparent 70%)`,
        }}
      />

      {/* Light burst rays */}
      <div className="absolute sale-light-burst pointer-events-none" style={{ width: 500, height: 500 }}>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <div
            key={deg}
            className="absolute left-1/2 top-1/2"
            style={{
              width: 2,
              height: 200,
              background: `linear-gradient(to top, transparent, ${profitColor}40)`,
              transformOrigin: "bottom center",
              transform: `translate(-50%, -100%) rotate(${deg}deg)`,
            }}
          />
        ))}
      </div>

      {/* Sparkle particles */}
      {SPARKLES.map((s, i) => (
        <div
          key={i}
          className="absolute sale-sparkle pointer-events-none"
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            borderRadius: "50%",
            backgroundColor: i % 3 === 0 ? profitColor : "#C9CEEE",
            animationDelay: s.delay,
          }}
        />
      ))}

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 safe-area-top z-[102] p-2 text-white/60 hover:text-white transition-colors"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Main card container — animated reveal */}
      <div className="relative z-[101] sale-card-reveal w-full max-w-[430px] mx-4">
        {/* Export-ready card (same design as sale-export.tsx) */}
        <div
          ref={cardRef}
          style={{
            width: "100%",
            maxWidth: 430,
            fontFamily: "'Inter', 'Geist', -apple-system, BlinkMacSystemFont, sans-serif",
            background: "#18191E",
            color: "#fff",
            overflow: "hidden",
            borderRadius: 20,
            border: `1px solid ${profitColor}30`,
          }}
        >
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

            {/* Header with logo */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 24,
                position: "relative",
              }}
            >
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
                    {data.userName ? `@${data.userName}` : "Sale"} · {formatDate(data.saleDate)}
                  </div>
                </div>
              </div>
              {data.platform && (
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#C9CEEE",
                    background: "rgba(201,206,238,0.12)",
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: "1px solid rgba(201,206,238,0.2)",
                    textTransform: "capitalize",
                  }}
                >
                  {platformLabel}
                </div>
              )}
            </div>

            {/* Product card */}
            <div
              style={{
                background: "linear-gradient(135deg, rgba(201,206,238,0.08) 0%, rgba(201,206,238,0.03) 100%)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16,
                padding: 20,
                marginBottom: 16,
                position: "relative",
                overflow: "hidden",
              }}
            >
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
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                {data.productImage && (
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 12,
                      background: "#fff",
                      overflow: "hidden",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={data.productImage}
                      alt={data.productName}
                      width={64}
                      height={64}
                      style={{ objectFit: "contain" }}
                    />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.3, marginBottom: 4 }}>
                    {data.productName}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {data.sizeVariant && (
                      <span
                        style={{
                          fontSize: 11,
                          color: "#C9CEEE",
                          background: "rgba(201,206,238,0.12)",
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontWeight: 500,
                        }}
                      >
                        {data.sizeVariant}
                      </span>
                    )}
                    {data.productSku && (
                      <span style={{ fontSize: 10, color: "#919191", letterSpacing: "0.03em" }}>
                        {data.productSku}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Profit hero */}
            <div
              style={{
                background: "rgba(36,38,45,0.6)",
                border: `1px solid ${profitColor}20`,
                borderRadius: 12,
                padding: "16px 20px",
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    color: "#919191",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: 4,
                  }}
                >
                  Profit
                </div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: profitColor,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.1,
                  }}
                >
                  {profit >= 0 ? "+" : ""}
                  {formatCurrency(profit)}
                </div>
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: profitColor, opacity: 0.6 }}>
                {margin.toFixed(1)}%
              </div>
            </div>

            {/* KPI grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
              <KpiBox label="Achat" value={formatCurrency(data.purchasePrice)} />
              <KpiBox label="Vente" value={formatCurrency(data.salePrice)} />
              <KpiBox label="Frais" value={formatCurrency(fees)} />
            </div>

            {/* Footer */}
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
              <img src="/logo.png" alt="" width={16} height={16} style={{ borderRadius: 4, opacity: 0.6 }} />
              <span style={{ fontSize: 10, color: "#666", letterSpacing: "0.08em" }}>PROXSTOCK</span>
              <span style={{ fontSize: 10, color: "#444" }}>·</span>
              <span style={{ fontSize: 10, color: "#555" }}>proxcop.com</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div
          className={`flex gap-3 mt-4 transition-all duration-500 ${
            actionsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <Button
            onClick={handleShare}
            disabled={sharing}
            className="flex-1 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {sharing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Share2 className="h-4 w-4" />
            )}
            Partager
          </Button>
          <Button
            onClick={handleDownload}
            disabled={sharing}
            variant="outline"
            className="gap-2"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function KpiBox({ label, value }: { label: string; value: string }) {
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
      <div
        style={{
          fontSize: 9,
          color: "#919191",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: 3,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{value}</div>
    </div>
  );
}
