import assert from 'node:assert/strict';
import { test } from 'node:test';
import translations from '../artifacts/who-handles-this/src/ui-translations.json';
import { DEFAULT_UI_STRINGS } from '../artifacts/who-handles-this/src/language-context';
import { getEmailSafetyCopy } from '../artifacts/who-handles-this/src/components/departmentEmailCopy';

for (const language of ['es', 'de', 'vi', 'zh', 'zh-TW', 'tl'] as const) {
  test(`${language}: complete bundled UI and curated email safety wording`, () => {
    const copy = translations[language];
    assert.deepEqual(Object.keys(copy).sort(), Object.keys(DEFAULT_UI_STRINGS).sort());
    for (const key of Object.keys(DEFAULT_UI_STRINGS) as (keyof typeof DEFAULT_UI_STRINGS)[]) {
      assert.equal(typeof copy[key], 'string', `${language}: ${key}`);
      assert.ok(copy[key].trim(), `${language}: empty ${key}`);
    }
    for (const [key, value] of Object.entries(getEmailSafetyCopy(language))) {
      assert.equal(copy[key as keyof typeof copy], value, `${language}: curated safety wording changed`);
    }
    assert.notEqual(copy.startOver, DEFAULT_UI_STRINGS.startOver);
    assert.notEqual(copy.contactHeading, DEFAULT_UI_STRINGS.contactHeading);
    for (const key of ['submitBtn', 'privacyAck', 'historyTitle', 'historyPrivacy', 'contactTranslationFailed', 'emailTranslationFailed', 'translationFailed'] as const) {
      assert.notEqual(copy[key], DEFAULT_UI_STRINGS[key], `${language}: ${key} silently fell back to English`);
    }
  });
}
