import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Only the workspace/database owner can change this allowlist. No public API
// grants staff privileges, and sign-up never provisions a reviewer.
export const staffReviewers = pgTable("staff_reviewers", {
  userId: text("user_id").primaryKey(),
  approvedAt: timestamp("approved_at", { withTimezone: true }).notNull().defaultNow(),
});
export const insertStaffReviewerSchema = createInsertSchema(staffReviewers);
export type StaffReviewer = typeof staffReviewers.$inferSelect;
