import { eq } from "drizzle-orm";
import { clerkClient } from "@clerk/express";
import { db, pool, staffReviewers } from "@workspace/db";

// Owner-only workspace command, deliberately not exposed as an HTTP endpoint.
async function main() {
  const [action, userId, ...extra] = process.argv.slice(2);
  if (!["grant", "revoke"].includes(action) || !/^user_[A-Za-z0-9]+$/.test(userId ?? "") || extra.length) {
    throw new Error("Usage: pnpm --filter @workspace/api-server staff:access grant|revoke user_ACCOUNT_ID");
  }
  if (action === "grant") {
    // Verify against this environment's Clerk tenant. Development and production
    // identities are different; never grant a role to an unverified email.
    await clerkClient.users.getUser(userId);
    await db.insert(staffReviewers).values({ userId }).onConflictDoNothing();
  } else {
    await db.delete(staffReviewers).where(eq(staffReviewers.userId, userId));
  }
  process.stdout.write(`Staff access ${action === "grant" ? "granted" : "revoked"} for ${userId}.\n`);
}
main().catch(() => {
  process.stderr.write("Staff access change failed. Check the command, account ID, and this environment's Clerk/database configuration.\n");
  process.exitCode = 1;
}).finally(() => pool.end());
