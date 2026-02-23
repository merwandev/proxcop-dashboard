"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Loader2, Users, Eye, ArrowUpRight, ExternalLink } from "lucide-react";

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

function KpiMini({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <Card className="p-3 gap-0 bg-card border-border">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-bold mt-1">{value}</p>
    </Card>
  );
}

function RankingList({ title, items, formatValue }: {
  title: string;
  items: { key: string; total: number }[];
  formatValue?: (item: { key: string; total: number }) => string;
}) {
  if (!items || items.length === 0) return null;
  const maxTotal = Math.max(...items.map((i) => i.total));

  return (
    <Card className="p-3 gap-0 bg-card border-border">
      <h4 className="text-xs font-semibold text-muted-foreground mb-2">{title}</h4>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={item.key || i} className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] font-medium truncate">{item.key || "(direct)"}</span>
                <span className="text-[11px] text-muted-foreground flex-shrink-0 ml-2">
                  {formatValue ? formatValue(item) : item.total}
                </span>
              </div>
              <div className="h-1 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary/40"
                  style={{ width: `${(item.total / maxTotal) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch("/api/admin/analytics");
        if (res.status === 503) {
          const body = await res.json();
          setError(body.message || "Analytics non configure");
          return;
        }
        if (!res.ok) {
          const body = await res.json();
          setError(body.message || "Erreur inconnue");
          return;
        }
        const json = await res.json();
        setData(json);
      } catch {
        setError("Impossible de charger les analytics");
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Chargement des analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-secondary p-6 text-center space-y-2">
        <p className="text-sm text-muted-foreground">{error}</p>
        <a
          href="https://vercel.com/docs/analytics/api"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Configurer les analytics Vercel
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {data.visitors != null && (
          <KpiMini icon={Users} label="Visiteurs (30j)" value={data.visitors.toLocaleString("fr-FR")} />
        )}
        {data.pageViews != null && (
          <KpiMini icon={Eye} label="Pages vues" value={data.pageViews.toLocaleString("fr-FR")} />
        )}
        {data.bounceRate != null && (
          <KpiMini icon={ArrowUpRight} label="Taux de rebond" value={`${Math.round(data.bounceRate * 100)}%`} />
        )}
      </div>

      {/* Rankings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <RankingList
          title="Pages"
          items={data.topPages ?? []}
          formatValue={(item) => `${item.total} vues`}
        />
        <RankingList
          title="Referrers"
          items={data.topReferrers ?? []}
        />
        <RankingList
          title="Pays"
          items={data.topCountries ?? []}
        />
        <RankingList
          title="Appareils"
          items={data.topDevices ?? []}
          formatValue={(item) => {
            const total = data.topDevices?.reduce((s, d) => s + d.total, 0) ?? 1;
            return `${Math.round((item.total / total) * 100)}%`;
          }}
        />
        <RankingList
          title="OS"
          items={data.topOS ?? []}
          formatValue={(item) => {
            const total = data.topOS?.reduce((s, d) => s + d.total, 0) ?? 1;
            return `${Math.round((item.total / total) * 100)}%`;
          }}
        />
        <RankingList
          title="Navigateurs"
          items={data.topBrowsers ?? []}
        />
      </div>
    </div>
  );
}
