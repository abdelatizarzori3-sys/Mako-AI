import { boolean, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/**
 * Payment-provider webhooks will own writes to this table once a provider and
 * country/channel are selected. The application only reads it to authorize Pro.
 */
export const subscriptionEntitlements = mysqlTable("subscription_entitlements", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 64 }).notNull(),
  providerCustomerId: varchar("providerCustomerId", { length: 255 }).notNull(),
  providerSubscriptionId: varchar("providerSubscriptionId", { length: 255 }).notNull().unique(),
  plan: mysqlEnum("plan", ["pro"]).notNull(),
  status: mysqlEnum("status", ["active", "canceled", "expired", "past_due"]).notNull(),
  currentPeriodEndsAt: timestamp("currentPeriodEndsAt").notNull(),
  cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type SubscriptionEntitlement = typeof subscriptionEntitlements.$inferSelect;
export type InsertSubscriptionEntitlement = typeof subscriptionEntitlements.$inferInsert;

// TODO: Add your tables here
