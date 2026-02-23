"use server";

import { auth } from "@/lib/auth";
import { createCalendarEvent, deleteCalendarEvent } from "@/lib/queries/calendar";
import { revalidatePath } from "next/cache";

export async function createCalendarEventAction(data: {
  title: string;
  date: string;
  type: "drop" | "ship" | "return" | "custom";
  color?: string;
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifie");

  if (!data.title.trim()) throw new Error("Titre requis");
  if (!data.date) throw new Error("Date requise");

  const result = await createCalendarEvent({
    userId: session.user.id,
    title: data.title.trim(),
    date: data.date,
    type: data.type,
    color: data.color,
    notes: data.notes,
  });

  revalidatePath("/calendar");
  return result;
}

export async function deleteCalendarEventAction(eventId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifie");

  await deleteCalendarEvent(eventId, session.user.id);
  revalidatePath("/calendar");
}
