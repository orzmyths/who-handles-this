import { jsonb, pgTable, serial, timestamp, text, index } from "drizzle-orm/pg-core";

export const routingHistory = pgTable("routing_history", {
  id: serial("id").primaryKey(),
  ownerUserId: text("owner_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  input: jsonb("input").notNull(),
  output: jsonb("output").notNull(),
}, table => [index("routing_history_owner_idx").on(table.ownerUserId)]);

export type RoutingHistoryRow = typeof routingHistory.$inferSelect;