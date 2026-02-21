import { Badge } from "@/components/ui/badge";
import { daysAgo, timeInStockColor } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

interface TimeBadgeProps {
  purchaseDate: string;
}

export function TimeBadge({ purchaseDate }: TimeBadgeProps) {
  const days = daysAgo(purchaseDate);
  const color = timeInStockColor(days);

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] font-medium border-0",
        color === "success" && "bg-success/20 text-success",
        color === "warning" && "bg-warning/20 text-warning",
        color === "danger" && "bg-danger/20 text-danger"
      )}
    >
      {days}j
    </Badge>
  );
}
