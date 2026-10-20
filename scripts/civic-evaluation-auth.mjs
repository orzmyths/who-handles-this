import { createRequire } from "node:module";

// Trusted owner-operated CLI only; never imported by browser/application code.
// A pre-existing evaluator account must be selected explicitly. No account or
// staff approval is created, and no credentials are printed or persisted.
export async function openEvaluationSession() {
  const userId = process.env.CIVIC_EVALUATION_USER_ID;
  if (!/^user_[A-Za-z0-9]+$/.test(userId ?? "")) {
    throw new Error("Set CIVIC_EVALUATION_USER_ID to an existing dedicated Clerk evaluator account ID before running this owner-operated check.");
  }
  const { clerkClient } = createRequire(new URL("../artifacts/api-server/package.json", import.meta.url))("@clerk/express");
  let session;
  try {
    await clerkClient.users.getUser(userId);
    session = await clerkClient.sessions.createSession({ userId });
  } catch {
    throw new Error("Could not create a Clerk evaluation session. Verify the dedicated account and development Clerk configuration.");
  }
  return {
    async fetch(url, init = {}) {
      let token;
      try { token = await clerkClient.sessions.getToken(session.id); }
      catch { throw new Error("Could not refresh the evaluation session."); }
      return fetch(url, {
        ...init,
        headers: { "content-type": "application/json", ...init.headers, authorization: `Bearer ${token.jwt}` },
      });
    },
    async close() {
      try { await clerkClient.sessions.revokeSession(session.id); }
      catch { throw new Error("Could not revoke the temporary evaluation session. Revoke it in the identity provider before retrying."); }
    },
  };
}
