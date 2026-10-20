import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DEFAULT_EMAIL_COPY, getEmailSafetyCopy } from '../artifacts/who-handles-this/src/components/departmentEmailCopy';
import { translateDepartmentCommunication } from '../artifacts/who-handles-this/src/lib/translate-department-communication';
import { requireCompleteTranslation } from '../artifacts/who-handles-this/src/translation-utils';
import { AGENCIES } from '../artifacts/api-server/src/lib/agency-data';
import { communicationFor } from '../artifacts/api-server/src/lib/department-communication';

const now = Date.parse('2026-10-05');
const languages = ['en', 'auto', 'es', 'de', 'vi', 'zh', 'zh-TW', 'tl'];

test('all email safety controls participate in the UI translation batch', () => {
  for (const key of ['sendsNothing', 'sensitive', 'confirmContent', 'confirmSender',
    'openedNote', 'invalidRecipient', 'staleEvidence', 'emailTranslationFailed',
    'emailTranslating', 'copyAll'] as const) {
    assert.ok(DEFAULT_EMAIL_COPY[key].trim());
  }
  assert.match(DEFAULT_EMAIL_COPY.bodyHelp, /edits are not translated/);
});

test('every selected language has fixed safety wording, never an English fallback', () => {
  for (const language of languages.filter(language => language !== 'en' && language !== 'auto')) {
    const copy = getEmailSafetyCopy(language);
    for (const key of ['sendsNothing', 'sensitive', 'confirmContent', 'confirmSender', 'openedNote'] as const) {
      assert.ok(copy[key].trim());
      assert.notEqual(copy[key], DEFAULT_EMAIL_COPY[key]);
    }
  }
  assert.deepEqual(getEmailSafetyCopy('zh-CN'), getEmailSafetyCopy('zh'));
});

for (const language of languages) {
  test(`${language}: all seven agencies localize only curated prose, not destinations`, async () => {
    for (const agency of AGENCIES) {
      const canonical = communicationFor(agency, agency.includedExamples[0], now)!;
      assert.ok(canonical);
      const original = JSON.stringify(canonical);
      let calls = 0;
      const localized = await translateDepartmentCommunication(canonical, language, async input => {
        calls++;
        assert.equal(input.targetLanguage, language);
        assert.equal(input.sourceLanguage, 'en');
        assert.ok(input.text.every(text => !/\b(?:EDD|DMV)\b/.test(text)));
        // The curated greeting/agency name is handled outside translation.
        if (canonical.emailDraft) assert.ok(input.text.every(text => !text.startsWith('Hello ')));
        for (const text of input.text) {
          assert.ok(!text.includes(canonical.sourceUrl));
          assert.ok(!text.includes(canonical.fallbackUrl));
          if (canonical.emailDraft) assert.ok(!text.includes(canonical.emailDraft.recipient));
        }
        return { translatedText: input.text.map(text => `[${language}] ${text}`) };
      });
      assert.equal(localized.sourceUrl, canonical.sourceUrl);
      assert.equal(localized.fallbackUrl, canonical.fallbackUrl);
      assert.equal(localized.lastReviewed, canonical.lastReviewed);
      assert.equal(localized.emailDraft?.recipient, canonical.emailDraft?.recipient);
      assert.equal(Boolean(localized.emailDraft), Boolean(canonical.emailDraft));
      assert.equal(JSON.stringify(canonical), original);
      if (language === 'en' || language === 'auto') {
        assert.equal(calls, 0);
        assert.equal(localized, canonical);
      } else {
        assert.equal(calls, 1);
        assert.ok(localized.channelNote.startsWith(`[${language}]`));
        assert.ok(localized.fallbackLabel.startsWith(`[${language}]`));
        if (localized.emailDraft) {
          assert.ok(localized.emailDraft.subject.startsWith(`[${language}]`));
          assert.ok(localized.emailDraft.body.includes(`[${language}]`));
          assert.ok(!localized.emailDraft.body.startsWith('Hello '));
        }
      }
    }
  });
}

test('partial, blank and invalid translations fail closed', async () => {
  const agency = AGENCIES.find(agency => agency.id === 'sj-code-enforcement')!;
  const canonical = communicationFor(agency, 'unsafe housing', now)!;
  for (const text of [[], ['only one field'], ['', 'label', 'subject', 'body']]) {
    await assert.rejects(translateDepartmentCommunication(canonical, 'vi',
      async () => ({ translatedText: text })), /incomplete/);
  }
  assert.throws(() => requireCompleteTranslation(['valid', null], 2), /incomplete/);
  await assert.rejects(translateDepartmentCommunication(canonical, 'de',
    async () => { throw new Error('service unavailable'); }), /unavailable/);
});

test('official program acronyms are retained even if a translator would corrupt them', async () => {
  for (const id of ['ca-edd', 'ca-dmv']) {
    const agency = AGENCIES.find(agency => agency.id === id)!;
    const canonical = communicationFor(agency, agency.includedExamples[0], now)!;
    const localized = await translateDepartmentCommunication(canonical, 'vi', async input => ({
      translatedText: input.text.map(text => text.replaceAll('EDD', 'DDD').replaceAll('DMV', 'DVM')),
    }));
    const acronym = id === 'ca-edd' ? 'EDD' : 'DMV';
    assert.ok(localized.channelNote.includes(acronym));
    assert.ok(localized.fallbackLabel.includes(acronym));
  }
});

test('stale contact instructions remain draft-free in translation', async () => {
  const original = AGENCIES.find(agency => agency.id === 'sj-code-enforcement')!;
  const agency = { ...original, lastReviewed: '2027-03-20',
    contactOptions: original.contactOptions.map(contact => ({ ...contact, lastReviewed: '2027-03-20' })) };
  const canonical = communicationFor(agency, 'unsafe housing', Date.parse('2027-04-05'))!;
  assert.ok(canonical);
  assert.equal(canonical.emailDraft, undefined);
  const localized = await translateDepartmentCommunication(canonical, 'tl',
    async input => ({ translatedText: input.text.map(text => `TL ${text}`) }));
  assert.equal(localized.emailDraft, undefined);
  assert.equal(localized.sourceUrl, canonical.sourceUrl);
});