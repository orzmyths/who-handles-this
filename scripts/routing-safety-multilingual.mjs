import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const copy = JSON.parse(readFileSync(new URL("../artifacts/who-handles-this/src/ui-translations.json", import.meta.url)));
export const spanishReport = "Recibí una carta sobre mis prestaciones por desempleo y mi factura de basura.";
export const germanReport = "Mein Führerschein ist verloren gegangen.";
export const spanishAmbiguousReport = "No sé si la carta trata del desempleo o de la ayuda alimentaria.";

// These are extraction fixtures, not a second keyword matcher or a live translator.
export const normalizedReports = new Map([
  [spanishReport, "I got a letter about my unemployment benefits and my trash bill."],
  [germanReport, "I lost my driver's license."],
  [spanishAmbiguousReport, "I am not sure whether this is an unemployment or CalFresh notice."],
]);

export function createTranslationFixture() {
  const requests = [];
  let mode = "success";
  const reply = (entry, outcome) => {
    if (entry.done || entry.response.destroyed) return;
    entry.done = true;
    entry.response.writeHead(outcome === "failure" ? 503 : 200, { "content-type": "application/json" });
    entry.response.end(JSON.stringify(outcome === "failure" ? { error: "Deterministic translation outage" } : {
      translatedText: entry.input.text.map(text => `[${entry.input.targetLanguage}] ${text}`),
      detectedSourceLanguage: "en",
    }));
  };
  return {
    requests,
    setMode(value) { mode = value; },
    release(language, outcome = "success") {
      for (const entry of requests) {
        if (!language || entry.input.targetLanguage === language) reply(entry, outcome);
      }
    },
    async waitForPendingRequest(language, text) {
      const deadline = Date.now() + 15_000;
      while (Date.now() < deadline) {
        if (requests.some(entry => !entry.done && !entry.response.destroyed &&
          entry.input.targetLanguage === language && entry.input.text.includes(text))) return;
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      throw new Error(`Translation fixture did not receive the expected pending ${language} request.`);
    },
    async handle(request, response) {
      let body = "";
      for await (const chunk of request) body += chunk;
      const entry = { input: JSON.parse(body), response, done: false };
      requests.push(entry);
      if (mode !== "pending") reply(entry, mode);
    },
  };
}

export async function runMultilingualBrowserChecks({
  cdp, sessionId, origin, evaluate, wait, translations, savedEmail, setHistoryFixture,
}) {
  const exec = expression => evaluate(cdp, sessionId, expression);
  const until = (expression, message) => wait(cdp, sessionId, expression, message);
  const selector = `document.querySelector('[data-testid="select-language"]')`;
  const navigate = async path => {
    assert(!await exec(`Boolean(window.languageWasDisabled)`), "A previous document disabled language selection");
    await cdp.command("Page.navigate", { url: `${origin}${path}` }, sessionId);
    await until(`${selector} !== null`, `language selector on ${path}`);
  };
  const switchTo = async language => {
    await exec(`(() => {
      const select = ${selector};
      if (!select || select.disabled) throw new Error('Language selection is unavailable');
      select.value = ${JSON.stringify(language)};
      select.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await until(`${selector}.value === ${JSON.stringify(language)} &&
      document.documentElement.lang === ${JSON.stringify(language === "zh" ? "zh-CN" : language)} &&
      !${selector}.disabled`, `immediate bundled locale ${language}`);
  };
  const submit = async description => {
    await until(`!!document.querySelector('[data-testid="input-issue"]')`, "resident form");
    await exec(`(() => {
      const input = document.querySelector('[data-testid="input-issue"]');
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input, ${JSON.stringify(description)});
      input.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('input[type="checkbox"]').click();
    })()`);
    await until(`!document.querySelector('[data-testid="button-find-agency"]').disabled`, "translated form ready");
    await exec(`document.querySelector('[data-testid="button-find-agency"]').click()`);
  };
  const expose = async testId => {
    await until(`!!document.querySelector('[data-testid="${testId}"]')`, testId);
    await exec(`document.querySelector('[data-testid="${testId}"]').scrollIntoView()`);
  };
  const contactSelector = `[data-testid="agency-contacts-scc-tax-collections"]`;
  const emailSelector = `[data-testid="email-preview-scc-tax-collections"]`;
  const contact = `document.querySelector('${contactSelector}')`;
  const email = `document.querySelector('${emailSelector}')`;
  const approved = `!document.querySelector('[data-testid="button-open-draft-scc-tax-collections"]').disabled`;
  const cleared = `document.querySelector('[data-testid="button-open-draft-scc-tax-collections"]')?.disabled &&
    !document.querySelector('[data-testid="check-content-scc-tax-collections"]')?.checked &&
    !document.querySelector('[data-testid="check-sender-scc-tax-collections"]')?.checked`;
  const approve = async () => {
    await exec(`(() => {
      document.querySelector('[data-testid="check-content-scc-tax-collections"]').click();
      document.querySelector('[data-testid="check-sender-scc-tax-collections"]').click();
    })()`);
    await until(approved, "both approvals enable preparation (without opening email)");
  };
  const assertLinks = async () => {
    assert(await exec(`(() => {
      const section = ${contact};
      return !!section?.querySelector('a[href="tel:+14088087900"]') &&
        !!section?.querySelector('a[href="https://dtac.santaclaracounty.gov/"], a[href="https://dtac.santaclaracounty.gov/about-us/our-office-location-and-operating-information"]') &&
        !!${email}?.querySelector('a[href^="https://"]') && !${selector}.disabled;
    })()`), "Verified phone, official sources and language selection must survive translation work");
  };
  const retry = async section => {
    await exec(`${section}.querySelector('button').click()`);
    await until(`${section}.querySelector('[role="status"]') !== null`, "retry returns to pending state");
    await assertLinks();
  };

  await navigate("/");
  // Observe disabled transitions, not just the final select state, in every document.
  await cdp.command("Page.addScriptToEvaluateOnNewDocument", { source: `
    window.languageWasDisabled = false;
    new MutationObserver(records => {
      if (document.querySelector('[data-testid="select-language"]')?.disabled ||
        records.some(record => record.target.matches?.('[data-testid="select-language"]') &&
          record.attributeName === 'disabled' && record.oldValue !== null)) window.languageWasDisabled = true;
    }).observe(document, { subtree: true, attributes: true, attributeOldValue: true, childList: true });
  ` }, sessionId);
  await navigate("/");
  const before = translations.requests.length;
  for (const language of ["es", "de", "vi", "zh", "zh-TW", "tl", "en"]) {
    await switchTo(language);
    assert(await exec(`document.body.textContent.includes(${JSON.stringify(language === "en" ? "Find the right agency" : copy[language].submitBtn)})`),
      `${language}: missing bundled submit label`);
  }
  assert.equal(translations.requests.length, before, "Bundled interface labels requested translation");
  console.log("PASS All bundled locales switch immediately without translation requests");

  translations.setMode("pending");
  await switchTo("es");
  await submit(spanishReport);
  await until(`!!document.querySelector('[data-testid="additional-agency-sj-environmental-services"]')`, "Spanish combined report retains both issues");
  assert(await exec(`document.querySelector('.primary-result-card').textContent.includes('California Employment Development Department') &&
    document.body.textContent.includes(${JSON.stringify(spanishReport)})`), "Spanish original report or primary EDD recommendation lost");
  await expose("agency-contacts-ca-edd");
  await until(`!!document.querySelector('[data-testid="agency-contacts-ca-edd"] [role="status"]')`, "Spanish contact guidance held pending");
  await expose("agency-contacts-sj-environmental-services");
  await until(`!!document.querySelector('[data-testid="agency-contacts-sj-environmental-services"] [role="status"]')`, "Spanish secondary guidance pending");
  assert(await exec(`!!document.querySelector('a[href="tel:+18003005616"]') &&
    !!document.querySelector('a[href="tel:+14085353500"]') && !${selector}.disabled`), "Pending combined contacts hid phone links");
  await switchTo("de");
  await switchTo("vi");
  await switchTo("de");
  translations.release("es");
  translations.release("vi");
  assert(await exec(`${selector}.value === 'de' && document.documentElement.lang === 'de' &&
    !document.body.textContent.includes('[es]') && !document.body.textContent.includes('[vi]')`),
    "A stale translation overwrote the latest locale");
  translations.setMode("success");
  translations.release("de");
  await until(`document.body.textContent.includes('[de]')`, "latest dynamic translation appears");
  assert(await exec(`${selector}.value === 'de' && !window.languageWasDisabled`), "Rapid locale switching disabled the selector");
  console.log("PASS Spanish combined routing and rapid switching ignore out-of-order responses");

  await exec(`document.querySelector('[data-testid="button-start-over"]').click()`);
  await submit(germanReport);
  await until(`document.querySelector('.primary-result-card')?.textContent.includes('California Department of Motor Vehicles')`, "German-only report routes to DMV");
  const saved = await exec(`fetch('/api/routing/history').then(r => r.json())`);
  for (const [description, language, primary, additional] of [
    [spanishReport, "es", "ca-edd", ["sj-environmental-services"]],
    [germanReport, "de", "ca-dmv", []],
  ]) {
    const record = saved.find(entry => entry.input.description === description);
    assert(record, `Missing saved ${language} original`);
    assert.equal(record.input.language, language, "Submission lost selected language");
    assert.equal(record.output.selected?.id, primary);
    assert.deepEqual((record.output.additionalRecommendations ?? []).map(item => item.selected.id), additional);
  }
  await exec(`document.querySelector('[data-testid="link-history"]').click()`);
  await until(`document.querySelector('.history-record') !== null`, "client navigation to saved records");
  const checkHistory = async () => {
    assert(await exec(`${selector}.value === 'de' && document.documentElement.lang === 'de' &&
      document.body.textContent.includes(${JSON.stringify(copy.de.historyTitle)}) &&
      document.body.textContent.includes(${JSON.stringify(spanishReport)}) &&
      document.body.textContent.includes(${JSON.stringify(germanReport)}) &&
      !!document.querySelector('[data-testid="additional-agency-sj-environmental-services"]') &&
      !window.languageWasDisabled`), "Saved multilingual reports, combined agencies or selected locale lost");
  };
  await checkHistory();
  await navigate("/history");
  await until(`document.querySelector('.history-record') !== null`, "saved history after full reload");
  await checkHistory();
  console.log("PASS German-only submission and original multilingual reports survive history navigation/reload");

  // A single saved record makes viewport-triggered pending/failure tests predictable.
  setHistoryFixture([savedEmail]);
  translations.setMode("pending");
  await switchTo("es");
  await navigate("/history");
  await expose("agency-contacts-scc-tax-collections");
  await until(`${contact}.querySelector('[role="status"]') !== null`, "contact translation pending");
  await expose("email-preview-scc-tax-collections");
  await until(`${email}.querySelector('[role="status"]') !== null`, "email instructions pending");
  // A status placeholder exists before IntersectionObserver enables the query.
  // Do not scroll away until this particular request has actually started.
  await translations.waitForPendingRequest("es", savedEmail.output.communication.emailDraft.subject);
  await assertLinks();
  assert(await exec(`!document.querySelector('[data-testid="button-open-draft-scc-tax-collections"]')`), "Pending instructions exposed email approval");
  // General guidance has its own error/retry path, separate from contacts and email.
  await exec(`document.querySelector('.history-record').scrollIntoView()`);
  await until(`document.querySelector('.history-record span [role="status"]') !== null`, "generated guidance pending");
  await translations.waitForPendingRequest("es", savedEmail.output.explanation);
  translations.setMode("failure");
  translations.release("es", "failure");
  await until(`${contact}.querySelector('[role="alert"]') !== null &&
    ${email}.querySelector('[role="alert"]') !== null &&
    document.querySelector('.history-record span [role="alert"]') !== null`, "all dynamic translation failures visible");
  await assertLinks();
  assert(await exec(`${contact}.textContent.includes(${JSON.stringify(copy.es.contactTranslationFailed)}) &&
    ${email}.textContent.includes(${JSON.stringify(copy.es.emailTranslationFailed)}) &&
    !document.querySelector('[data-testid="button-open-draft-scc-tax-collections"]')`), "Failure wording or email safety missing");
  const failedCount = translations.requests.length;
  // Retry each independent surface with responses held until the test releases them.
  translations.setMode("pending");
  await retry(contact);
  await retry(email);
  await exec(`document.querySelectorAll('.history-record span [role="alert"] button').forEach(button => button.click())`);
  await until(`document.querySelector('.history-record span [role="status"]') !== null`, "guidance retry pending");
  assert(translations.requests.length > failedCount, "Retry did not request translation");
  translations.setMode("success");
  translations.release("es");
  await until(`!!document.querySelector('[data-testid="input-body-scc-tax-collections"]') &&
    ${contact}.querySelector('[data-testid^="contact-"]') !== null &&
    !document.querySelector('.history-record span [role="alert"]')`, "translation retries restore guidance and composer");
  await assertLinks();
  await until(cleared, "fresh Spanish draft requires both reviews");
  await approve();
  await switchTo("de");
  await until(cleared, "locale change clears email approvals");
  await approve();
  for (const [testId, prototype, value] of [
    ["input-subject-scc-tax-collections", "HTMLInputElement", "Lokale Betreffänderung"],
    ["input-body-scc-tax-collections", "HTMLTextAreaElement", "Lokale Nachricht ohne persönliche Daten."],
  ]) {
    const requestCount = translations.requests.length;
    await exec(`(() => {
      const input = document.querySelector('[data-testid="${testId}"]');
      Object.getOwnPropertyDescriptor(${prototype}.prototype, 'value').set.call(input, ${JSON.stringify(value)});
      input.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await until(cleared, "localized edit revokes both approvals");
    assert.equal(translations.requests.length, requestCount, "Resident edits were sent for translation");
    await approve();
  }
  await switchTo("es");
  await until(cleared, "cached locale also clears approvals");
  await approve();
  await navigate("/history");
  await expose("email-preview-scc-tax-collections");
  await until(cleared, "reload clears localized approvals");
  assert.deepEqual(await exec(`fetch('/api/routing/history').then(r => r.json())`), [savedEmail],
    "Localized editing changed saved report evidence");
  for (const entry of translations.requests) {
    assert(!entry.input.text.some(text => [spanishReport, germanReport, "Lokale Betreffänderung", "Lokale Nachricht ohne persönliche Daten."].includes(text)),
      "Resident text was sent to optional guidance translation");
  }
  assert(await exec(`!window.languageWasDisabled`), "Language selector became disabled");
  console.log("PASS Contact/email/guidance pending, failure and manual retry retain verified links; locale changes, edits and reload revoke approval");
  setHistoryFixture(null);
  await switchTo("en");
}