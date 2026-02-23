"use client";

import { useRouter } from "next/navigation";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { CommunityFeed } from "@/components/sales/community-feed";
import { MarketExplorer } from "./market-explorer";
import { DistributionCharts } from "./distribution-charts";
import { TopPerformers } from "./top-performers";
import { TrendingSection } from "./trending-section";
import { formatCurrency } from "@/lib/utils/format";
import { PLATFORMS } from "@/lib/utils/constants";
import { cn } from "@/lib/utils";

const PERIODS = [
  { value: "7j", label: "7j" },
  { value: "30j", label: "30j" },
  { value: "90j", label: "90j" },
] as const;

interface CommunityStats {
  totalSales: number;
  activeSellers: number;
  avgPrice: number;
  topPlatform: string | null;
}

interface TopROIItem {
  productName: string;
  sku: string | null;
  imageUrl: string | null;
  avgRoi: number;
  saleCount: number;
}

interface TopVolumeItem {
  productName: string;
  sku: string | null;
  imageUrl: string | null;
  saleCount: number;
  avgPrice: number;
}

interface TrendingItem {
  name: string;
  sku: string | null;
  imageUrl: string | null;
  addCount: number;
}

interface CommunitySale {
  saleId: string;
  productName: string;
  sku: string | null;
  imageUrl: string | null;
  sizeVariant: string | null;
  salePrice: string;
  platform: string | null;
  saleDate: string;
  category: string;
}

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

interface CommunityClientProps {
  period: string;
  daysBack: number;
  stats: CommunityStats;
  topROI: TopROIItem[];
  topVolume: TopVolumeItem[];
  trending: TrendingItem[];
  communitySales: CommunitySale[];
  platformDistribution: PlatformDist[];
  categoryBreakdown: CategoryBreakdown[];
}

export function CommunityClient({
  period,
  daysBack,
  stats,
  topROI,
  topVolume,
  trending,
  communitySales,
  platformDistribution,
  categoryBreakdown,
}: CommunityClientProps) {
  const router = useRouter();

  const topPlatformLabel = stats.topPlatform
    ? PLATFORMS.find((p) => p.value === stats.topPlatform)?.label ?? stats.topPlatform
    : "—";

  const handlePeriodChange = (p: string) => {
    if (p === "30j") {
      router.push("/community");
    } else {
      router.push(`/community?period=${p}`);
    }
  };

  return (
    <div className="py-4 space-y-4 lg:py-6 lg:space-y-6 pb-24 lg:pb-8">
      {/* Header + Period selector */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold lg:text-2xl">Communauté</h1>
        <div className="flex items-center gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => handlePeriodChange(p.value)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-lg font-medium transition-colors min-h-[32px]",
                period === p.value
                  ? "bg-accent text-accent-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Section 1 — KPIs globaux */}
      <div className="grid grid-cols-2 gap-2">
        <KpiCard
          label={`Ventes — ${daysBack}j`}
          value={String(stats.totalSales)}
        />
        <KpiCard
          label="Vendeurs actifs"
          value={String(stats.activeSellers)}
        />
        <KpiCard
          label="Prix moyen"
          value={formatCurrency(stats.avgPrice)}
        />
        <KpiCard
          label="Plateforme #1"
          value={topPlatformLabel}
        />
      </div>

      {/* Section 2 — Top Performers */}
      <TopPerformers topROI={topROI} topVolume={topVolume} daysBack={daysBack} />

      {/* Section 3 — Trending */}
      {trending.length > 0 && <TrendingSection trending={trending} daysBack={daysBack} />}

      {/* Section 4 — Market Explorer */}
      <MarketExplorer />

      {/* Section 5 — Distribution charts */}
      {(platformDistribution.length > 0 || categoryBreakdown.length > 0) && (
        <DistributionCharts
          platformDistribution={platformDistribution}
          categoryBreakdown={categoryBreakdown}
          daysBack={daysBack}
        />
      )}

      {/* Section 6 — Live Feed */}
      <div>
        <h2 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wider">
          Dernières ventes
        </h2>
        <CommunityFeed sales={communitySales} />
      </div>
    </div>
  );
}
