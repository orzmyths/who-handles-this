import type { AgencyContact } from '@workspace/api-client-react';
import { chunkArray, requireCompleteTranslation } from '../translation-utils';

type Translate = (input: {
  text: string[];
  targetLanguage: string;
  sourceLanguage: string;
}) => Promise<{ translatedText: string[] }>;

// Keep official program identifiers and phone numbers in prose as well as in
// destinations. Never send URLs, review metadata or resident text to translation.
const identifiers = /(\b(?:myEDD|EDD|DMV|CalFresh|Medi-Cal|BenefitsCal|CAPI|311)\b|\b1-\d{3}-\d{3}-\d{4}\b|\b3-1-1\b|https:\/\/[^\s]+|except County holidays|except state holidays)/g;

// "Holidays" can otherwise become personal vacations in machine translation.
// Preserve the published exclusion, including which government observes it.
export const CONTACT_HOLIDAY_EXCLUSIONS: Record<string, [string, string]> = {
  es: ['excepto los días festivos del condado', 'excepto los días festivos estatales'],
  de: ['außer an Feiertagen des Countys', 'außer an Feiertagen des Bundesstaates'],
  vi: ['trừ các ngày lễ của Quận', 'trừ các ngày lễ của tiểu bang'],
  zh: ['县政府节假日除外', '州政府节假日除外'],
  'zh-TW': ['縣政府假日除外', '州政府假日除外'],
  tl: ['maliban sa mga holiday ng County', 'maliban sa mga holiday ng estado'],
};

export async function translateAgencyContacts(
  contacts: AgencyContact[],
  language: string,
  translate: Translate,
): Promise<AgencyContact[]> {
  if (language === 'en' || language === 'auto' || !contacts.length) return contacts;
  const prose: string[] = [];
  const segment = (text: string) => text.split(identifiers).map((part, index) => {
    if (part === 'except County holidays' || part === 'except state holidays') {
      const exclusions = CONTACT_HOLIDAY_EXCLUSIONS[language];
      if (!exclusions) throw new Error('Unsupported contact holiday language.');
      return { literal: exclusions[part === 'except County holidays' ? 0 : 1] };
    }
    if (index % 2 || !part.trim()) return { literal: part };
    return {
      index: prose.push(part.trim()) - 1,
      prefix: part.match(/^\s*/)?.[0] ?? '',
      suffix: part.match(/\s*$/)?.[0] ?? '',
    };
  });
  const fields = contacts.map(contact => ({
    label: segment(contact.label),
    hours: contact.hours ? segment(contact.hours) : undefined,
    note: contact.note ? segment(contact.note) : undefined,
  }));
  const chunks = chunkArray(prose, 20);
  const responses = await Promise.all(chunks.map(text =>
    translate({ text, targetLanguage: language, sourceLanguage: 'en' })));
  const translated = responses.flatMap((response, index) =>
    requireCompleteTranslation(response.translatedText, chunks[index].length));
  const join = (parts: ReturnType<typeof segment>) => parts.map(part =>
    'literal' in part ? part.literal : `${part.prefix}${translated[part.index!].trim()}${part.suffix}`).join('');
  return contacts.map((contact, index) => {
    const localized = {
      ...contact,
      label: join(fields[index].label),
      ...(fields[index].hours ? { hours: join(fields[index].hours!) } : {}),
      ...(fields[index].note ? { note: join(fields[index].note!) } : {}),
    };
    // A changed hour or interpreter-menu digit could send residents to the
    // wrong service. Reject such output instead of displaying altered guidance.
    for (const key of ['label', 'hours', 'note'] as const) {
      if (JSON.stringify(contact[key]?.match(/\d+/g) ?? []) !==
        JSON.stringify(localized[key]?.match(/\d+/g) ?? [])) {
        throw new Error('Translation changed contact guidance numbers.');
      }
    }
    return localized;
  });
}