import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("USER"),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code"),
  category: text("category"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const productEntries = pgTable("product_entries", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  expirationDate: timestamp("expiration_date").notNull(),
  quantity: integer("quantity").notNull().default(1),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isExpired: boolean("is_expired").notNull().default(false),
});

export const inventoryUploads = pgTable("inventory_uploads", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  uploadedBy: integer("uploaded_by").notNull(),
  productsCount: integer("products_count").notNull(),
  status: text("status").notNull().default("active"),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
});

export const insertProductSchema = createInsertSchema(products).pick({
  name: true,
  code: true,
  category: true,
});

export const insertProductEntrySchema = createInsertSchema(productEntries).pick({
  productId: true,
  expirationDate: true,
  quantity: true,
  notes: true,
});

export const insertInventoryUploadSchema = createInsertSchema(inventoryUploads).pick({
  filename: true,
  uploadedBy: true,
  productsCount: true,
  status: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export type InsertProductEntry = z.infer<typeof insertProductEntrySchema>;
export type ProductEntry = typeof productEntries.$inferSelect;

export type InsertInventoryUpload = z.infer<typeof insertInventoryUploadSchema>;
export type InventoryUpload = typeof inventoryUploads.$inferSelect;

export type ProductWithExpiration = {
  id: number;
  name: string;
  code?: string;
  category?: string;
  expirationDate: Date;
  quantity: number;
  daysRemaining: number;
  status: 'OK' | 'ATTENTION' | 'VENCENDO' | 'VENCIDO';
  notes?: string;
  entryId: number;
};

export type ExpirationStatus = {
  total: number;
  valid: number;
  expired: number;
  ok: number;
  attention: number;
  vencendo: number;
};
