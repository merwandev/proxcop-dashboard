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

/**
 * Vercel Web Analytics uses internal APIs that aren't fully documented.
 * We try multiple known endpoint patterns:
 * 1. api.vercel.com/v1/web-analytics (newer)
 * 2. vercel.com/api/web/insights (legacy dashboard API)
 */
const API_BASES = [
  "https://api.vercel.com/v1/web-analytics",
  "https://vercel.com/api/web/insights",
];

async function fetchVercelAnalytics(
  endpoint: string,
  params: Record<string, string>
): Promise<unknown> {
  let lastError: Error | null = null;

  for (const base of API_BASES) {
    const url = new URL(`${base}/${endpoint}`);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
    if (VERCEL_TEAM_ID) {
      url.searchParams.set("teamId", VERCEL_TEAM_ID);
    }

    try {
      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${VERCEL_API_TOKEN}`,
        },
        next: { revalidate: 300 }, // cache 5 minutes
      });

      if (res.ok) {
        return res.json();
      }

      // If 404, try next base URL
      if (res.status === 404) {
        lastError = new Error(`${base}: 404 Not Found`);
        continue;
      }

      const text = await res.text();
      lastError = new Error(`Vercel API ${res.status}: ${text}`);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error("All API endpoints failed");
}

/**
 * GET /api/admin/analytics
 * Fetches Vercel Web Analytics data for the admin dashboard.
 *
 * Note: Vercel Web Analytics doesn't have a fully public REST API.
 * This tries known internal endpoints. If none work, a helpful error is returned.
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
        fetchVercelAnalytics("stats", baseParams).catch(() => ({ data: {} })) as Promise<{
          data?: { visitors?: number; pageViews?: number; bounceRate?: number };
        }>,
        fetchVercelAnalytics("stats", { ...baseParams, groupBy: "path", limit: "10" }).catch(() => ({ data: [] })) as Promise<{
          data?: { key: string; total: number }[];
        }>,
        fetchVercelAnalytics("stats", { ...baseParams, groupBy: "referrer", limit: "10" }).catch(() => ({ data: [] })) as Promise<{
          data?: { key: string; total: number }[];
        }>,
        fetchVercelAnalytics("stats", { ...baseParams, groupBy: "country", limit: "10" }).catch(() => ({ data: [] })) as Promise<{
          data?: { key: string; total: number }[];
        }>,
        fetchVercelAnalytics("stats", {
          ...baseParams,
          groupBy: "device",
          limit: "5",
        }).catch(() => ({ data: [] })) as Promise<{ data?: { key: string; total: number }[] }>,
        fetchVercelAnalytics("stats", {
          ...baseParams,
          groupBy: "os",
          limit: "5",
        }).catch(() => ({ data: [] })) as Promise<{ data?: { key: string; total: number }[] }>,
        fetchVercelAnalytics("stats", {
          ...baseParams,
          groupBy: "browser",
          limit: "5",
        }).catch(() => ({ data: [] })) as Promise<{ data?: { key: string; total: number }[] }>,
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

    // If all data is empty, the API likely isn't accessible
    const hasAnyData =
      result.visitors != null ||
      result.pageViews != null ||
      (result.topPages && result.topPages.length > 0);

    if (!hasAnyData) {
      return NextResponse.json(
        {
          error: "Analytics non disponible",
          message:
            "L'API Vercel Web Analytics n'est pas accessible avec votre token. " +
            "Consultez les analytics directement sur le dashboard Vercel.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Vercel analytics fetch error:", err);
    return NextResponse.json(
      {
        error: "Analytics non disponible",
        message:
          "L'API Vercel Web Analytics n'a pas pu etre contactee. " +
          "Vercel ne propose pas encore d'API publique pour lire les analytics. " +
          "Consultez vos analytics sur vercel.com/analytics.",
      },
      { status: 503 }
    );
  }
}
