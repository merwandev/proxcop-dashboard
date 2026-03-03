import { getConfigValue } from "@/lib/queries/config";

interface SaleEmbedData {
  productName: string;
  sku: string | null;
  sizeVariant: string | null;
  salePrice: number;
  platform: string | null;
  saleDate: string;
  imageUrl: string | null;
  anonymous?: boolean;
}

/**
 * Send a sale notification embed to the configured Discord webhook.
 * If anonymous is true, sends a hidden embed with no product details.
 * Fire-and-forget: fails silently to never block sale creation.
 */
export async function sendSaleWebhook(data: SaleEmbedData): Promise<void> {
  try {
    const webhookUrl = await getConfigValue("discord_webhook_url");
    if (!webhookUrl) return;

    let embed: Record<string, unknown>;

    if (data.anonymous) {
      const now = new Date();
      const sellTime = now.toLocaleDateString("fr-FR", {
        day: "2-digit", month: "2-digit", year: "numeric",
      }) + " " + now.toLocaleTimeString("fr-FR", {
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      });

      embed = {
        title: "\uD83E\uDD77 New Hidden Sale \uD83D\uDCB8",
        description: "This sale has been hidden, which means that the seller has purchased the Anonymous sales package at the dashboard.",
        color: 0x2f3136,
        fields: [
          { name: "Site", value: "HIDDEN \uD83E\uDD77", inline: true },
          { name: "Sell Time", value: sellTime, inline: true },
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: "Powered by Proxcop",
          icon_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://proxcop.com"}/logo%20icon.png`,
        },
      };
    } else {
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

      embed = {
        title: "Nouvelle vente",
        color: 0x4ade80,
        fields,
        timestamp: new Date().toISOString(),
        footer: { text: "ProxStock" },
      };

      if (data.imageUrl) {
        embed.thumbnail = { url: data.imageUrl };
      }
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
