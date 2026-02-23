"use client";

import { useState, useTransition, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Plus, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { AddEventDialog } from "./add-event-dialog";
import { deleteCalendarEventAction } from "@/lib/actions/calendar-actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface CalendarEventItem {
  id: string;
  title: string;
  date: string;
  type: "drop" | "ship" | "return" | "custom";
  color: string | null;
  notes: string | null;
  isAuto: boolean;
  isAdminEvent: boolean;
}

interface CalendarViewProps {
  initialEvents: CalendarEventItem[];
  initialYear: number;
  initialMonth: number;
}

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS_FR = [
  "Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre",
];

const EVENT_COLORS: Record<string, string> = {
  drop: "bg-purple-500",
  ship: "bg-cyan-500",
  return: "bg-warning",
  custom: "bg-primary",
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  // Monday = 0, Sunday = 6
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export function CalendarView({ initialEvents, initialYear, initialMonth }: CalendarViewProps) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [events, setEvents] = useState(initialEvents);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addDate, setAddDate] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const today = new Date().toISOString().split("T")[0];

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);

  // Previous month days to fill the grid
  const prevMonthDays = getDaysInMonth(year, month - 1);
  const prevDays = Array.from({ length: firstDay }, (_, i) => ({
    day: prevMonthDays - firstDay + i + 1,
    date: new Date(year, month - 1, prevMonthDays - firstDay + i + 1).toISOString().split("T")[0],
    isCurrentMonth: false,
  }));

  // Current month days
  const currentDays = Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    date: new Date(year, month, i + 1).toISOString().split("T")[0],
    isCurrentMonth: true,
  }));

  // Next month days to fill the grid
  const totalCells = prevDays.length + currentDays.length;
  const nextDaysCount = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  const nextDays = Array.from({ length: nextDaysCount }, (_, i) => ({
    day: i + 1,
    date: new Date(year, month + 1, i + 1).toISOString().split("T")[0],
    isCurrentMonth: false,
  }));

  const allDays = [...prevDays, ...currentDays, ...nextDays];

  // Group events by date
  const eventsByDate: Record<string, CalendarEventItem[]> = {};
  for (const event of events) {
    if (!eventsByDate[event.date]) eventsByDate[event.date] = [];
    eventsByDate[event.date].push(event);
  }

  const goToPrevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
  };

  const goToNextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
  };

  const goToToday = () => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth());
  };

  const handleDayClick = (date: string) => {
    const dayEvents = eventsByDate[date];
    if (dayEvents && dayEvents.length > 0) {
      setSelectedDay(date);
    } else {
      setAddDate(date);
      setShowAddDialog(true);
    }
  };

  const handleAddFromDay = () => {
    setShowAddDialog(true);
    setAddDate(selectedDay);
    setSelectedDay(null);
  };

  const handleEventAdded = useCallback((event: Omit<CalendarEventItem, "isAdminEvent">) => {
    setEvents((prev) => [...prev, { ...event, isAdminEvent: false }]);
    setShowAddDialog(false);
    setAddDate(null);
  }, []);

  const handleDeleteEvent = useCallback((eventId: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    startTransition(async () => {
      try {
        await deleteCalendarEventAction(eventId);
        toast.success("Evenement supprime");
      } catch {
        toast.error("Erreur");
      }
    });
  }, []);

  const dayEvents = selectedDay ? (eventsByDate[selectedDay] ?? []) : [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToPrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <button
            type="button"
            onClick={goToToday}
            className="text-base font-semibold hover:text-primary transition-colors px-2"
          >
            {MONTHS_FR[month]} {year}
          </button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => { setAddDate(null); setShowAddDialog(true); }}
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter
        </Button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-px">
        {DAYS_FR.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden">
        {allDays.map(({ day, date, isCurrentMonth }) => {
          const dayEvts = eventsByDate[date] ?? [];
          const isToday = date === today;

          return (
            <button
              key={date}
              type="button"
              onClick={() => handleDayClick(date)}
              className={cn(
                "bg-card p-1 min-h-[60px] lg:min-h-[80px] text-left transition-colors relative",
                !isCurrentMonth && "bg-card/50",
                "hover:bg-secondary/50"
              )}
            >
              <span
                className={cn(
                  "text-[11px] font-medium inline-flex items-center justify-center w-6 h-6 rounded-full",
                  isToday && "bg-primary text-primary-foreground",
                  !isCurrentMonth && "text-muted-foreground/40"
                )}
              >
                {day}
              </span>
              {dayEvts.length > 0 && (
                <div className="mt-0.5 space-y-0.5">
                  {dayEvts.slice(0, 2).map((evt) => (
                    <div
                      key={evt.id}
                      className={cn(
                        "text-[8px] lg:text-[9px] leading-tight truncate rounded px-1 py-0.5 text-white font-medium",
                        evt.color ? "" : EVENT_COLORS[evt.type] || "bg-primary",
                        evt.isAdminEvent && "ring-1 ring-purple-400/50"
                      )}
                      style={evt.color ? { backgroundColor: evt.color } : undefined}
                    >
                      {evt.isAdminEvent && "⚡ "}{evt.title}
                    </div>
                  ))}
                  {dayEvts.length > 2 && (
                    <p className="text-[8px] text-muted-foreground text-center">
                      +{dayEvts.length - 2}
                    </p>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 justify-center">
        {[
          { type: "drop", label: "Drop" },
          { type: "ship", label: "Envoi" },
          { type: "return", label: "Retour" },
          { type: "custom", label: "Custom" },
        ].map(({ type, label }) => (
          <div key={type} className="flex items-center gap-1">
            <div className={cn("w-2.5 h-2.5 rounded-sm", EVENT_COLORS[type])} />
            <span className="text-[10px] text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>

      {/* Add event dialog */}
      <AddEventDialog
        open={showAddDialog}
        onClose={() => { setShowAddDialog(false); setAddDate(null); }}
        onCreated={handleEventAdded}
        defaultDate={addDate}
      />

      {/* Day events detail */}
      <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {selectedDay && new Date(selectedDay + "T00:00:00").toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {dayEvents.map((evt) => (
              <div
                key={evt.id}
                className="flex items-start gap-2 p-2.5 rounded-lg bg-secondary"
              >
                <div
                  className={cn("w-2 h-2 rounded-full mt-1 flex-shrink-0", evt.color ? "" : EVENT_COLORS[evt.type])}
                  style={evt.color ? { backgroundColor: evt.color } : undefined}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium">{evt.title}</p>
                    {evt.isAdminEvent && (
                      <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-0 text-[9px] h-4 px-1 gap-0.5 flex-shrink-0">
                        <Shield className="h-2.5 w-2.5" />
                        Admin
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground capitalize">{evt.type}{evt.isAuto ? " (auto)" : ""}</p>
                  {evt.notes && (
                    <p className="text-xs text-muted-foreground mt-0.5">{evt.notes}</p>
                  )}
                </div>
                {!evt.isAuto && !evt.isAdminEvent && (
                  <button
                    type="button"
                    onClick={() => handleDeleteEvent(evt.id)}
                    disabled={isPending}
                    className="text-[10px] text-danger hover:underline flex-shrink-0"
                  >
                    Suppr
                  </button>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1 mt-2"
              onClick={handleAddFromDay}
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter un evenement
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
