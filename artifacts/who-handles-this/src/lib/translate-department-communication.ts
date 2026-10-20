import type { DepartmentCommunication } from '@workspace/api-client-react';
import { requireCompleteTranslation } from '../translation-utils';

type Translate = (input: {
  text: string[];
  targetLanguage: string;
  sourceLanguage: string;
}) => Promise<{ translatedText: string[] }>;

const greetings: Record<string, string> = {
  es: 'Hola', de: 'Guten Tag', vi: 'Kính gửi',
  zh: '您好', 'zh-TW': '您好', tl: 'Magandang araw',
};

/**
 * Only server-curated prose enters translation. Verified recipients, dates and
 * official URLs are copied byte-for-byte from the original communication.
 * Resident edits never pass through this function.
 */
export async function translateDepartmentCommunication(
  communication: DepartmentCommunication,
  language: string,
  translate: Translate,
): Promise<DepartmentCommunication> {
  if (language === 'en' || language === 'auto') return communication;
  const text = [communication.channelNote, communication.fallbackLabel];
  const salutation = communication.emailDraft?.body.match(/^Hello ([^\n]+),\n\n/);
  const greeting = greetings[language === 'zh-CN' ? 'zh' : language];
  if (salutation && !greeting) throw new Error('Unsupported email template language.');
  if (communication.emailDraft) {
    text.push(communication.emailDraft.subject,
      salutation ? communication.emailDraft.body.slice(salutation[0].length) : communication.emailDraft.body);
  }
  // Translators sometimes alter acronyms (for example EDD becomes DDD).
  // Translate surrounding prose separately and reinsert exact program names.
  const prose: string[] = [];
  const segments = text.map(value => value.split(/(\b(?:EDD|DMV)\b)/g).map(part => {
    if (!part.trim() || /^(EDD|DMV)$/.test(part)) return { literal: part };
    const index = prose.push(part.trim()) - 1;
    return { index, prefix: part.match(/^\s*/)?.[0] ?? '', suffix: part.match(/\s*$/)?.[0] ?? '' };
  }));
  const response = await translate({ text: prose, targetLanguage: language, sourceLanguage: 'en' });
  const translatedProse = requireCompleteTranslation(response.translatedText, prose.length);
  const translated = segments.map(parts => parts.map(part =>
    'literal' in part ? part.literal : `${part.prefix}${translatedProse[part.index!].trim()}${part.suffix}`).join(''));
  const body = salutation
    ? `${greeting} ${salutation[1]},\n\n${translated[3]}`
    : translated[3];
  return {
    ...communication,
    channelNote: translated[0],
    fallbackLabel: translated[1],
    ...(communication.emailDraft ? {
      emailDraft: {
        ...communication.emailDraft,
        subject: translated[2],
        body,
      },
    } : {}),
  };
}