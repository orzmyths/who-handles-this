import { jsonb, pgTable, primaryKey, text } from "drizzle-orm/pg-core";

export const approvedContacts = pgTable("approved_contacts", {
  namespace: text("namespace").notNull().default("default"),
  contactId: text("contact_id").notNull(),
  data: jsonb("data").notNull(),
}, table => ({
  pk: primaryKey({ columns: [table.namespace, table.contactId] }),
}));