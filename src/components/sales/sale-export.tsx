"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { toast } from "sonner";
import { PLATFORMS } from "@/lib/utils/constants";

interface SaleExportProps {
  sale: {
    salePrice: string;
    saleDate: string;
    platform: string | null;
    platformFee: string | null;
    shippingCost: string | null;
    otherFees: string | null;
  };
  variant: {
    purchasePrice: string;
    sizeVariant: string | null;
  };
  product: {
    name: string;
    imageUrl: string | null;
    sku: string | null;
  };
  userName?: string;
}

export function SaleExport({ sale, variant, product, userName }: SaleExportProps) {
  const exportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const salePrice = Number(sale.salePrice);
  const purchasePrice = Number(variant.purchasePrice);
  const fees =
    Number(sale.platformFee ?? 0) +
    Number(sale.shippingCost ?? 0) +
    Number(sale.otherFees ?? 0);
  const profit = salePrice - purchasePrice - fees;
  const margin = salePrice > 0 ? (profit / salePrice) * 100 : 0;
  const profitColor = profit >= 0 ? "#4ADE80" : "#F87171";
  const platformLabel = PLATFORMS.find((p) => p.value === sale.platform)?.label ?? sale.platform;

  const handleExport = async () => {
    setExporting(true);
    try {
      const { toPng } = await import("html-to-image");
      const node = exportRef.current;
      if (!node) return;

      node.style.visibility = "visible";
      node.style.opacity = "1";

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

      node.style.visibility = "hidden";
      node.style.opacity = "0";

      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `proxstock-sale-${sale.saleDate}.png`;
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

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-1.5"
        onClick={handleExport}
        disabled={exporting}
      >
        {exporting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        Imprimer success
      </Button>

      {/* Hidden export container */}
      <div
        ref={exportRef}
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          width: 430,
          fontFamily:
            "'Inter', 'Geist', -apple-system, BlinkMacSystemFont, sans-serif",
          background: "#18191E",
          color: "#fff",
          overflow: "hidden",
          visibility: "hidden",
          zIndex: -9999,
          pointerEvents: "none",
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
              background:
                "radial-gradient(circle, rgba(201,206,238,0.15) 0%, transparent 70%)",
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
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                  }}
                >
                  ProxStock
                </div>
                <div style={{ fontSize: 11, color: "#919191", marginTop: 1 }}>
                  {userName ? `@${userName}` : "Sale"} ·{" "}
                  {formatDate(sale.saleDate)}
                </div>
              </div>
            </div>
            {sale.platform && (
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
              background:
                "linear-gradient(135deg, rgba(201,206,238,0.08) 0%, rgba(201,206,238,0.03) 100%)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              padding: 20,
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
                background:
                  "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
              }}
            />

            <div
              style={{
                display: "flex",
                gap: 16,
                alignItems: "center",
              }}
            >
              {/* Product image */}
              {product.imageUrl && (
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
                    src={product.imageUrl}
                    alt={product.name}
                    width={64}
                    height={64}
                    style={{ objectFit: "contain" }}
                  />
                </div>
              )}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    lineHeight: 1.3,
                    marginBottom: 4,
                  }}
                >
                  {product.name}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  {variant.sizeVariant && (
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
                      {variant.sizeVariant}
                    </span>
                  )}
                  {product.sku && (
                    <span
                      style={{
                        fontSize: 10,
                        color: "#919191",
                        letterSpacing: "0.03em",
                      }}
                    >
                      {product.sku}
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
              border: "1px solid rgba(255,255,255,0.06)",
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
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: profitColor,
                opacity: 0.6,
              }}
            >
              {margin.toFixed(1)}%
            </div>
          </div>

          {/* KPI grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 8,
              marginBottom: 20,
            }}
          >
            <KpiBox label="Achat" value={formatCurrency(purchasePrice)} />
            <KpiBox label="Vente" value={formatCurrency(salePrice)} />
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
            <img
              src="/logo.png"
              alt=""
              width={16}
              height={16}
              style={{ borderRadius: 4, opacity: 0.6 }}
            />
            <span
              style={{
                fontSize: 10,
                color: "#666",
                letterSpacing: "0.08em",
              }}
            >
              PROXSTOCK
            </span>
            <span style={{ fontSize: 10, color: "#444" }}>·</span>
            <span style={{ fontSize: 10, color: "#555" }}>proxcop.com</span>
          </div>
        </div>
      </div>
    </>
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
