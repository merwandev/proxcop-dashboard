import { db } from "@/lib/db";
import { adminLogs, users } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

/**
 * Log an admin action for audit trail.
 */
export async function logAdminAction(data: {
  adminId: string;
  action: string;
  target?: string;
  details?: string;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(adminLogs).values({
    adminId: data.adminId,
    action: data.action,
    target: data.target ?? null,
    details: data.details ?? null,
    metadata: data.metadata ?? null,
  });
}

/**
 * Get recent admin logs with admin user info.
 */
export async function getAdminLogs(limit = 200) {
  const rows = await db
    .select({
      id: adminLogs.id,
      action: adminLogs.action,
      target: adminLogs.target,
      details: adminLogs.details,
      metadata: adminLogs.metadata,
      createdAt: adminLogs.createdAt,
      adminUsername: users.discordUsername,
      adminAvatar: users.discordAvatar,
      adminDiscordId: users.discordId,
    })
    .from(adminLogs)
    .leftJoin(users, eq(adminLogs.adminId, users.id))
    .orderBy(desc(adminLogs.createdAt))
    .limit(limit);

  return rows;
}
