import { db } from "@/lib/db";
import { sales, productVariants, products, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function getAllSalesWithUsers(limit = 100) {
  const rows = await db
    .select({
      saleId: sales.id,
      salePrice: sales.salePrice,
      saleDate: sales.saleDate,
      platform: sales.platform,
      platformFee: sales.platformFee,
      shippingCost: sales.shippingCost,
      otherFees: sales.otherFees,
      createdAt: sales.createdAt,
      variantId: sales.variantId,
      purchasePrice: productVariants.purchasePrice,
      sizeVariant: productVariants.sizeVariant,
      productName: products.name,
      productSku: products.sku,
      productImageUrl: products.imageUrl,
      userId: users.id,
      discordUsername: users.discordUsername,
      discordAvatar: users.discordAvatar,
      discordId: users.discordId,
    })
    .from(sales)
    .innerJoin(productVariants, eq(sales.variantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id))
    .innerJoin(users, eq(sales.userId, users.id))
    .orderBy(desc(sales.createdAt))
    .limit(limit);

  return rows;
}
