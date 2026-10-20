import { getAuth } from "@clerk/express";
import type { RequestHandler, Request } from "express";
import { eq } from "drizzle-orm";
import { db, staffReviewers, demoAccounts } from "@workspace/db";

export function authenticatedUserId(req: Request): string | null {
  return getAuth(req).userId ?? null;
}

export async function isApprovedStaff(userId: string): Promise<boolean> {
  const rows = await db.select({ userId: staffReviewers.userId })
    .from(staffReviewers).where(eq(staffReviewers.userId, userId)).limit(1);
  // A mistaken allowlist entry must never elevate a shared demo session.
  return rows.length === 1 && !await isSharedDemoAccount(userId);
}

export async function isSharedDemoAccount(userId: string): Promise<boolean> {
  const rows = await db.select({ userId: demoAccounts.userId })
    .from(demoAccounts).where(eq(demoAccounts.userId, userId)).limit(1);
  return rows.length === 1;
}

export const requireResident: RequestHandler = (req, res, next) => {
  if (!authenticatedUserId(req)) {
    res.status(401).json({ error: "Sign in to access your reports." });
    return;
  }
  // Private responses must not be reused by a browser or shared intermediary.
  res.setHeader("Cache-Control", "no-store");
  next();
};

export const requireStaff: RequestHandler = async (req, res, next) => {
  const userId = authenticatedUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Sign in required." });
    return;
  }
  if (!await isApprovedStaff(userId)) {
    res.status(403).json({ error: "This account is not an approved staff reviewer." });
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  next();
};

// Cookie-authenticated mutations must originate from this application's origin.
// Header-less requests (CLI / API clients) still require authenticated identity.
export const requireSameOrigin: RequestHandler = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) { next(); return; }
  const origin = req.get("origin");
  const host = (req.get("x-forwarded-host") ?? req.get("host"))?.split(",")[0].trim();
  if (req.get("sec-fetch-site") === "cross-site" ||
    (origin && (() => { try { return new URL(origin).host !== host; } catch { return true; } })())) {
    res.status(403).json({ error: "Cross-site requests are not allowed." });
    return;
  }
  next();
};
