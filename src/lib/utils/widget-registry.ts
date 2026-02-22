import {
  TrendingUp,
  Wallet,
  Clock,
  Receipt,
  Trophy,
  Moon,
  PieChart,
  BarChart3,
  LineChart,
  Target,
  Layers,
  type LucideIcon,
} from "lucide-react";

export interface WidgetDefinition {
  id: string;
  label: string;
  icon: LucideIcon;
  page: "dashboard" | "stats";
  defaultEnabled: boolean;
  /** Widget needs data — if the data is empty, widget won't render even if enabled */
  conditional?: boolean;
}

export const DASHBOARD_WIDGETS: WidgetDefinition[] = [
  { id: "profit-chart", label: "Profit cumule", icon: TrendingUp, page: "dashboard", defaultEnabled: true },
  { id: "expenses-chart", label: "Depenses cumulees", icon: Wallet, page: "dashboard", defaultEnabled: false },
  { id: "status-breakdown", label: "Repartition statuts", icon: PieChart, page: "dashboard", defaultEnabled: false },
  { id: "pending-deals", label: "Deals en attente", icon: Clock, page: "dashboard", defaultEnabled: true, conditional: true },
  { id: "expenses-summary", label: "Depenses", icon: Receipt, page: "dashboard", defaultEnabled: true, conditional: true },
  { id: "top5", label: "Top 5 rentables", icon: Trophy, page: "dashboard", defaultEnabled: true, conditional: true },
  { id: "sleeping", label: "Produits dormants", icon: Moon, page: "dashboard", defaultEnabled: true, conditional: true },
];

export const STATS_WIDGETS: WidgetDefinition[] = [
  { id: "category-funnel", label: "Profit par categorie", icon: Layers, page: "stats", defaultEnabled: true },
  { id: "stock-evolution", label: "Evolution du stock", icon: LineChart, page: "stats", defaultEnabled: true },
  { id: "platform-roi", label: "ROI par plateforme", icon: BarChart3, page: "stats", defaultEnabled: true },
  { id: "margin-distribution", label: "Distribution marges", icon: Target, page: "stats", defaultEnabled: true },
];

export const DEFAULT_DASHBOARD_WIDGETS = DASHBOARD_WIDGETS
  .filter((w) => w.defaultEnabled)
  .map((w) => w.id);

export const DEFAULT_STATS_WIDGETS = STATS_WIDGETS
  .filter((w) => w.defaultEnabled)
  .map((w) => w.id);

export function getWidgetById(id: string): WidgetDefinition | undefined {
  return [...DASHBOARD_WIDGETS, ...STATS_WIDGETS].find((w) => w.id === id);
}
