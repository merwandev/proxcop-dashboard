import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getCommunityStats,
  getCommunityPlatformDistribution,
  getCommunityCategoryBreakdown,
} from "@/lib/queries/community";
import { getCommunitySales, getCommunityTopROI, getCommunityTopVolume } from "@/lib/queries/sales";
import { getTrendingProducts } from "@/lib/queries/products";
import { CommunityClient } from "@/components/community/community-client";
import { isAdminRole } from "@/lib/auth-utils";

interface CommunityPageProps {
  searchParams: Promise<{ period?: string }>;
}

function parsePeriod(period: string): number {
  if (period === "7j") return 7;
  if (period === "30j") return 30;
  if (period === "90j") return 90;
  return 30;
}

export default async function CommunityPage({ searchParams }: CommunityPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const period = params.period ?? "30j";
  const daysBack = parsePeriod(period);
  const isAdmin = isAdminRole(session.user.role);

  const [
    stats,
    topROI,
    topVolume,
    trending,
    communitySales,
    platformDist,
    categoryBreakdown,
  ] = await Promise.all([
    getCommunityStats(daysBack),
    getCommunityTopROI(daysBack, 5),
    getCommunityTopVolume(daysBack, 5),
    getTrendingProducts(daysBack, 5),
    getCommunitySales(100, isAdmin),
    getCommunityPlatformDistribution(daysBack),
    getCommunityCategoryBreakdown(daysBack),
  ]);

  // Serialize dates for client component
  const serializedSales = communitySales.map((s) => ({
    ...s,
    salePrice: String(s.salePrice),
    saleDate: typeof s.saleDate === "string" ? s.saleDate : new Date(s.saleDate).toISOString(),
    isAnonymous: Boolean(s.isAnonymous),
  }));

  const serializedTrending = trending.map((t) => ({
    ...t,
    addCount: Number(t.addCount),
  }));

  return (
    <CommunityClient
      period={period}
      daysBack={daysBack}
      stats={stats}
      topROI={topROI}
      topVolume={topVolume}
      trending={serializedTrending}
      communitySales={serializedSales}
      platformDistribution={platformDist}
      categoryBreakdown={categoryBreakdown}
    />
  );
}
