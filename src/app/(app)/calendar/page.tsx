import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCalendarEvents } from "@/lib/queries/calendar";
import { CalendarView } from "@/components/calendar/calendar-view";

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Fetch events for current month + buffer (prev/next month visible days)
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // Start from first day of previous month, end at last day of next month
  const startDate = new Date(year, month - 1, 1).toISOString().split("T")[0];
  const endDate = new Date(year, month + 2, 0).toISOString().split("T")[0];

  const events = await getCalendarEvents(session.user.id, startDate, endDate);

  const serialized = events.map((e) => ({
    id: e.id,
    title: e.title,
    date: e.date,
    type: e.type,
    color: e.color,
    notes: e.notes,
    isAuto: e.isAuto ?? false,
  }));

  return (
    <div className="py-4 space-y-4 lg:py-6 lg:space-y-6">
      <div>
        <h1 className="text-xl font-bold lg:text-2xl">Calendrier</h1>
        <p className="text-sm text-muted-foreground">
          Events, drops et dates de retour
        </p>
      </div>

      <CalendarView
        initialEvents={serialized}
        initialYear={year}
        initialMonth={month}
      />
    </div>
  );
}
