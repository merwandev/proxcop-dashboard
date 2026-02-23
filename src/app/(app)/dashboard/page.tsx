import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDashboardKPIs, getProfitChartData, getPendingDeals, getExpensesChartData, getStatusBreakdown } from "@/lib/queries/dashboard";
import { getDashboardLayout, getTaxSettings } from "@/lib/queries/user-preferences";
import { getCalendarEvents } from "@/lib/queries/calendar";
import { getInboxMessages } from "@/lib/queries/messages";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ChartExport } from "@/components/dashboard/chart-export";
import { PeriodSelector } from "@/components/dashboard/period-selector";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardWidgets } from "@/components/dashboard/dashboard-widgets";
import { formatCurrency } from "@/lib/utils/format";

interface DashboardPageProps {
  searchParams: Promise<{ period?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const period = params.period ?? "30j";

  // Calendar: next 7 days
  const today = new Date().toISOString().split("T")[0];
  const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

  const [kpis, chartData, pendingDeals, expensesChartData, statusBreakdown, dashboardLayout, taxSettings, calendarEvents, inboxMessages] = await Promise.all([
    getDashboardKPIs(session.user.id, period),
    getProfitChartData(session.user.id, period),
    getPendingDeals(session.user.id),
    getExpensesChartData(session.user.id, period),
    getStatusBreakdown(session.user.id),
    getDashboardLayout(session.user.id),
    getTaxSettings(session.user.id),
    getCalendarEvents(session.user.id, today, in7Days),
    getInboxMessages(session.user.id),
  ]);

  // Apply AE cotisations if enabled
  const taxRate = taxSettings.tvaEnabled ? taxSettings.tvaRate / 100 : 0;
  const cotisations = kpis.revenue * taxRate;
  const cotisationsPrev = kpis.revenuePrev * taxRate;
  const profitAfterTax = kpis.profit - cotisations;
  const profitPrevAfterTax = kpis.profitPrev - cotisationsPrev;

  // Period label for display
  const periodLabel = period === "ytd"
    ? "YTD"
    : period.includes("_")
      ? (() => {
          const [from, to] = period.split("_");
          const d = Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1;
          return `${d}j`;
        })()
      : "30j";

  return (
    <div className="py-4 space-y-4 lg:py-6 lg:space-y-6">
      {/* Header with greeting, clock, weather + export */}
      <div className="flex items-center justify-between gap-3">
        <DashboardHeader
          userName={session.user.discordUsername ?? session.user.name ?? ""}
          avatarUrl={session.user.image}
        />
        <ChartExport
          kpis={kpis}
          chartData={chartData}
          periodLabel={periodLabel}
          userName={session.user.discordUsername ?? session.user.name ?? undefined}
          taxRate={taxRate}
        />
      </div>

      {/* Period selector */}
      <Suspense fallback={<div className="h-8" />}>
        <PeriodSelector />
      </Suspense>

      {/* KPIs — 2 cols mobile, 5 cols desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 lg:gap-3">
        <KpiCard
          label={`CA (${periodLabel})`}
          value={formatCurrency(kpis.revenue)}
          sub={kpis.revenuePrev > 0 ? `Prec: ${formatCurrency(kpis.revenuePrev)}` : undefined}
        />
        <KpiCard
          label={`Profit net (${periodLabel})`}
          value={formatCurrency(profitAfterTax)}
          trend={profitAfterTax >= 0 ? "up" : "down"}
          sub={
            taxSettings.tvaEnabled
              ? `Cotis: -${formatCurrency(cotisations)}${profitPrevAfterTax !== 0 ? ` | Prec: ${formatCurrency(profitPrevAfterTax)}` : ""}`
              : kpis.profitPrev !== 0 ? `Prec: ${formatCurrency(kpis.profitPrev)}` : undefined
          }
        />
        <KpiCard
          label="En stock"
          value={kpis.stock.count.toString()}
          sub={formatCurrency(kpis.stock.purchaseValue)}
        />
        <KpiCard
          label="Cash immobilise"
          value={formatCurrency(kpis.cashImmobilized)}
        />
        <KpiCard
          label="Rotation moy."
          value={`${kpis.rotation}j`}
          sub={`${kpis.salesCount} ventes`}
        />
      </div>

      {/* Customizable widgets area */}
      <DashboardWidgets
        activeWidgets={dashboardLayout.widgets}
        widgetSizes={dashboardLayout.sizes}
        periodLabel={periodLabel}
        chartData={chartData}
        expensesChartData={expensesChartData}
        statusBreakdown={statusBreakdown}
        pendingDeals={pendingDeals}
        kpis={{
          expenses: kpis.expenses,
          top5: kpis.top5,
          sleeping: kpis.sleeping,
        }}
        taxRate={taxRate}
        calendarEvents={calendarEvents.map((e) => ({
          id: e.id,
          title: e.title,
          date: e.date,
          type: e.type,
          color: e.color,
          isAuto: e.isAuto,
        }))}
        inboxMessages={inboxMessages.map((m) => ({
          id: m.id,
          subject: m.subject,
          body: m.body,
          read: m.read,
          createdAt: m.createdAt.toISOString(),
          fromUsername: m.fromUsername,
          fromAvatar: m.fromAvatar,
          fromDiscordId: m.fromDiscordId,
        }))}
      />
    </div>
  );
}
