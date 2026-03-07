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

    const logoUrl = "https://proxcop-dashboard.vercel.app/logo-icon.png";

    const footer = {
      text: "Powered by Proxcop",
      icon_url: logoUrl,
    };

    let embed: Record<string, unknown>;

    if (data.anonymous) {
      embed = {
        title: "Nouvelle vente anonyme",
        description: "Cette vente a été masquée par le vendeur. Il a choisi de ne pas partager les détails publiquement.",
        color: 0x2f3136,
        fields: [
          { name: "Produit", value: "||HIDDEN||", inline: true },
          { name: "SKU", value: "||HIDDEN||", inline: true },
          { name: "Taille", value: "||HIDDEN||", inline: true },
          { name: "Prix de vente", value: "||HIDDEN||", inline: true },
          { name: "Plateforme", value: "||HIDDEN||", inline: true },
          { name: "Date", value: data.saleDate, inline: true },
        ],
        timestamp: new Date().toISOString(),
        footer,
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
        footer,
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

interface BulkSaleEmbedData {
  items: Array<{
    productName: string;
    sku: string | null;
    imageUrl: string | null;
    sizeVariant: string | null;
  }>;
  salePrice: number;
  platform: string | null;
  saleDate: string;
  anonymous?: boolean;
}

/**
 * Send a bulk sale notification embed to the configured Discord webhook.
 * Summarizes multiple items sold at once.
 */
export async function sendBulkSaleWebhook(data: BulkSaleEmbedData): Promise<void> {
  try {
    const webhookUrl = await getConfigValue("discord_webhook_url");
    if (!webhookUrl) return;

    const logoUrl = "https://proxcop-dashboard.vercel.app/logo-icon.png";

    const footer = {
      text: "Powered by Proxcop",
      icon_url: logoUrl,
    };

    let embed: Record<string, unknown>;

    if (data.anonymous) {
      embed = {
        title: `Vente groupée anonyme (${data.items.length} items)`,
        description: "Cette vente a été masquée par le vendeur.",
        color: 0x2f3136,
        fields: [
          { name: "Nombre d'items", value: `${data.items.length}`, inline: true },
          { name: "Prix unitaire", value: "||HIDDEN||", inline: true },
          { name: "Date", value: data.saleDate, inline: true },
        ],
        timestamp: new Date().toISOString(),
        footer,
      };
    } else {
      const platformLabel = data.platform
        ? data.platform.charAt(0).toUpperCase() + data.platform.slice(1)
        : "N/A";

      const itemList = data.items
        .map((item) => {
          const size = item.sizeVariant ? ` (${item.sizeVariant})` : "";
          return `${item.productName}${size}`;
        })
        .join("\n");

      embed = {
        title: `Vente groupée (${data.items.length} items)`,
        color: 0x4ade80,
        fields: [
          { name: "Produits", value: itemList.substring(0, 1024), inline: false },
          { name: "Prix unitaire", value: `${data.salePrice.toFixed(2)} EUR`, inline: true },
          { name: "Plateforme", value: platformLabel, inline: true },
          { name: "Date", value: data.saleDate, inline: true },
        ],
        timestamp: new Date().toISOString(),
        footer,
      };

      if (data.items[0]?.imageUrl) {
        embed.thumbnail = { url: data.items[0].imageUrl };
      }
    }

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    console.error("[Discord Webhook] Failed to send bulk sale notification");
  }
}
