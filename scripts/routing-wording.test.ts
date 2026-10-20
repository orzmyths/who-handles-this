import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AGENCIES } from '../artifacts/api-server/src/lib/agency-data';
import { matches, matchRoutingEvidence, nextStepFor, separateIssueMatches } from '../artifacts/api-server/src/lib/routing-matches';

const dmv = AGENCIES.find(agency => agency.id === 'ca-dmv')!;
test('An incomplete English phrase does not discard direct German DMV evidence', () => {
  const original = 'Mein Führerschein ist abgelaufen.';
  const evidence = matchRoutingEvidence(original, 'My credential has expired.');
  assert.equal(evidence.text, original);
  assert.deepEqual(evidence.matches.map(match => match.a.id), ['ca-dmv']);
  assert.match(nextStepFor(dmv, evidence.text), /renewal/);
});

test('Unknown text cannot be confirmed merely because normalization is incomplete', () => {
  assert.deepEqual(matchRoutingEvidence('An unknown service', 'A credential expired').matches, []);
});

test('Synonymous driver-license keywords count only once toward confidence', () => {
  assert.equal(matches("My driver's licence has expired.")[0].score, 1);
});
for (const text of [
  'Mein Führerschein ist abgelaufen.',
  'Mein Fuehrerschein ist abgelaufen.',
  "My driver's license has expired.",
  'My driving licence has expired.',
  'My driving license has expired.',
  'My driving permit has expired.',
  "My driver's licence has expired.",
  'My driver’s licence has expired.',
  'My driver licence has expired.',
  'My driver-license has expired.',
  'I need to renew my drivers licence.',
]) {
  test(`DMV renewal: ${text}`, () => {
    assert.deepEqual(matches(text).map(match => match.a.id), ['ca-dmv']);
    assert.match(nextStepFor(dmv, text), /renewal/);
    assert.doesNotMatch(nextStepFor(dmv, text), /plate number|replacement/);
  });
}

for (const text of [
  'Mein Führerschein ist verloren gegangen.',
  'I lost my driving licence.',
  'My driving licence is missing.',
  'My driver’s license was stolen.',
]) {
  test(`DMV replacement: ${text}`, () => {
    assert.deepEqual(matches(text).map(match => match.a.id), ['ca-dmv']);
    assert.match(nextStepFor(dmv, text), /replacement/);
  });
}

for (const text of [
  'My business licence has expired.',
  'My hunting license has expired.',
  'My medical license has expired.',
  'My garbage collection was missed.',
]) {
  test(`Do not broaden DMV scope: ${text}`, () => {
    assert.ok(!matches(text).some(match => match.a.id === 'ca-dmv'));
  });
}

test('License renewal and a separate lost tax bill keep their own guidance', () => {
  const text = 'My driving licence has expired and I lost my property tax bill.';
  const found = matches(text);
  assert.deepEqual(separateIssueMatches(text, found).map(match => match.a.id), ['ca-dmv', 'scc-tax-collections']);
  assert.match(nextStepFor(dmv, text), /renewal/);
});