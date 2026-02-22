import { getConfigValue } from "@/lib/queries/config";

interface SaleEmbedData {
  productName: string;
  sku: string | null;
  sizeVariant: string | null;
  salePrice: number;
  platform: string | null;
  saleDate: string;
  imageUrl: string | null;
}

/**
 * Send an anonymous sale notification embed to the configured Discord webhook.
 * Fire-and-forget: fails silently to never block sale creation.
 */
export async function sendSaleWebhook(data: SaleEmbedData): Promise<void> {
  try {
    const webhookUrl = await getConfigValue("discord_webhook_url");
    if (!webhookUrl) return;

    const platformLabel = data.platform
      ? data.platform.charAt(0).toUpperCase() + data.platform.slice(1)
      : "N/A";

    const fields = [
      { name: "Produit", value: data.productName, inline: true },
      ...(data.sku ? [{ name: "SKU", value: data.sku, inline: true }] : []),
      { name: "Taille", value: data.sizeVariant ?? "N/A", inline: true },
      { name: "Prix de vente", value: `${data.salePrice.toFixed(2)} EUR`, inline: true },
      { name: "Plateforme", value: platformLabel, inline: true },
      { name: "Date", value: data.saleDate, inline: true },
    ];

    const embed: Record<string, unknown> = {
      title: "Nouvelle vente",
      color: 0x4ade80, // green-400 matching text-success
      fields,
      timestamp: new Date().toISOString(),
      footer: { text: "ProxStock" },
    };

    if (data.imageUrl) {
      embed.thumbnail = { url: data.imageUrl };
    }

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Fire-and-forget: webhook failure must not block sales
    console.error("[Discord Webhook] Failed to send sale notification");
  }
}
