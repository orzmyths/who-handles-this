import { translateText } from '@workspace/api-client-react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/language-context';
import { useNearViewport } from '@/lib/use-near-viewport';
import { requireCompleteTranslation } from '@/translation-utils';

// Only generated explanations and official agency prose belong here.
// Resident descriptions, email edits, recipients and URLs stay untouched.
export function TranslatedText({ text }: { text: string }) {
  const { language, t } = useLanguage();
  const { ref, visible } = useNearViewport();
  const needed = language !== 'en' && language !== 'auto' && Boolean(text);
  const translated = useQuery({
    queryKey: ['routing-guidance', language, text],
    queryFn: async () => {
      const response = await translateText({ text: [text], targetLanguage: language });
      return requireCompleteTranslation(response.translatedText, 1)[0];
    },
    enabled: needed && visible,
    retry: false,
    staleTime: Infinity,
  });
  return (
    <span ref={ref} lang={needed && !translated.data ? 'en' : language === 'auto' ? 'en' : language}>
      {needed ? translated.data ?? text : text}
      {needed && !translated.data && (
        <span className="block text-xs mt-2" lang={language} role={translated.isError ? 'alert' : 'status'}>
          {translated.isError ? t.translationFailed : t.contactTranslating}
          {translated.isError && (
            <button type="button" className="underline ml-2" onClick={() => void translated.refetch()} disabled={translated.isFetching}>{t.retry}</button>
          )}
        </span>
      )}
    </span>
  );
}