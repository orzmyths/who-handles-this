import { integer, jsonb, pgTable, primaryKey, serial, text, timestamp } from "drizzle-orm/pg-core";

export const staffCases = pgTable(
  "staff_cases",
  {
    namespace: text("namespace").notNull().default("default"),
    id: text("id").notNull(),
    data: jsonb("data").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    staffCasesPkey: primaryKey({ columns: [table.namespace, table.id] }),
  }),
);

export type StaffCaseRow = typeof staffCases.$inferSelect;

export const staffCaseResetLogs = pgTable("staff_case_reset_logs", {
  id: serial("id").primaryKey(),
  namespace: text("namespace").notNull().default("default"),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull().defaultNow(),
  resetCaseCount: integer("reset_case_count").notNull(),
  retainedReportCount: integer("retained_report_count").notNull(),
  reviewer: text("reviewer"),
});

export type StaffCaseResetLogRow = typeof staffCaseResetLogs.$inferSelect;