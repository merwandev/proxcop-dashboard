export const CATEGORIES = [
  { value: "sneakers", label: "Sneakers" },
  { value: "pokemon", label: "Pokemon" },
  { value: "lego", label: "Lego" },
  { value: "random", label: "Random" },
] as const;

export const PLATFORMS = [
  { value: "stockx", label: "StockX" },
  { value: "vinted", label: "Vinted" },
  { value: "ebay", label: "eBay" },
  { value: "laced", label: "Laced" },
  { value: "hypeboost", label: "Hypeboost" },
  { value: "alias", label: "Alias" },
  { value: "leboncoin", label: "Leboncoin" },
  { value: "vestiaire", label: "Vestiaire Co" },
  { value: "fb_groups", label: "FB Groupes" },
  { value: "direct", label: "Vente directe" },
  { value: "discord", label: "Discord" },
  { value: "other", label: "Autre" },
] as const;

export const PAYMENT_STATUSES = [
  { value: "paid", label: "Payé" },
  { value: "pending", label: "En attente" },
] as const;

export const STATUSES = [
  { value: "en_attente", label: "En attente", color: "bg-orange-400" },
  { value: "en_stock", label: "En stock", color: "bg-blue-500" },
  { value: "liste", label: "Liste", color: "bg-purple-500" },
  { value: "reserve", label: "Réservé", color: "bg-yellow-500" },
  { value: "expedie", label: "Expédié", color: "bg-cyan-500" },
  { value: "vendu", label: "Vendu", color: "bg-success" },
  { value: "en_litige", label: "En litige", color: "bg-danger" },
  { value: "return_waiting_rf", label: "Return / Waiting RF", color: "bg-warning" },
  { value: "hold", label: "Hold", color: "bg-muted-foreground" },
  { value: "reship", label: "Reship", color: "bg-rose-500" },
  { value: "consign", label: "Consign", color: "bg-teal-500" },
] as const;

export const CASHBACK_STATUSES = [
  { value: "to_request", label: "À demander", color: "bg-muted-foreground" },
  { value: "requested", label: "Demandé", color: "bg-orange-400" },
  { value: "approved", label: "Approuvé", color: "bg-blue-500" },
  { value: "received", label: "Reçu", color: "bg-success" },
] as const;

export const CASHBACK_APPS = [
  { value: "igraal", label: "iGraal" },
  { value: "poulpeo", label: "Poulpeo" },
  { value: "widilo", label: "Widilo" },
  { value: "joko", label: "Joko" },
  { value: "rnr", label: "R&R" },
  { value: "other", label: "Autre" },
] as const;

export const EXPENSE_CATEGORIES = [
  { value: "bot", label: "Bot" },
  { value: "proxy", label: "Proxy" },
  { value: "shipping_materials", label: "Matériel d'envoi" },
  { value: "subscription", label: "Abonnement" },
  { value: "other", label: "Autre" },
] as const;

export const STORAGE_LOCATIONS = [
  { value: "home", label: "Chez moi" },
  { value: "shop", label: "Shop" },
  { value: "associate", label: "Associé" },
] as const;

export type Category = (typeof CATEGORIES)[number]["value"];
export type Platform = (typeof PLATFORMS)[number]["value"];
export type ProductStatus = (typeof STATUSES)[number]["value"];
export type CashbackStatus = (typeof CASHBACK_STATUSES)[number]["value"];
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]["value"];
export type StorageLocation = (typeof STORAGE_LOCATIONS)[number]["value"];
