import { db } from "@/lib/db";
import { adminProducts, users } from "@/lib/db/schema";
import { eq, desc, ilike, or } from "drizzle-orm";

export async function getAllAdminProducts() {
  const rows = await db
    .select({
      id: adminProducts.id,
      name: adminProducts.name,
      sku: adminProducts.sku,
      imageUrl: adminProducts.imageUrl,
      category: adminProducts.category,
      sizes: adminProducts.sizes,
      createdBy: adminProducts.createdBy,
      createdAt: adminProducts.createdAt,
      creatorUsername: users.discordUsername,
    })
    .from(adminProducts)
    .leftJoin(users, eq(adminProducts.createdBy, users.id))
    .orderBy(desc(adminProducts.createdAt));

  return rows;
}

export async function searchAdminProducts(query: string) {
  const pattern = `%${query}%`;
  const rows = await db
    .select({
      id: adminProducts.id,
      name: adminProducts.name,
      sku: adminProducts.sku,
      imageUrl: adminProducts.imageUrl,
      category: adminProducts.category,
      sizes: adminProducts.sizes,
    })
    .from(adminProducts)
    .where(
      or(
        ilike(adminProducts.name, pattern),
        ilike(adminProducts.sku, pattern)
      )
    )
    .orderBy(desc(adminProducts.createdAt))
    .limit(10);

  return rows;
}

export async function createAdminProduct(data: {
  name: string;
  sku?: string;
  imageUrl?: string;
  category: string;
  sizes?: string[];
  createdBy: string;
}) {
  const [row] = await db
    .insert(adminProducts)
    .values({
      name: data.name,
      sku: data.sku || null,
      imageUrl: data.imageUrl || null,
      category: data.category as "sneakers" | "pokemon" | "lego" | "random",
      sizes: data.sizes || [],
      createdBy: data.createdBy,
    })
    .returning();

  return row;
}

export async function updateAdminProduct(
  id: string,
  data: {
    name?: string;
    sku?: string;
    imageUrl?: string | null;
    category?: string;
    sizes?: string[];
  }
) {
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) updates.name = data.name;
  if (data.sku !== undefined) updates.sku = data.sku || null;
  if (data.imageUrl !== undefined) updates.imageUrl = data.imageUrl;
  if (data.category !== undefined) updates.category = data.category;
  if (data.sizes !== undefined) updates.sizes = data.sizes;

  const [row] = await db
    .update(adminProducts)
    .set(updates)
    .where(eq(adminProducts.id, id))
    .returning();

  return row;
}

export async function deleteAdminProduct(id: string) {
  await db.delete(adminProducts).where(eq(adminProducts.id, id));
}
