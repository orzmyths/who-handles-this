import { translateText, type Agency } from '@workspace/api-client-react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Phone } from 'lucide-react';
import { useLanguage } from '@/language-context';
import { formatDate } from './ResidentUI';
import { translateAgencyContacts } from '@/lib/translate-agency-contacts';
import { useNearViewport } from '@/lib/use-near-viewport';

const officialUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && [
      'www.sanjoseca.gov', '311.sanjoseca.gov', 'dtac.santaclaracounty.gov',
      'ssa.santaclaracounty.gov', 'edd.ca.gov', 'www.dmv.ca.gov',
    ].includes(url.hostname);
  } catch {
    return false;
  }
};

// Generated clients deserialize live dates; JSON history may contain strings.
const dateTime = (value: string | Date) => Date.parse(String(value).slice(0, 10));
const expired = (value: string | Date, days: number, now: number) => {
  const time = value instanceof Date ? value.getTime() : dateTime(value);
  return !Number.isFinite(time) || time > now || days !== 180 || now - time > days * 86400000;
};
const displayPhone = (value: string) =>
  value.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, '+1 ($1) $2-$3');

export function AgencyContacts({ agency }: { agency: Agency }) {
  const { t, language } = useLanguage();
  const { ref, visible } = useNearViewport();
  const contacts = agency.contactOptions;
  const now = Date.now();
  const stale = agency.staleTestFlag || expired(agency.lastReviewed, agency.reviewAfterDays, now) ||
    contacts?.some(contact => expired(contact.lastReviewed, contact.reviewAfterDays, now) ||
      !officialUrl(contact.sourceUrl) || (contact.hoursSourceUrl && !officialUrl(contact.hoursSourceUrl)) || (contact.kind === 'phone'
        ? !/^\+1\d{10}$/.test(contact.value) : !officialUrl(contact.value)));
  const needsTranslation = language !== 'en' && language !== 'auto';
  const translated = useQuery({
    queryKey: ['agency-contact-guidance', language, agency.id, contacts],
    queryFn: () => translateAgencyContacts(contacts!, language, translateText),
    enabled: needsTranslation && visible && Boolean(contacts?.length) && !stale,
    retry: false,
    staleTime: Infinity,
  });
  const localized = needsTranslation ? translated.data : contacts;

  return (
    <section ref={ref} className="agency-contacts" aria-label={t.contactHeading} data-testid={`agency-contacts-${agency.id}`}>
      <h3>{t.contactHeading}</h3>
      {!contacts?.length ? (
        <p>{t.contactNotSaved}</p>
      ) : stale ? (
        <p role="note" data-testid={`contacts-stale-${agency.id}`}>{t.contactNeedsReview}</p>
      ) : !localized ? (
        <div>
          <p role={translated.isError ? 'alert' : 'status'}>
            {translated.isError ? t.contactTranslationFailed : t.contactTranslating}
          </p>
          <ul>
            {contacts.filter(contact => contact.kind === 'phone').map(contact => (
              <li key={contact.value}>
                <a href={`tel:${contact.value}`} className="agency-contact-action">
                  <Phone size={15} aria-hidden="true" /> {displayPhone(contact.value)}
                </a>
                <details className="agency-contact-evidence">
                  <summary>{t.contactEnglishEvidence}</summary>
                  <p lang="en">{contact.label}{contact.hours && <> — {contact.hours}</>}{contact.note && <> — {contact.note}</>}</p>
                </details>
              </li>
            ))}
          </ul>
          {translated.isError && <button type="button" className="secondary-start-button mt-3" onClick={() => void translated.refetch()} disabled={translated.isFetching}>{t.retry}</button>}
          {officialUrl(agency.officialUrl) && <a href={agency.officialUrl} target="_blank" rel="noopener noreferrer">{t.sourceLabel} <ExternalLink size={12} aria-hidden="true" /></a>}
        </div>
      ) : (
        <ul>
          {localized.map((contact, index) => (
            <li key={`${contact.kind}-${contact.label}-${contact.value}`} data-testid={`contact-${agency.id}-${index}`}>
              <a
                href={contact.kind === 'phone' ? `tel:${contact.value}` : contact.value}
                target={contact.kind === 'online' ? '_blank' : undefined}
                rel={contact.kind === 'online' ? 'noopener noreferrer' : undefined}
                className="agency-contact-action"
              >
                {contact.kind === 'phone' ? <Phone size={15} aria-hidden="true" /> : <ExternalLink size={15} aria-hidden="true" />}
                <span>{contact.label}{contact.kind === 'phone' && <>: {displayPhone(contact.value)}</>}</span>
              </a>
              {contact.kind === 'phone' && (
                <p>{contact.hours ? <>{t.contactHours}: {contact.hours}</> : t.contactHoursUnpublished}</p>
              )}
              {contact.note && <p>{contact.note}</p>}
              {needsTranslation && (
                <details className="agency-contact-evidence">
                  <summary>{t.contactEnglishEvidence}</summary>
                  <div lang="en">
                    <p>{contacts[index].label}</p>
                    {contacts[index].hours && <p>{contacts[index].hours}</p>}
                    {contacts[index].note && <p>{contacts[index].note}</p>}
                  </div>
                </details>
              )}
              <div className="agency-contact-evidence">
                <a href={contact.sourceUrl} target="_blank" rel="noopener noreferrer">{t.sourceLabel} <ExternalLink size={12} aria-hidden="true" /></a>
                {contact.hoursSourceUrl && <a href={contact.hoursSourceUrl} target="_blank" rel="noopener noreferrer">{t.contactHours} <ExternalLink size={12} aria-hidden="true" /></a>}
                <span>{t.reviewed} {formatDate(contact.lastReviewed, language)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="agency-contact-disclaimer">{t.contactHandoffDisclaimer}</p>
    </section>
  );
}