"use server";

import { getSalesBySku, getMedianSalePricesBatch, getOverallMedianSalePrice } from "@/lib/queries/sales";

/**
 * Lookup market data for a specific SKU.
 * Called from the Market Explorer component via useTransition.
 * Returns community sales history, median prices by size, and overall median.
 */
export async function lookupMarketData(sku: string) {
  if (!sku || sku.trim().length < 2) {
    return { sales: [], medianBySize: {}, overallMedian: null };
  }

  const normalized = sku.trim().toUpperCase();

  const [sales, medianBySize, overallMedian] = await Promise.all([
    getSalesBySku(normalized),
    getMedianSalePricesBatch(normalized),
    getOverallMedianSalePrice(normalized),
  ]);

  return {
    sales: sales.map((s) => ({
      ...s,
      saleDate: typeof s.saleDate === "string" ? s.saleDate : new Date(s.saleDate).toISOString(),
    })),
    medianBySize,
    overallMedian,
  };
}
