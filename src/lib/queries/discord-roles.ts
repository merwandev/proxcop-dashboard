"use server";

import { db } from "@/lib/db";
import { allowedDiscordRoles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function getAllowedDiscordRoles() {
  return db
    .select({
      id: allowedDiscordRoles.id,
      roleId: allowedDiscordRoles.roleId,
      roleName: allowedDiscordRoles.roleName,
      roleColor: allowedDiscordRoles.roleColor,
      createdAt: allowedDiscordRoles.createdAt,
    })
    .from(allowedDiscordRoles)
    .orderBy(allowedDiscordRoles.createdAt);
}

export async function getAllowedRoleIds(): Promise<string[]> {
  const roles = await db
    .select({ roleId: allowedDiscordRoles.roleId })
    .from(allowedDiscordRoles);
  return roles.map((r) => r.roleId);
}

export async function addAllowedDiscordRole(
  roleId: string,
  roleName: string,
  roleColor: string,
  addedBy: string
) {
  await db
    .insert(allowedDiscordRoles)
    .values({ roleId, roleName, roleColor, addedBy })
    .onConflictDoNothing();
}

export async function removeAllowedDiscordRole(roleId: string) {
  await db
    .delete(allowedDiscordRoles)
    .where(eq(allowedDiscordRoles.roleId, roleId));
}
