import assert from "node:assert/strict";
import { test } from "node:test";
import { generateKeyPairSync, randomUUID, sign } from "node:crypto";
import { createServer } from "node:http";
import { once } from "node:events";

test("Clerk identity isolates residents, preserves legacy reports, and gates every staff API", async () => {
  // An isolated local Clerk issuer: real Clerk JWT verification, no mocked
  // authentication middleware and no production sign-in bypass.
  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const issuer = "access-test.clerk.accounts.dev";
  process.env.CLERK_PUBLISHABLE_KEY = `pk_test_${Buffer.from(`${issuer}$`).toString("base64")}`;
  process.env.CLERK_SECRET_KEY = "sk_test_local_fixture_not_a_real_credential";
  process.env.CLERK_JWT_KEY = publicKey.export({ type: "spki", format: "pem" }).toString();
  process.env.STAFF_CASES_NAMESPACE = `access-test-${randomUUID()}`;
  process.env.NODE_ENV = "test";
  const namespace = process.env.STAFF_CASES_NAMESPACE;
  const unique = randomUUID().replaceAll("-", "");
  const residentA = `user_residentA${unique}`;
  const residentB = `user_residentB${unique}`;
  const staffId = `user_reviewer${unique}`;
  const token = (userId: string, expired = false) => {
    const now = Math.floor(Date.now() / 1000);
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const payload = `${encode({ alg: "RS256", typ: "JWT", kid: "local-fixture" })}.${encode({
      iss: `https://${issuer}`, sub: userId, sid: `sess_${unique}`,
      iat: now - 60, nbf: now - 60, exp: expired ? now - 30 : now + 3600,
      v: 2, sts: "active",
    })}`;
    return `${payload}.${sign("RSA-SHA256", Buffer.from(payload), privateKey).toString("base64url")}`;
  };
  const { default: app } = await import("../artifacts/api-server/src/app");
  const { pool } = await import("../lib/db/src/index");
  const server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = (server.address() as { port: number }).port;
  const url = `http://127.0.0.1:${port}`;
  const request = async (path: string, userId?: string, body?: unknown, extraHeaders: Record<string, string> = {}) => {
    const response = await fetch(`${url}/api${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { "content-type": "application/json", ...(userId ? { authorization: `Bearer ${token(userId)}` } : {}), ...extraHeaders },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      redirect: "manual",
    });
    const data = await response.json();
    return { status: response.status, data, headers: response.headers };
  };
  let legacyId: number | undefined;
  try {
    assert.equal((await request("/routing/history")).status, 401);
    assert.equal((await request("/routing/history", undefined, undefined, { cookie: "wh_access=verified.forged" })).status, 401);
    assert.equal((await request("/access/verify", undefined, { passcode: "anything" })).status, 410);
    assert.equal((await request("/routing/history", undefined, undefined, { authorization: `Bearer ${token(residentA, true)}` })).status, 401);
    const status = await request("/access/status", residentA);
    assert.equal(status.data.userId, residentA);
    assert.equal(status.data.staff, false);
    assert.equal(status.headers.get("cache-control"), "no-store");
    const reportA = await request("/routing/analyze", residentA, {
      description: "Access isolation fixture: an unlisted neighborhood service.",
      language: "en", simulateAiFailure: true, ownerUserId: residentB, reviewer: staffId, role: "staff",
    });
    assert.equal(reportA.status, 200);
    assert.equal(reportA.data.status, "review");
    const reportB = await request("/routing/analyze", residentB, {
      description: "Second resident isolation fixture.", language: "en", simulateAiFailure: true,
    });
    assert.equal(reportB.status, 200);
    const legacy = await pool.query(
      "INSERT INTO routing_history (input, output) VALUES ($1, $2) RETURNING id",
      [JSON.stringify({ description: "Unowned legacy isolation fixture", language: "en", clarificationHistory: [] }), JSON.stringify(reportA.data)],
    );
    legacyId = legacy.rows[0].id;
    const historyA = await request("/routing/history", residentA);
    const historyB = await request("/routing/history", residentB);
    assert.deepEqual(historyA.data.map((row: any) => row.id), [reportA.data.historyId]);
    assert.deepEqual(historyB.data.map((row: any) => row.id), [reportB.data.historyId]);
    assert.equal(historyA.headers.get("cache-control"), "no-store");
    const persisted = await pool.query("SELECT owner_user_id FROM routing_history WHERE id = $1", [reportA.data.historyId]);
    assert.equal(persisted.rows[0].owner_user_id, residentA);

    const staffPaths: [string, unknown?][] = [
      ["/staff/cases"], ["/staff/cases/demo-1"], ["/staff/cases/reset"],
      ["/staff/cases/reset", {}], ["/staff/cases/demo-1/actions", { action: "approve", reason: "spoof", revision: 0 }],
      ["/staff/contact-sources"], ["/staff/contact-sources/check", {}],
      ["/staff/contact-sources/confirm", {}], ["/staff/contacts/correct", {}], ["/staff/legacy-reports"],
      ["/staff/cases/report-wrong/", { description: "spoof trailing slash", agencyId: "ca-dmv" }],
    ];
    for (const [path, body] of staffPaths) {
      assert.equal((await request(path, undefined, body)).status, 401, `Unauthenticated ${path}`);
      assert.equal((await request(path, residentA, body)).status, 403, `Resident ${path}`);
    }
    assert.equal((await request("/staff/cases/report-wrong", residentA, {
      description: "Resident feedback isolation fixture", agencyId: "ca-dmv",
    })).status, 200);

    await pool.query("INSERT INTO staff_reviewers (user_id) VALUES ($1)", [staffId]);
    assert.equal((await request("/access/status", staffId)).data.staff, true);
    // Even an accidental staff approval cannot elevate a shared-demo identity.
    await pool.query("INSERT INTO demo_accounts (user_id) VALUES ($1)", [residentA]);
    await pool.query("INSERT INTO staff_reviewers (user_id) VALUES ($1)", [residentA]);
    const demoStatus = await request("/access/status", residentA);
    assert.equal(demoStatus.data.demo, true);
    assert.equal(demoStatus.data.staff, false);
    for (const path of ["/staff/cases", "/staff/legacy-reports", "/staff/contact-sources"]) {
      assert.equal((await request(path, residentA)).status, 403, `Shared demo ${path}`);
    }
    const demoHistory = await request("/routing/history", residentA);
    assert.equal(demoHistory.data.length, 1);
    assert.equal(demoHistory.data[0].id, reportA.data.historyId);
    const legacyReports = await request("/staff/legacy-reports", staffId);
    assert.equal(legacyReports.status, 200);
    assert.ok(legacyReports.data.some((row: any) => row.id === legacyId));
    assert.equal((await request("/routing/history", staffId)).data.length, 0);
    const staffCase = await request(`/staff/cases/${reportA.data.reviewCaseId}`, staffId);
    assert.equal(staffCase.status, 200);
    const decision = await request(`/staff/cases/${reportA.data.reviewCaseId}/actions`, staffId, {
      action: "reject", reason: "Authorized isolation test", revision: staffCase.data.revision, reviewer: "Demo Reviewer",
    });
    assert.equal(decision.status, 200);
    assert.equal(decision.data.auditHistory.at(-1).reviewer, staffId);
    const ownOutcome = await request("/routing/history", residentA);
    assert.equal(ownOutcome.data[0].output.reviewOutcome.status, "rejected");
    assert.equal((await request("/routing/history", residentB)).data[0].output.reviewOutcome.status, "needs_review");
    assert.equal((await request("/staff/cases/reset", staffId, {}, { origin: "https://attacker.example" })).status, 403);
    await pool.query("DELETE FROM staff_reviewers WHERE user_id = $1", [staffId]);
    assert.equal((await request("/staff/cases", staffId)).status, 403);
    assert.equal((await request("/access/status", staffId)).data.staff, false);
    const legacyOwner = await pool.query("SELECT owner_user_id FROM routing_history WHERE id = $1", [legacyId]);
    assert.equal(legacyOwner.rows[0].owner_user_id, null);
  } finally {
    await pool.query("DELETE FROM demo_accounts WHERE user_id = ANY($1::text[])", [[residentA, residentB, staffId]]);
    await pool.query("DELETE FROM staff_cases WHERE namespace = $1", [namespace]);
    await pool.query("DELETE FROM staff_reviewers WHERE user_id = ANY($1::text[])", [[residentA, residentB, staffId]]);
    await pool.query("DELETE FROM routing_history WHERE owner_user_id = ANY($1::text[]) OR id = $2", [[residentA, residentB, staffId], legacyId ?? -1]);
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await pool.end();
  }
});
