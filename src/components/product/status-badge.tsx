import { Badge } from "@/components/ui/badge";
import { STATUSES } from "@/lib/utils/constants";
import { cn } from "@/lib/utils";
import {
  Clock,
  Package,
  List,
  Bookmark,
  Truck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Pause,
  RefreshCw,
  Store,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const STATUS_CONFIG: Record<string, { icon: LucideIcon; className: string }> = {
  en_attente: { icon: Clock, className: "bg-orange-400/20 text-orange-400" },
  en_stock: { icon: Package, className: "bg-blue-500/20 text-blue-400" },
  liste: { icon: List, className: "bg-purple-500/20 text-purple-400" },
  reserve: { icon: Bookmark, className: "bg-yellow-500/20 text-yellow-400" },
  expedie: { icon: Truck, className: "bg-cyan-500/20 text-cyan-400" },
  vendu: { icon: CheckCircle2, className: "bg-success/20 text-success" },
  en_litige: { icon: AlertTriangle, className: "bg-danger/20 text-danger" },
  return_waiting_rf: { icon: RotateCcw, className: "bg-warning/20 text-warning" },
  hold: { icon: Pause, className: "bg-muted text-muted-foreground" },
  reship: { icon: RefreshCw, className: "bg-rose-500/20 text-rose-400" },
  consign: { icon: Store, className: "bg-teal-500/20 text-teal-400" },
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const statusInfo = STATUSES.find((s) => s.value === status);
  if (!statusInfo) return null;

  const config = STATUS_CONFIG[status];
  const Icon = config?.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] font-medium border-0 gap-1",
        config?.className
      )}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {statusInfo.label}
    </Badge>
  );
}
