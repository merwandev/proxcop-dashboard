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
  { value: "other", label: "Autre" },
] as const;

export const STATUSES = [
  { value: "en_stock", label: "En stock", color: "bg-blue-500" },
  { value: "liste", label: "Liste", color: "bg-purple-500" },
  { value: "reserve", label: "Reserve", color: "bg-yellow-500" },
  { value: "vendu", label: "Vendu", color: "bg-success" },
  { value: "en_litige", label: "En litige", color: "bg-danger" },
  { value: "return_waiting_rf", label: "Return / Waiting RF", color: "bg-warning" },
  { value: "hold", label: "Hold", color: "bg-muted-foreground" },
] as const;

export const CASHBACK_STATUSES = [
  { value: "requested", label: "Demande" },
  { value: "approved", label: "Approuve" },
  { value: "received", label: "Recu" },
] as const;

export const EXPENSE_CATEGORIES = [
  { value: "bot", label: "Bot" },
  { value: "proxy", label: "Proxy" },
  { value: "shipping_materials", label: "Materiel d'envoi" },
  { value: "subscription", label: "Abonnement" },
  { value: "other", label: "Autre" },
] as const;

export const STORAGE_LOCATIONS = [
  { value: "home", label: "Chez moi" },
  { value: "shop", label: "Shop" },
  { value: "associate", label: "Associe" },
] as const;

export type Category = (typeof CATEGORIES)[number]["value"];
export type Platform = (typeof PLATFORMS)[number]["value"];
export type ProductStatus = (typeof STATUSES)[number]["value"];
export type CashbackStatus = (typeof CASHBACK_STATUSES)[number]["value"];
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]["value"];
export type StorageLocation = (typeof STORAGE_LOCATIONS)[number]["value"];
