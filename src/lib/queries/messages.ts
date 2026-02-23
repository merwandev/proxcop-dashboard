import { db } from "@/lib/db";
import { messages, users } from "@/lib/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

const fromUser = alias(users, "from_user");

export async function getInboxMessages(userId: string) {
  const rows = await db
    .select({
      id: messages.id,
      subject: messages.subject,
      body: messages.body,
      read: messages.read,
      createdAt: messages.createdAt,
      fromUserId: messages.fromUserId,
      fromUsername: fromUser.discordUsername,
      fromAvatar: fromUser.discordAvatar,
      fromDiscordId: fromUser.discordId,
    })
    .from(messages)
    .leftJoin(fromUser, eq(messages.fromUserId, fromUser.id))
    .where(eq(messages.toUserId, userId))
    .orderBy(desc(messages.createdAt))
    .limit(100);

  return rows;
}

export async function getUnreadCount(userId: string): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messages)
    .where(and(eq(messages.toUserId, userId), eq(messages.read, false)));

  return result[0]?.count ?? 0;
}

export async function markAsRead(messageId: string, userId: string) {
  await db
    .update(messages)
    .set({ read: true })
    .where(and(eq(messages.id, messageId), eq(messages.toUserId, userId)));
}

export async function markAllAsRead(userId: string) {
  await db
    .update(messages)
    .set({ read: true })
    .where(and(eq(messages.toUserId, userId), eq(messages.read, false)));
}

export async function sendMessage(data: {
  fromUserId: string;
  toUserId: string;
  subject: string;
  body: string;
}) {
  const [row] = await db
    .insert(messages)
    .values({
      fromUserId: data.fromUserId,
      toUserId: data.toUserId,
      subject: data.subject,
      body: data.body,
    })
    .returning();

  return row;
}
