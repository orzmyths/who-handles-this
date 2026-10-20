import { jsonb, pgTable, primaryKey, text } from "drizzle-orm/pg-core";

export const contactSourceReviews = pgTable("contact_source_reviews", {
  namespace: text("namespace").notNull().default("default"),
  sourceUrl: text("source_url").notNull(),
  data: jsonb("data").notNull(),
}, table => ({
  pk: primaryKey({ columns: [table.namespace, table.sourceUrl] }),
}));