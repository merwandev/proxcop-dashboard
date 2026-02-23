import { db } from "@/lib/db";
import { calendarEvents, productVariants, products } from "@/lib/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: "drop" | "ship" | "return" | "custom";
  color: string | null;
  notes: string | null;
  variantId: string | null;
  isAuto?: boolean; // For auto-generated return deadlines
}

/**
 * Get calendar events for a user within a date range.
 * Includes manual events + auto-generated return deadlines from variants.
 */
export async function getCalendarEvents(
  userId: string,
  startDate: string,
  endDate: string
): Promise<CalendarEvent[]> {
  // 1. Manual events
  const manualEvents = await db
    .select({
      id: calendarEvents.id,
      title: calendarEvents.title,
      date: calendarEvents.date,
      type: calendarEvents.type,
      color: calendarEvents.color,
      notes: calendarEvents.notes,
      variantId: calendarEvents.variantId,
    })
    .from(calendarEvents)
    .where(
      and(
        eq(calendarEvents.userId, userId),
        gte(calendarEvents.date, startDate),
        lte(calendarEvents.date, endDate)
      )
    );

  const result: CalendarEvent[] = manualEvents.map((e) => ({
    ...e,
    type: e.type as CalendarEvent["type"],
    isAuto: false,
  }));

  // 2. Auto return deadlines from variants in stock
  const returnDeadlines = await db
    .select({
      variantId: productVariants.id,
      returnDeadline: productVariants.returnDeadline,
      sizeVariant: productVariants.sizeVariant,
      productName: products.name,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(
      and(
        eq(productVariants.userId, userId),
        sql`${productVariants.returnDeadline} IS NOT NULL`,
        gte(productVariants.returnDeadline, startDate),
        lte(productVariants.returnDeadline, endDate),
        sql`${productVariants.status} NOT IN ('vendu', 'expedie')`
      )
    );

  for (const rd of returnDeadlines) {
    if (!rd.returnDeadline) continue;
    result.push({
      id: `auto-return-${rd.variantId}`,
      title: `Retour: ${rd.productName}${rd.sizeVariant ? ` (${rd.sizeVariant})` : ""}`,
      date: rd.returnDeadline,
      type: "return",
      color: null,
      notes: null,
      variantId: rd.variantId,
      isAuto: true,
    });
  }

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

export async function createCalendarEvent(data: {
  userId: string;
  title: string;
  date: string;
  type: "drop" | "ship" | "return" | "custom";
  color?: string;
  notes?: string;
  variantId?: string;
}) {
  const [row] = await db
    .insert(calendarEvents)
    .values({
      userId: data.userId,
      title: data.title,
      date: data.date,
      type: data.type,
      color: data.color || null,
      notes: data.notes || null,
      variantId: data.variantId || null,
    })
    .returning();

  return row;
}

export async function deleteCalendarEvent(eventId: string, userId: string) {
  await db
    .delete(calendarEvents)
    .where(and(eq(calendarEvents.id, eventId), eq(calendarEvents.userId, userId)));
}
