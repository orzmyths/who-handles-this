import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CONTACT_HOLIDAY_EXCLUSIONS, translateAgencyContacts } from '../artifacts/who-handles-this/src/lib/translate-agency-contacts';
import { AGENCIES } from '../artifacts/api-server/src/lib/agency-data';

for (const language of ['auto', 'en', 'es', 'de', 'vi', 'zh', 'zh-TW', 'tl']) {
  test(`${language}: all contact purposes and hours translate without changing evidence or destinations`, async () => {
    for (const agency of AGENCIES) {
      // JSON serialization mirrors saved-result cards, not just live records.
      for (const contacts of [agency.contactOptions, JSON.parse(JSON.stringify(agency.contactOptions))]) {
        const original = JSON.stringify(contacts);
        let calls = 0;
        const localized = await translateAgencyContacts(contacts, language, async input => {
          calls++;
          assert.equal(input.sourceLanguage, 'en');
          assert.equal(input.targetLanguage, language);
          assert.ok(input.text.length <= 20);
          assert.ok(input.text.every(text => !/https:\/\/|\b(?:EDD|DMV|CAPI|CalFresh|Medi-Cal|BenefitsCal|myEDD|311)\b|1-\d{3}-\d{3}-\d{4}|3-1-1/.test(text)));
          return { translatedText: input.text.map(text => `[${language}] ${text}`) };
        });
        assert.equal(JSON.stringify(contacts), original);
        localized.forEach((contact, index) => {
          const source = contacts[index];
          for (const key of ['value', 'kind', 'sourceUrl', 'hoursSourceUrl', 'lastReviewed', 'reviewAfterDays'] as const) {
            assert.equal(contact[key], source[key]);
          }
          for (const key of ['label', 'hours', 'note'] as const) {
            assert.equal(Boolean(contact[key]), Boolean(source[key]));
            if (source[key] && language !== 'en' && language !== 'auto') {
              assert.ok(contact[key]!.includes(`[${language}]`));
              // Numeric times, menu choices, holiday exclusions and purpose
              // restrictions must not be omitted from translation input.
              const exclusions = CONTACT_HOLIDAY_EXCLUSIONS[language];
              assert.equal(contact[key]!.replaceAll(`[${language}] `, ''), source[key]
                .replaceAll('except County holidays', exclusions[0])
                .replaceAll('except state holidays', exclusions[1]));
            }
          }
        });
        if (language === 'en' || language === 'auto') {
          assert.equal(calls, 0);
          assert.equal(localized, contacts);
        } else assert.ok(calls > 0);
      }
    }
  });
}

test('missing optional fields and empty historical records stay absent', async () => {
  const contacts = [{ ...AGENCIES[0].contactOptions[0], hours: undefined, note: undefined }];
  const localized = await translateAgencyContacts(contacts, 'vi', async input => ({
    translatedText: input.text.map(text => `VI ${text}`),
  }));
  assert.equal(localized[0].hours, undefined);
  assert.equal(localized[0].note, undefined);
  assert.deepEqual(await translateAgencyContacts([], 'vi', async () => { throw new Error('unexpected request'); }), []);
});

test('partial, blank and failed translations reject the whole contact list', async () => {
  for (const translatedText of [[], ['one field'], ['', '', '']]) {
    await assert.rejects(translateAgencyContacts(AGENCIES[0].contactOptions, 'vi',
      async () => ({ translatedText })), /incomplete/);
  }
  await assert.rejects(translateAgencyContacts(AGENCIES[0].contactOptions, 'vi',
    async () => { throw new Error('unavailable'); }), /unavailable/);
});

test('changed published hours or interpreter menu digits fail closed', async () => {
  for (const agency of [AGENCIES[0], AGENCIES.find(agency => agency.id === 'ca-edd')!]) {
    await assert.rejects(translateAgencyContacts(agency.contactOptions, 'es', async input => ({
      translatedText: input.text.map(text => text.replace(/\d/g, digit => digit === '9' ? '0' : String(Number(digit) + 1))),
    })), /changed contact guidance numbers/);
  }
});

test('holiday exclusions use fixed local wording even when a translator drops them', async () => {
  for (const language of Object.keys(CONTACT_HOLIDAY_EXCLUSIONS)) {
    for (const id of ['scc-social-services', 'ca-edd']) {
      const agency = AGENCIES.find(agency => agency.id === id)!;
      const localized = await translateAgencyContacts(agency.contactOptions, language, async input => {
        assert.ok(input.text.every(text => !text.includes('holidays')));
        return { translatedText: input.text };
      });
      const exclusion = CONTACT_HOLIDAY_EXCLUSIONS[language][id === 'ca-edd' ? 1 : 0];
      assert.ok(localized[0].hours!.includes(exclusion));
    }
  }
});