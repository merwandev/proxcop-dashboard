"use client";

import { KpiCard } from "@/components/dashboard/kpi-card";
import { CommunityFeed } from "@/components/sales/community-feed";
import { MarketExplorer } from "./market-explorer";
import { DistributionCharts } from "./distribution-charts";
import { TopPerformers } from "./top-performers";
import { TrendingSection } from "./trending-section";
import { formatCurrency } from "@/lib/utils/format";
import { PLATFORMS } from "@/lib/utils/constants";
import { Users } from "lucide-react";

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
  stats: CommunityStats;
  topROI: TopROIItem[];
  topVolume: TopVolumeItem[];
  trending: TrendingItem[];
  communitySales: CommunitySale[];
  platformDistribution: PlatformDist[];
  categoryBreakdown: CategoryBreakdown[];
}

export function CommunityClient({
  stats,
  topROI,
  topVolume,
  trending,
  communitySales,
  platformDistribution,
  categoryBreakdown,
}: CommunityClientProps) {
  const topPlatformLabel = stats.topPlatform
    ? PLATFORMS.find((p) => p.value === stats.topPlatform)?.label ?? stats.topPlatform
    : "—";

  return (
    <div className="space-y-6 pb-24 lg:pb-8">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold">Communauté</h1>
      </div>

      {/* Section 1 — KPIs globaux */}
      <div className="grid grid-cols-2 gap-2">
        <KpiCard
          label="Ventes — 30j"
          value={String(stats.totalSales)}
          sub="communauté"
        />
        <KpiCard
          label="Vendeurs actifs"
          value={String(stats.activeSellers)}
          sub="30 derniers jours"
        />
        <KpiCard
          label="Prix moyen"
          value={formatCurrency(stats.avgPrice)}
          sub="de vente"
        />
        <KpiCard
          label="Plateforme #1"
          value={topPlatformLabel}
          sub="plus utilisée"
        />
      </div>

      {/* Section 2 — Top Performers */}
      <TopPerformers topROI={topROI} topVolume={topVolume} />

      {/* Section 3 — Trending */}
      {trending.length > 0 && <TrendingSection trending={trending} />}

      {/* Section 4 — Market Explorer */}
      <MarketExplorer />

      {/* Section 5 — Distribution charts */}
      {(platformDistribution.length > 0 || categoryBreakdown.length > 0) && (
        <DistributionCharts
          platformDistribution={platformDistribution}
          categoryBreakdown={categoryBreakdown}
        />
      )}

      {/* Section 6 — Live Feed */}
      <div>
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
          Dernières ventes
        </h2>
        <CommunityFeed sales={communitySales} />
      </div>
    </div>
  );
}
