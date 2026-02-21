import {
  pgTable,
  uuid,
  text,
  timestamp,
  decimal,
  date,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const userRoleEnum = pgEnum("user_role", ["member", "staff", "shop"]);
export const categoryEnum = pgEnum("category", ["sneakers", "pokemon", "lego", "random"]);
export const platformEnum = pgEnum("platform", [
  "stockx", "vinted", "ebay", "laced", "hypeboost", "alias", "other",
]);
export const productStatusEnum = pgEnum("product_status", [
  "en_stock", "liste", "reserve", "vendu", "en_litige", "return_waiting_rf", "hold",
]);
export const cashbackStatusEnum = pgEnum("cashback_status", [
  "requested", "approved", "received",
]);
export const expenseCategoryEnum = pgEnum("expense_category", [
  "bot", "proxy", "shipping_materials", "subscription", "other",
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

// Products
export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sku: text("sku"),
  category: categoryEnum("category").notNull().default("sneakers"),
  sizeVariant: text("size_variant"),
  imageUrl: text("image_url"),
  purchasePrice: decimal("purchase_price", { precision: 10, scale: 2 }).notNull(),
  purchaseDate: date("purchase_date").notNull(),
  targetPrice: decimal("target_price", { precision: 10, scale: 2 }),
  shippingFee: decimal("shipping_fee", { precision: 10, scale: 2 }).default("0"),
  platformFee: decimal("platform_fee", { precision: 10, scale: 2 }).default("0"),
  platform: platformEnum("platform"),
  status: productStatusEnum("status").notNull().default("en_stock"),
  storageLocation: text("storage_location"),
  returnDeadline: date("return_deadline"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Sales
export const sales = pgTable("sales", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }).unique(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }).notNull(),
  saleDate: date("sale_date").notNull(),
  platform: platformEnum("platform"),
  platformFee: decimal("platform_fee", { precision: 10, scale: 2 }).default("0"),
  shippingCost: decimal("shipping_cost", { precision: 10, scale: 2 }).default("0"),
  otherFees: decimal("other_fees", { precision: 10, scale: 2 }).default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Cashbacks
export const cashbacks = pgTable("cashbacks", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
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
  imageUrl: text("image_url").notNull(),
  source: text("source").notNull().default("stockx"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  products: many(products),
  sales: many(sales),
  cashbacks: many(cashbacks),
  expenses: many(expenses),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  user: one(users, { fields: [products.userId], references: [users.id] }),
  sale: one(sales, { fields: [products.id], references: [sales.productId] }),
  cashbacks: many(cashbacks),
}));

export const salesRelations = relations(sales, ({ one }) => ({
  product: one(products, { fields: [sales.productId], references: [products.id] }),
  user: one(users, { fields: [sales.userId], references: [users.id] }),
}));

export const cashbacksRelations = relations(cashbacks, ({ one }) => ({
  product: one(products, { fields: [cashbacks.productId], references: [products.id] }),
  user: one(users, { fields: [cashbacks.userId], references: [users.id] }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  user: one(users, { fields: [expenses.userId], references: [users.id] }),
}));
