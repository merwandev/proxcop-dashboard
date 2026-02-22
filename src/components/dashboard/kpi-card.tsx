import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  trend?: "up" | "down" | "neutral";
}

export function KpiCard({ label, value, sub, trend }: KpiCardProps) {
  return (
    <Card className="p-3 gap-0 bg-card border-border">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <p
        className={cn(
          "text-lg font-bold mt-0.5",
          trend === "up" && "text-success",
          trend === "down" && "text-danger"
        )}
      >
        {value}
      </p>
      {sub && (
        <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
      )}
    </Card>
  );
}
