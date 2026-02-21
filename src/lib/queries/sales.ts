"use server";

import { db } from "@/lib/db";
import { sales, productVariants, products } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function getSalesByUser(userId: string) {
  return db
    .select({
      sale: sales,
      variant: productVariants,
      product: products,
    })
    .from(sales)
    .innerJoin(productVariants, eq(sales.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(eq(sales.userId, userId))
    .orderBy(desc(sales.saleDate));
}
