import {
  pgTable,
  uuid,
  text,
  timestamp,
  decimal,
  date,
  boolean,
  pgEnum,
  unique,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const userRoleEnum = pgEnum("user_role", ["member", "staff", "shop", "dev"]);
export const categoryEnum = pgEnum("category", ["sneakers", "pokemon", "lego", "random"]);
export const platformEnum = pgEnum("platform", [
  "stockx", "vinted", "ebay", "laced", "hypeboost", "alias", "discord", "other",
]);
export const paymentStatusEnum = pgEnum("payment_status", ["paid", "pending"]);
export const productStatusEnum = pgEnum("product_status", [
  "en_attente", "en_stock", "liste", "reserve", "expedie", "vendu", "en_litige", "return_waiting_rf", "hold",
]);
export const cashbackStatusEnum = pgEnum("cashback_status", [
  "requested", "approved", "received",
]);
export const expenseCategoryEnum = pgEnum("expense_category", [
  "bot", "proxy", "shipping_materials", "subscription", "other",
]);
export const skuImageStatusEnum = pgEnum("sku_image_status", [
  "found", "not_found", "manual",
]);

// Users
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  discordId: text("discord_id").notNull().unique(),
  discordUsername: text("discord_username").notNull(),
  discordAvatar: text("discord_avatar"),
  email: text("email"),
  role: userRoleEnum("role").notNull().default("member"),
  currency: text("currency").notNull().default("EUR"),
  tvaEnabled: boolean("tva_enabled").notNull().default(false),
  tvaRate: decimal("tva_rate", { precision: 5, scale: 2 }).default("20.00"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Products (PARENT — shared product info)
export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sku: text("sku"),
  category: categoryEnum("category").notNull().default("sneakers"),
  imageUrl: text("image_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Product Variants (CHILD — 1 row = 1 physical unit)
export const productVariants = pgTable("product_variants", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sizeVariant: text("size_variant"),
  purchasePrice: decimal("purchase_price", { precision: 10, scale: 2 }).notNull(),
  purchaseDate: date("purchase_date").notNull(),
  targetPrice: decimal("target_price", { precision: 10, scale: 2 }),
  status: productStatusEnum("status").notNull().default("en_stock"),
  storageLocation: text("storage_location"),
  returnDeadline: date("return_deadline"),
  supplierName: text("supplier_name"),
  listedOn: jsonb("listed_on").$type<string[]>().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Sales (linked to a variant, not a product)
export const sales = pgTable("sales", {
  id: uuid("id").defaultRandom().primaryKey(),
  variantId: uuid("variant_id").notNull().references(() => productVariants.id, { onDelete: "cascade" }).unique(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }).notNull(),
  saleDate: date("sale_date").notNull(),
  platform: platformEnum("platform"),
  platformFee: decimal("platform_fee", { precision: 10, scale: 2 }).default("0"),
  shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }).default("0"),
  otherFees: decimal("other_fees", { precision: 10, scale: 2 }).default("0"),
  notes: text("notes"),
  buyerUsername: text("buyer_username"),
  paymentStatus: paymentStatusEnum("payment_status").default("paid"),
  paymentCollectedAt: timestamp("payment_collected_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Cashbacks (linked to a variant)
export const cashbacks = pgTable("cashbacks", {
  id: uuid("id").defaultRandom().primaryKey(),
  variantId: uuid("variant_id").notNull().references(() => productVariants.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  source: text("source").notNull(),
  status: cashbackStatusEnum("status").notNull().default("requested"),
  requestedAt: timestamp("requested_at").notNull().defaultNow(),
  receivedAt: timestamp("received_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Expenses (Phase 2)
export const expenses = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  category: expenseCategoryEnum("category").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: date("date").notNull(),
  recurring: boolean("recurring").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// StockX OAuth Tokens (single row, used for API access)
export const stockxTokens = pgTable("stockx_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// SKU Image Cache (global, shared across all users)
export const skuImages = pgTable("sku_images", {
  id: uuid("id").defaultRandom().primaryKey(),
  sku: text("sku").notNull().unique(),
  imageUrl: text("image_url"),
  source: text("source").notNull().default("stockx"),
  status: skuImageStatusEnum("status").notNull().default("found"),
  stockxProductId: text("stockx_product_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// StockX Products Cache (full product + variants, avoids re-calling API)
export const stockxProductsCache = pgTable("stockx_products_cache", {
  id: uuid("id").defaultRandom().primaryKey(),
  sku: text("sku").notNull().unique(),
  stockxProductId: text("stockx_product_id").notNull(),
  title: text("title").notNull(),
  styleId: text("style_id").notNull(),
  imageUrl: text("image_url"),
  variants: jsonb("variants").notNull(), // StockXCachedVariant[]
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Product Advice (admin warnings/recommendations for specific SKUs)
export const productAdvice = pgTable("product_advice", {
  id: uuid("id").defaultRandom().primaryKey(),
  sku: text("sku").notNull(),
  title: text("title").notNull(), // e.g. "Nike Dunk Low Panda"
  message: text("message").notNull(), // e.g. "Les prix chutent, retournez si possible"
  severity: text("severity").notNull().default("warning"), // "info" | "warning" | "critical"
  active: boolean("active").notNull().default(true),
  createdBy: uuid("created_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// User SKU Images (private per-user fallback images)
export const userSkuImages = pgTable("user_sku_images", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sku: text("sku").notNull(),
  imageUrl: text("image_url").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  unique("user_sku_unique").on(table.userId, table.sku),
]);

// App Config (key-value store for global settings like webhook URLs)
export const appConfig = pgTable("app_config", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Relations ──────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  products: many(products),
  productVariants: many(productVariants),
  sales: many(sales),
  cashbacks: many(cashbacks),
  expenses: many(expenses),
  userSkuImages: many(userSkuImages),
  createdAdvice: many(productAdvice),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  user: one(users, { fields: [products.userId], references: [users.id] }),
  variants: many(productVariants),
}));

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, { fields: [productVariants.productId], references: [products.id] }),
  user: one(users, { fields: [productVariants.userId], references: [users.id] }),
  sale: one(sales, { fields: [productVariants.id], references: [sales.variantId] }),
  cashbacks: many(cashbacks),
}));

export const salesRelations = relations(sales, ({ one }) => ({
  variant: one(productVariants, { fields: [sales.variantId], references: [productVariants.id] }),
  user: one(users, { fields: [sales.userId], references: [users.id] }),
}));

export const cashbacksRelations = relations(cashbacks, ({ one }) => ({
  variant: one(productVariants, { fields: [cashbacks.variantId], references: [productVariants.id] }),
  user: one(users, { fields: [cashbacks.userId], references: [users.id] }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  user: one(users, { fields: [expenses.userId], references: [users.id] }),
}));

export const userSkuImagesRelations = relations(userSkuImages, ({ one }) => ({
  user: one(users, { fields: [userSkuImages.userId], references: [users.id] }),
}));

export const productAdviceRelations = relations(productAdvice, ({ one }) => ({
  creator: one(users, { fields: [productAdvice.createdBy], references: [users.id] }),
}));
