import { Router } from "express";
import { randomBytes } from "node:crypto";
import { clerkClient } from "@clerk/express";
import { demoSignInAllowed, demoAccountIdentity, validDevelopmentPasscode } from "../lib/dev-sign-in";
import { isApprovedStaff } from "../lib/access-control";
import { DeveloperSignInBody } from "@workspace/api-zod";
import { db, demoAccounts, staffReviewers } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();
const attempts = new Map<string, { count: number; resetAt: number }>();
const identity = demoAccountIdentity(process.env);
let account: Promise<string> | undefined;

function developerAccount(): Promise<string> {
  // Coalesce simultaneous requests. Clerk's externalId remains stable after restart.
  account ??= (async () => {
    const existing = await clerkClient.users.getUserList({ externalId: [identity.externalId], limit: 1 });
    let user = existing.data[0];
    if (!user) {
      try {
        user = await clerkClient.users.createUser({
          externalId: identity.externalId,
          emailAddress: [identity.email],
          firstName: "Demo",
          lastName: "Tester",
          password: `${randomBytes(32).toString("base64url")}!Aa7`,
        });
      } catch (error) {
        // Another autoscaled worker may have created the same reserved account.
        const created = await clerkClient.users.getUserList({ externalId: [identity.externalId], limit: 1 });
        if (!created.data[0]) throw error;
        user = created.data[0];
      }
    }
    // Register even a mistakenly approved reserved account, so any existing
    // session is denied staff access as soon as this account is initialized.
    await db.insert(demoAccounts).values({ userId: user.id }).onConflictDoNothing();
    const privileged = await db.select({ userId: staffReviewers.userId })
      .from(staffReviewers).where(eq(staffReviewers.userId, user.id)).limit(1);
    if (privileged.length) throw new Error("Shared demo account has a staff approval; refusing sign-in.");
    return user.id;
  })().catch(error => { account = undefined; throw error; });
  return account;
}

router.post("/access/dev-sign-in", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  if (!demoSignInAllowed(process.env)) {
    res.status(404).json({ error: "Not found." }); return;
  }
  if (!process.env.DEV_SIGN_IN_PASSCODE) {
    res.status(503).json({ error: "Demo sign-in is not configured yet." }); return;
  }
  const key = req.ip ?? "unknown", now = Date.now();
  // Expired buckets must not accumulate indefinitely in a public endpoint.
  for (const [ip, item] of attempts) if (item.resetAt <= now) attempts.delete(ip);
  if (!attempts.has(key) && attempts.size >= 1000) {
    res.status(429).json({ error: "Demo sign-in is busy. Try again shortly." }); return;
  }
  let bucket = attempts.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + 60_000 }; attempts.set(key, bucket);
  }
  if (++bucket.count > 5) {
    res.setHeader("Retry-After", "60");
    res.status(429).json({ error: "Wait one minute before trying again." }); return;
  }
  const parsed = DeveloperSignInBody.safeParse(req.body);
  if (!parsed.success || !validDevelopmentPasscode(parsed.data.passcode, process.env.DEV_SIGN_IN_PASSCODE)) {
    res.status(400).json({ error: "Invalid developer passcode." }); return;
  }
  try {
    const userId = await developerAccount();
    // This shortcut is resident-only, even if someone later approves the fixture.
    if (await isApprovedStaff(userId)) {
      res.status(503).json({ error: "The development test account must not have staff privileges." }); return;
    }
    const token = await clerkClient.signInTokens.createSignInToken({ userId, expiresInSeconds: 60 });
    res.json({ ticket: token.token });
  } catch {
    // Do not log the request body, credential, ticket, or Clerk request metadata.
    req.log.error("Shared demo sign-in could not create a restricted resident session");
    res.status(503).json({ error: "Demo sign-in is unavailable. Use regular account sign-in." });
  }
});

export default router;