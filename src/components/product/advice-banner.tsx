import { AlertTriangle, Info, AlertOctagon } from "lucide-react";

interface AdviceBannerProps {
  title: string;
  message: string;
  severity: string;
  sku: string;
}

const severityConfig: Record<
  string,
  { icon: typeof AlertTriangle; bgClass: string; borderClass: string; textClass: string }
> = {
  info: {
    icon: Info,
    bgClass: "bg-blue-500/10",
    borderClass: "border-blue-500/20",
    textClass: "text-blue-400",
  },
  warning: {
    icon: AlertTriangle,
    bgClass: "bg-warning/10",
    borderClass: "border-warning/20",
    textClass: "text-warning",
  },
  critical: {
    icon: AlertOctagon,
    bgClass: "bg-danger/10",
    borderClass: "border-danger/20",
    textClass: "text-danger",
  },
};

export function AdviceBanner({ title, message, severity, sku }: AdviceBannerProps) {
  const config = severityConfig[severity] ?? severityConfig.warning;
  const Icon = config.icon;

  return (
    <div
      className={`rounded-xl border p-3 ${config.bgClass} ${config.borderClass}`}
    >
      <div className="flex gap-2.5">
        <Icon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${config.textClass}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`text-sm font-medium ${config.textClass}`}>
              {title}
            </p>
            <span className="text-[10px] font-mono text-muted-foreground">
              {sku}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{message}</p>
        </div>
      </div>
    </div>
  );
}
