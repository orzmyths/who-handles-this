import { test } from "node:test";
import assert from "node:assert/strict";
import { submissionErrorMessage } from "../artifacts/who-handles-this/src/lib/submission-errors";

test("expired sessions require sign-in rather than repeated submission", () => {
  assert.match(submissionErrorMessage({ status: 401 }), /Sign in again/);
});
test("rate limits explain the waiting period", () => {
  assert.match(submissionErrorMessage({ status: 429 }), /Wait one minute/);
});
test("refused requests provide a recovery action", () => {
  assert.match(submissionErrorMessage({ status: 403 }), /Refresh this page/);
});
test("invalid or oversized descriptions explain the input limit", () => {
  for (const status of [400, 413]) assert.match(submissionErrorMessage({ status }), /2,000/);
});
test("server errors never expose internal details", () => {
  const message = submissionErrorMessage({ status: 500, data: { error: "SECRET SQL STACK" } });
  assert.match(message, /Your text is still here/);
  assert.doesNotMatch(message, /SECRET SQL STACK/);
});
test("network and unknown errors remain actionable without exposing input", () => {
  for (const error of [new TypeError("Failed to fetch"), null, undefined, "private input"]) {
    assert.match(submissionErrorMessage(error), /Check your connection/);
    assert.doesNotMatch(submissionErrorMessage(error), /private input/);
  }
});