import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal } from "drizzle-orm/mysql-core";

/**
 * Usuários do sistema com autenticação própria (username/password)
 * Sem OAuth - autenticação local apenas
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  credits: decimal("credits", { precision: 10, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Estoque de chaves proxy por tipo
 * Cada tipo tem um custo diferente em créditos
 */
export const keyStock = mysqlTable("key_stock", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["1day", "7days", "30days"]).notNull().unique(),
  costInCredits: int("costInCredits").notNull(), // 1, 2, 4
  availableCount: int("availableCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type KeyStock = typeof keyStock.$inferSelect;
export type InsertKeyStock = typeof keyStock.$inferInsert;

/**
 * Keys armazenadas no estoque
 */
export const keys = mysqlTable("keys", {
  id: int("id").autoincrement().primaryKey(),
  keyValue: text("keyValue").notNull().unique(),
  type: mysqlEnum("type", ["1day", "7days", "30days"]).notNull(),
  isUsed: mysqlEnum("isUsed", ["true", "false"]).default("false").notNull(),
  usedBy: int("usedBy"), // FK para users.id
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Key = typeof keys.$inferSelect;
export type InsertKey = typeof keys.$inferInsert;

/**
 * Histórico de transações (geração de keys e movimentação de créditos)
 */
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // FK para users.id
  type: mysqlEnum("type", ["key_generation", "credit_add", "credit_remove"]).notNull(),
  description: text("description"),
  creditAmount: decimal("creditAmount", { precision: 10, scale: 2 }),
  keyType: mysqlEnum("keyType", ["1day", "7days", "30days"]),
  keyCount: int("keyCount"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;
