import { test } from "node:test";
import assert from "node:assert/strict";
import { demoSignInAllowed, demoAccountIdentity, validDevelopmentPasscode } from "../artifacts/api-server/src/lib/dev-sign-in";

test("shared demo supports only matching development/test and production/live environments", () => {
  assert.equal(demoSignInAllowed({ NODE_ENV: "development", CLERK_SECRET_KEY: "sk_test_fixture" }), true);
  assert.equal(demoSignInAllowed({ NODE_ENV: "production", CLERK_SECRET_KEY: "sk_live_fixture" }), true);
  for (const NODE_ENV of ["production", "test", undefined]) {
    assert.equal(demoSignInAllowed({ NODE_ENV, CLERK_SECRET_KEY: "sk_test_fixture" }), false);
  }
  assert.equal(demoSignInAllowed({ NODE_ENV: "development", CLERK_SECRET_KEY: "sk_live_fixture" }), false);
  assert.equal(demoSignInAllowed({ NODE_ENV: "development" }), false);
});

test("published demo identity is distinct from the preview test account", () => {
  const preview = demoAccountIdentity({ NODE_ENV: "development" });
  const production = demoAccountIdentity({ NODE_ENV: "production" });
  assert.notEqual(preview.externalId, production.externalId);
  assert.notEqual(preview.email, production.email);
});

test("passcode matching fails closed and does not accept malformed or oversized inputs", () => {
  const expected = "unit-test-fixture";
  assert.equal(validDevelopmentPasscode(expected, expected), true);
  for (const value of [undefined, null, 12, "", "wrong", "x".repeat(129)]) {
    assert.equal(validDevelopmentPasscode(value, expected), false);
  }
  assert.equal(validDevelopmentPasscode(expected, undefined), false);
});