import { generateKeyPairSync, sign, randomUUID } from "node:crypto";

// Trusted local issuer for a subprocess fixture only. Never install these
// keys into the running application or use them with real Clerk tenants.
export function createClerkSessionFixture() {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const issuer = "routing-test.clerk.accounts.dev";
  const userId = `user_routingFixture${randomUUID().replaceAll("-", "")}`;
  const now = Math.floor(Date.now() / 1000);
  const encode = value => Buffer.from(JSON.stringify(value)).toString("base64url");
  const payload = `${encode({ alg: "RS256", typ: "JWT", kid: "local-fixture" })}.${encode({
    iss: `https://${issuer}`, sub: userId, sid: `sess_${userId}`,
    iat: now - 60, nbf: now - 60, exp: now + 7200, v: 2, sts: "active",
  })}`;
  const token = `${payload}.${sign("RSA-SHA256", Buffer.from(payload), privateKey).toString("base64url")}`;
  return {
    userId, token,
    cookie: `__session=${token}; __client_uat=${now - 60}`,
    environment: {
      CLERK_PUBLISHABLE_KEY: `pk_test_${Buffer.from(`${issuer}$`).toString("base64")}`,
      CLERK_SECRET_KEY: "sk_test_local_fixture_not_a_real_credential",
      CLERK_JWT_KEY: publicKey.export({ type: "spki", format: "pem" }).toString(),
    },
  };
}
