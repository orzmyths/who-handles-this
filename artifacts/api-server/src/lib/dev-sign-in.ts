import { createHash, timingSafeEqual } from "node:crypto";

export function demoSignInAllowed(env: NodeJS.ProcessEnv): boolean {
  // Explicitly approved shared-demo access, never access to another identity.
  return (env.NODE_ENV === "development" && Boolean(env.CLERK_SECRET_KEY?.startsWith("sk_test_")))
    || (env.NODE_ENV === "production" && Boolean(env.CLERK_SECRET_KEY?.startsWith("sk_live_")));
}

export function demoAccountIdentity(env: NodeJS.ProcessEnv) {
  return env.NODE_ENV === "production"
    ? { externalId: "who-handles-this-public-demo-resident", email: "who-handles-this-public-demo@example.com" }
    : { externalId: "who-handles-this-preview-resident", email: "who-handles-this-preview@example.com" };
}

export function validDevelopmentPasscode(supplied: unknown, expected: string | undefined): boolean {
  if (!expected || typeof supplied !== "string" || !supplied.length || supplied.length > 128) return false;
  const hash = (text: string) => createHash("sha256").update(text).digest();
  return timingSafeEqual(hash(supplied), hash(expected));
}