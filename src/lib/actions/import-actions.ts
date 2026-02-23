"use server";

import { db } from "@/lib/db";
import { products, productVariants, sales } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq, and, sql, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getSkuImage, getCachedStockXProduct } from "@/lib/queries/sku-images";
import { searchBySkuStockX } from "@/lib/stockx/client";
import { upsertSkuImage } from "@/lib/queries/sku-images";

// Valid values for enums
const VALID_CATEGORIES = ["sneakers", "pokemon", "lego", "random"] as const;
const VALID_STATUSES = [
  "en_attente", "en_stock", "liste", "reserve", "expedie", "vendu",
  "en_litige", "return_waiting_rf", "hold", "reship", "consign",
] as const;
const VALID_PLATFORMS = [
  "stockx", "vinted", "ebay", "laced", "hypeboost", "alias", "discord", "other",
] as const;

type Category = (typeof VALID_CATEGORIES)[number];
type Status = (typeof VALID_STATUSES)[number];
type Platform = (typeof VALID_PLATFORMS)[number];

function parseDate(v: string): string | null {
  if (!v) return null;
  // Accept YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY
  const isoMatch = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const euMatch = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (euMatch) {
    const [, d, m, y] = euMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

function parseNumber(v: string): number | null {
  if (!v) return null;
  const n = Number(v.replace(",", ".").trim());
  return isNaN(n) ? null : n;
}

function normalizeCategory(v: string): Category {
  const lower = v.toLowerCase().trim();
  if ((VALID_CATEGORIES as readonly string[]).includes(lower)) return lower as Category;
  return "sneakers";
}

function normalizeStatus(v: string): Status {
  const lower = v.toLowerCase().trim().replace(/\s+/g, "_");
  if ((VALID_STATUSES as readonly string[]).includes(lower)) return lower as Status;
  return "en_stock";
}

function normalizePlatform(v: string): Platform | null {
  if (!v) return null;
  const lower = v.toLowerCase().trim();
  if ((VALID_PLATFORMS as readonly string[]).includes(lower)) return lower as Platform;
  return "other";
}

/** Treat "N/A", "n/a", "-", "none", "" etc. as null SKU */
const EMPTY_SKU_VALUES = new Set(["n/a", "na", "-", "none", "aucun", ""]);

function normalizeSku(v: string | undefined): string | null {
  if (!v) return null;
  const trimmed = v.trim();
  if (EMPTY_SKU_VALUES.has(trimmed.toLowerCase())) return null;
  return trimmed;
}

/**
 * Resolve image URL for a SKU using multiple fallback sources:
 * 1. sku_images cache (global)
 * 2. stockx_products_cache
 * 3. Any existing product in DB with the same SKU
 * 4. StockX API as last resort
 */
async function resolveImageForSku(sku: string): Promise<string | null> {
  const normalized = sku.trim().toUpperCase();

  // 1. Check sku_images global cache
  const cached = await getSkuImage(normalized);
  if (cached?.imageUrl && (cached.status === "found" || cached.status === "manual")) {
    return cached.imageUrl;
  }

  // 2. Check stockx_products_cache
  const cachedProduct = await getCachedStockXProduct(normalized);
  if (cachedProduct?.imageUrl) {
    return cachedProduct.imageUrl;
  }

  // 3. Check if any product in DB has this SKU with an image
  const dbFallback = await db
    .select({ imageUrl: products.imageUrl })
    .from(products)
    .where(and(
      eq(products.sku, sku),
      sql`${products.imageUrl} is not null`,
    ))
    .limit(1);
  if (dbFallback[0]?.imageUrl) {
    return dbFallback[0].imageUrl;
  }

  // 4. Try StockX API as last resort
  try {
    const stockxResult = await searchBySkuStockX(normalized);
    if (stockxResult?.imageUrl) {
      // Cache the result for future lookups
      await upsertSkuImage(normalized, stockxResult.imageUrl, "stockx", "found", stockxResult.productId);
      return stockxResult.imageUrl;
    }
    if (stockxResult) {
      // Cache not_found to avoid re-calling API
      await upsertSkuImage(normalized, null, "stockx", "not_found", stockxResult.productId);
    }
  } catch {
    // StockX API unavailable — skip silently
  }

  return null;
}

interface StockRow {
  Produit: string;
  SKU?: string;
  Categorie?: string;
  Taille?: string;
  "Prix Achat": string;
  "Date Achat": string;
  "Prix Cible"?: string;
  Statut?: string;
  "Lieu Stockage"?: string;
  "Date Retour"?: string;
  Fournisseur?: string;
  [key: string]: string | undefined;
}

interface SalesRow {
  Produit: string;
  SKU?: string;
  Categorie?: string;
  Taille?: string;
  "Prix Achat": string;
  "Date Achat": string;
  "Prix Vente": string;
  "Date Vente": string;
  Plateforme?: string;
  Commission?: string;
  "Frais Envoi"?: string;
  "Autres Frais"?: string;
  [key: string]: string | undefined;
}

export async function importStockFromCSV(rows: StockRow[]) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifie");

  if (rows.length === 0) throw new Error("Fichier vide");
  if (rows.length > 500) throw new Error("Maximum 500 lignes");

  const errors: string[] = [];
  let imported = 0;

  // Group rows by product name+sku to create parent products efficiently
  // Products with a SKU are grouped by SKU, products without SKU are grouped by exact name
  const grouped = new Map<string, StockRow[]>();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = row.Produit?.trim();
    const price = parseNumber(row["Prix Achat"] ?? "");
    const date = parseDate(row["Date Achat"] ?? "");

    if (!name) {
      errors.push(`Ligne ${i + 2}: Nom du produit manquant`);
      continue;
    }
    if (price === null || price < 0) {
      errors.push(`Ligne ${i + 2}: Prix d'achat invalide`);
      continue;
    }
    if (!date) {
      errors.push(`Ligne ${i + 2}: Date d'achat invalide`);
      continue;
    }

    const sku = normalizeSku(row.SKU);
    // Products with same SKU are grouped together; products without SKU are grouped by exact name
    const key = sku ? `sku:${sku.toUpperCase()}` : `name:${name}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(row);
  }

  // Track product IDs that need image resolution (sku → productId)
  const productsNeedingImages: Array<{ productId: string; sku: string }> = [];

  for (const [, groupRows] of grouped) {
    const firstRow = groupRows[0];
    const name = firstRow.Produit!.trim();
    const sku = normalizeSku(firstRow.SKU);
    const category = normalizeCategory(firstRow.Categorie ?? "sneakers");

    try {
      // Check if product already exists for this user with same name+sku
      let productId: string;

      const existingProducts = await db
        .select({ id: products.id, imageUrl: products.imageUrl })
        .from(products)
        .where(
          sku
            ? and(eq(products.userId, session.user.id), eq(products.sku, sku))
            : and(eq(products.userId, session.user.id), eq(products.name, name), sql`${products.sku} is null`)
        )
        .limit(1);

      if (existingProducts.length > 0) {
        productId = existingProducts[0].id;
        // If existing product has no image and has a SKU, queue for image resolution
        if (!existingProducts[0].imageUrl && sku) {
          productsNeedingImages.push({ productId, sku });
        }
      } else {
        const [parent] = await db
          .insert(products)
          .values({
            userId: session.user.id,
            name,
            sku: sku || null,
            category,
          })
          .returning({ id: products.id });
        productId = parent.id;

        // New product without image — queue for image resolution if it has a SKU
        if (sku) {
          productsNeedingImages.push({ productId, sku });
        }
      }

      // Insert variants
      const variantRows = groupRows.map((row) => ({
        productId,
        userId: session.user.id,
        sizeVariant: row.Taille?.trim() || null,
        purchasePrice: parseNumber(row["Prix Achat"] ?? "0")!.toString(),
        purchaseDate: parseDate(row["Date Achat"] ?? "")!,
        targetPrice: parseNumber(row["Prix Cible"] ?? "")?.toString() ?? null,
        status: normalizeStatus(row.Statut ?? "en_stock"),
        storageLocation: row["Lieu Stockage"]?.trim() || null,
        returnDeadline: parseDate(row["Date Retour"] ?? "") || null,
        supplierName: row.Fournisseur?.trim() || null,
      }));

      await db.insert(productVariants).values(variantRows);
      imported += groupRows.length;
    } catch (e) {
      errors.push(`Erreur pour "${name}": ${(e as Error).message}`);
    }
  }

  // Post-import: resolve images for all products that need them
  // Deduplicate by SKU to avoid calling StockX API multiple times for the same SKU
  const skuToProductIds = new Map<string, string[]>();
  for (const { productId, sku } of productsNeedingImages) {
    const upper = sku.toUpperCase();
    if (!skuToProductIds.has(upper)) skuToProductIds.set(upper, []);
    skuToProductIds.get(upper)!.push(productId);
  }

  for (const [sku, productIds] of skuToProductIds) {
    try {
      const imageUrl = await resolveImageForSku(sku);
      if (imageUrl) {
        await db
          .update(products)
          .set({ imageUrl })
          .where(inArray(products.id, productIds));
      }
    } catch {
      // Image resolution failure is non-critical — products are imported, just without images
    }
  }

  revalidatePath("/stock");
  revalidatePath("/dashboard");
  revalidatePath("/stats");

  return { imported, errors };
}

export async function importSalesFromCSV(rows: SalesRow[]) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Non authentifie");

  if (rows.length === 0) throw new Error("Fichier vide");
  if (rows.length > 500) throw new Error("Maximum 500 lignes");

  const errors: string[] = [];
  let imported = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const name = row.Produit?.trim();
    const purchasePrice = parseNumber(row["Prix Achat"] ?? "");
    const purchaseDate = parseDate(row["Date Achat"] ?? "");
    const salePrice = parseNumber(row["Prix Vente"] ?? "");
    const saleDate = parseDate(row["Date Vente"] ?? "");

    if (!name) {
      errors.push(`Ligne ${i + 2}: Nom du produit manquant`);
      continue;
    }
    if (purchasePrice === null || purchasePrice < 0) {
      errors.push(`Ligne ${i + 2}: Prix d'achat invalide`);
      continue;
    }
    if (!purchaseDate) {
      errors.push(`Ligne ${i + 2}: Date d'achat invalide`);
      continue;
    }
    if (salePrice === null || salePrice < 0) {
      errors.push(`Ligne ${i + 2}: Prix de vente invalide`);
      continue;
    }
    if (!saleDate) {
      errors.push(`Ligne ${i + 2}: Date de vente invalide`);
      continue;
    }

    try {
      const sku = normalizeSku(row.SKU);
      const category = normalizeCategory(row.Categorie ?? "sneakers");
      const size = row.Taille?.trim() || null;

      // Resolve image for the SKU
      const imageUrl = sku ? await resolveImageForSku(sku) : null;

      // Create parent product
      const [parent] = await db
        .insert(products)
        .values({
          userId: session.user.id,
          name,
          sku,
          imageUrl,
          category,
        })
        .returning({ id: products.id });

      // Create variant with status vendu
      const [variant] = await db
        .insert(productVariants)
        .values({
          productId: parent.id,
          userId: session.user.id,
          sizeVariant: size,
          purchasePrice: purchasePrice.toString(),
          purchaseDate,
          status: "vendu",
        })
        .returning({ id: productVariants.id });

      // Create sale
      await db.insert(sales).values({
        variantId: variant.id,
        userId: session.user.id,
        salePrice: salePrice.toString(),
        saleDate,
        platform: normalizePlatform(row.Plateforme ?? ""),
        platformFee: (parseNumber(row.Commission ?? "") ?? 0).toString(),
        shippingCost: (parseNumber(row["Frais Envoi"] ?? "") ?? 0).toString(),
        otherFees: (parseNumber(row["Autres Frais"] ?? "") ?? 0).toString(),
      });

      imported++;
    } catch (e) {
      errors.push(`Ligne ${i + 2}: ${(e as Error).message}`);
    }
  }

  revalidatePath("/stock");
  revalidatePath("/ventes");
  revalidatePath("/dashboard");
  revalidatePath("/stats");

  return { imported, errors };
}
