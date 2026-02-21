"use server";

import { db } from "@/lib/db";
import { sales, products } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function getSalesByUser(userId: string) {
  return db
    .select({
      sale: sales,
      product: products,
    })
    .from(sales)
    .innerJoin(products, eq(sales.productId, products.id))
    .where(eq(sales.userId, userId))
    .orderBy(desc(sales.saleDate));
}
