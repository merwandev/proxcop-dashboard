"use server";

import { db } from "@/lib/db";
import { appConfig } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Get a config value by key. Returns null if not found.
 */
export async function getConfigValue(key: string): Promise<string | null> {
  const result = await db
    .select({ value: appConfig.value })
    .from(appConfig)
    .where(eq(appConfig.key, key))
    .limit(1);

  return result[0]?.value ?? null;
}

/**
 * Set a config value (upsert).
 */
export async function setConfigValue(key: string, value: string): Promise<void> {
  await db
    .insert(appConfig)
    .values({ key, value })
    .onConflictDoUpdate({
      target: appConfig.key,
      set: { value, updatedAt: new Date() },
    });
}
