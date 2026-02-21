import { Badge } from "@/components/ui/badge";
import { STATUSES } from "@/lib/utils/constants";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const statusInfo = STATUSES.find((s) => s.value === status);
  if (!statusInfo) return null;

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] font-medium border-0",
        status === "en_stock" && "bg-blue-500/20 text-blue-400",
        status === "liste" && "bg-purple-500/20 text-purple-400",
        status === "reserve" && "bg-yellow-500/20 text-yellow-400",
        status === "vendu" && "bg-success/20 text-success",
        status === "en_litige" && "bg-danger/20 text-danger",
        status === "return_waiting_rf" && "bg-warning/20 text-warning",
        status === "hold" && "bg-muted text-muted-foreground"
      )}
    >
      {statusInfo.label}
    </Badge>
  );
}
