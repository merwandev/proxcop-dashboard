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

export default async function CommunityPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [
    stats,
    topROI,
    topVolume,
    trending,
    communitySales,
    platformDist,
    categoryBreakdown,
  ] = await Promise.all([
    getCommunityStats(),
    getCommunityTopROI(7, 5),
    getCommunityTopVolume(7, 5),
    getTrendingProducts(7, 5),
    getCommunitySales(100),
    getCommunityPlatformDistribution(30),
    getCommunityCategoryBreakdown(30),
  ]);

  // Serialize dates for client component
  const serializedSales = communitySales.map((s) => ({
    ...s,
    salePrice: String(s.salePrice),
    saleDate: typeof s.saleDate === "string" ? s.saleDate : new Date(s.saleDate).toISOString(),
  }));

  const serializedTrending = trending.map((t) => ({
    ...t,
    addCount: Number(t.addCount),
  }));

  return (
    <CommunityClient
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
