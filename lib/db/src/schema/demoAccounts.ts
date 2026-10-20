import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Server-owned restriction: shared accounts can never become staff accounts.
export const demoAccounts = pgTable("demo_accounts", {
  userId: text("user_id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const insertDemoAccountSchema = createInsertSchema(demoAccounts).omit({ createdAt: true });
export type InsertDemoAccount = z.infer<typeof insertDemoAccountSchema>;
export type DemoAccount = typeof demoAccounts.$inferSelect;