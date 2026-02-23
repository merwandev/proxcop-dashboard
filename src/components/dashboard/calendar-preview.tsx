import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { formatDateShort } from "@/lib/utils/format";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface CalendarEventPreview {
  id: string;
  title: string;
  date: string;
  type: string;
  color: string | null;
  isAuto?: boolean;
}

interface CalendarPreviewWidgetProps {
  events: CalendarEventPreview[];
}

const TYPE_COLORS: Record<string, string> = {
  drop: "bg-purple-500",
  ship: "bg-cyan-500",
  return: "bg-warning",
  custom: "bg-primary",
};

const TYPE_LABELS: Record<string, string> = {
  drop: "Drop",
  ship: "Envoi",
  return: "Retour",
  custom: "Event",
};

export function CalendarPreviewWidget({ events }: CalendarPreviewWidgetProps) {
  const displayEvents = events.slice(0, 5);

  return (
    <Card className="p-4 lg:p-5 bg-card border-border h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          Calendrier
          {events.length > 0 && (
            <Badge variant="outline" className="bg-primary/20 text-primary border-0 text-[10px]">
              {events.length}
            </Badge>
          )}
        </h3>
        <Link href="/calendar" className="text-[10px] text-primary hover:underline">
          Voir tout
        </Link>
      </div>

      {displayEvents.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucun evenement a venir (7j)</p>
      ) : (
        <div className="space-y-2.5">
          {displayEvents.map((event) => (
            <div key={event.id} className="flex items-start gap-2.5">
              {/* Date column */}
              <div className="flex-shrink-0 w-12 text-center">
                <p className="text-[11px] font-medium leading-tight">
                  {formatDateShort(event.date)}
                </p>
              </div>

              {/* Type dot */}
              <div className="flex-shrink-0 mt-1.5">
                <div
                  className={cn(
                    "h-2 w-2 rounded-full",
                    event.color ? "" : TYPE_COLORS[event.type] ?? "bg-primary"
                  )}
                  style={event.color ? { backgroundColor: event.color } : undefined}
                />
              </div>

              {/* Event info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs leading-tight line-clamp-1">{event.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-muted-foreground">
                    {TYPE_LABELS[event.type] ?? event.type}
                  </span>
                  {event.isAuto && (
                    <span className="text-[9px] text-muted-foreground/60">auto</span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {events.length > 5 && (
            <p className="text-[10px] text-muted-foreground text-center pt-1">
              +{events.length - 5} autre{events.length - 5 > 1 ? "s" : ""}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
