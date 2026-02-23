import { requireStaff } from "@/lib/auth-utils";
import { NextResponse } from "next/server";

const VERCEL_API_TOKEN = process.env.VERCEL_API_TOKEN;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;
// Vercel auto-injects VERCEL_PROJECT_ID on deployments
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;

interface AnalyticsData {
  visitors?: number;
  pageViews?: number;
  bounceRate?: number;
  topPages?: { key: string; total: number }[];
  topReferrers?: { key: string; total: number }[];
  topCountries?: { key: string; total: number }[];
  topDevices?: { key: string; total: number }[];
  topOS?: { key: string; total: number }[];
  topBrowsers?: { key: string; total: number }[];
}

async function fetchVercelAnalytics(
  endpoint: string,
  params: Record<string, string>
): Promise<unknown> {
  const url = new URL(`https://vercel.com/api/web/insights/${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  if (VERCEL_TEAM_ID) {
    url.searchParams.set("teamId", VERCEL_TEAM_ID);
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${VERCEL_API_TOKEN}`,
    },
    next: { revalidate: 300 }, // cache 5 minutes
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vercel API ${res.status}: ${text}`);
  }

  return res.json();
}

/**
 * GET /api/admin/analytics
 * Fetches Vercel Web Analytics data for the admin dashboard.
 */
export async function GET() {
  const authResult = await requireStaff();
  if (authResult instanceof NextResponse) return authResult;

  if (!VERCEL_API_TOKEN || !VERCEL_PROJECT_ID) {
    return NextResponse.json(
      {
        error: "Analytics non configure",
        message: "Ajoutez VERCEL_API_TOKEN et VERCEL_PROJECT_ID dans vos variables d'environnement.",
      },
      { status: 503 }
    );
  }

  const now = new Date();
  const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const to = now.toISOString();

  const baseParams = {
    projectId: VERCEL_PROJECT_ID,
    from,
    to,
    environment: "production",
  };

  try {
    // Fetch all analytics data in parallel
    const [statsData, pagesData, referrersData, countriesData, devicesData, osData, browsersData] =
      await Promise.all([
        fetchVercelAnalytics("stats", baseParams) as Promise<{
          data?: { visitors?: number; pageViews?: number; bounceRate?: number };
        }>,
        fetchVercelAnalytics("stats", { ...baseParams, groupBy: "path", limit: "10" }) as Promise<{
          data?: { key: string; total: number }[];
        }>,
        fetchVercelAnalytics("stats", { ...baseParams, groupBy: "referrer", limit: "10" }) as Promise<{
          data?: { key: string; total: number }[];
        }>,
        fetchVercelAnalytics("stats", { ...baseParams, groupBy: "country", limit: "10" }) as Promise<{
          data?: { key: string; total: number }[];
        }>,
        fetchVercelAnalytics("stats", {
          ...baseParams,
          groupBy: "device",
          limit: "5",
        }) as Promise<{ data?: { key: string; total: number }[] }>,
        fetchVercelAnalytics("stats", {
          ...baseParams,
          groupBy: "os",
          limit: "5",
        }) as Promise<{ data?: { key: string; total: number }[] }>,
        fetchVercelAnalytics("stats", {
          ...baseParams,
          groupBy: "browser",
          limit: "5",
        }) as Promise<{ data?: { key: string; total: number }[] }>,
      ]);

    const result: AnalyticsData = {
      visitors: (statsData as { data?: { visitors?: number } })?.data?.visitors,
      pageViews: (statsData as { data?: { pageViews?: number } })?.data?.pageViews,
      bounceRate: (statsData as { data?: { bounceRate?: number } })?.data?.bounceRate,
      topPages: Array.isArray(pagesData?.data) ? pagesData.data : [],
      topReferrers: Array.isArray(referrersData?.data) ? referrersData.data : [],
      topCountries: Array.isArray(countriesData?.data) ? countriesData.data : [],
      topDevices: Array.isArray(devicesData?.data) ? devicesData.data : [],
      topOS: Array.isArray(osData?.data) ? osData.data : [],
      topBrowsers: Array.isArray(browsersData?.data) ? browsersData.data : [],
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("Vercel analytics fetch error:", err);
    return NextResponse.json(
      {
        error: "Erreur lors de la recuperation des analytics",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
