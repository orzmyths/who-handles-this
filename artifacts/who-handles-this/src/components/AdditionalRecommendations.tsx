import type { RoutingResult } from '@workspace/api-client-react';
import { Check, Landmark } from 'lucide-react';
import { useLanguage } from '@/language-context';
import { DepartmentEmailPreview } from './DepartmentEmailPreview';
import { SourceLine, formatDate } from './ResidentUI';
import { AgencyContacts } from './AgencyContacts';
import { TranslatedText } from './TranslatedText';

export function AdditionalRecommendations({
  recommendations,
}: { recommendations: RoutingResult['additionalRecommendations'] }) {
  const { t, language } = useLanguage();
  if (!recommendations?.length) return null;

  return (
    <section className="space-y-4" aria-label={t.alsoForOtherIssue} data-testid="additional-recommendations">
      <h2 className="text-lg font-semibold">{t.alsoForOtherIssue}</h2>
      {recommendations.map(({ selected, explanation, nextStep, communication }) => (
        <article className="result-card" key={selected.id} data-testid={`additional-agency-${selected.id}`}>
          <div className="card-kicker"><Landmark size={15} aria-hidden="true" /> {t.cardKickerPrimary}</div>
          <h3 className="text-xl font-semibold mb-3">{selected.name}</h3>
          <div className="agency-meta">
            <span>{selected.level} {t.agencyLevelGov}</span>
            <span aria-hidden="true">·</span>
            <span>{t.reviewed} {formatDate(selected.lastReviewed, language)}</span>
          </div>
          <p className="mt-4 mb-3"><TranslatedText text={selected.residentBoundary} /></p>
          <p className="agency-reason"><TranslatedText text={explanation} /></p>
          <SourceLine name={selected.officialTitle} url={selected.officialUrl} sourceLabel={t.sourceLabel} />
          <AgencyContacts agency={selected} />
          <div className="next-action">
            <div className="next-action-icon"><Check size={18} aria-hidden="true" /></div>
            <div>
              <span className="next-action-label">{t.nextActionLabel}</span>
              <p><TranslatedText text={nextStep} /></p>
              {selected.id === 'sj-transportation' && (
                <a href="https://www.sanjoseca.gov/311" target="_blank" rel="noopener noreferrer" className="source-line">{t.sj311Action}</a>
              )}
            </div>
          </div>
          <DepartmentEmailPreview
            communication={communication}
            agencyId={selected.id}
            agencyName={selected.name}
            officialUrl={selected.officialUrl}
            officialTitle={selected.officialTitle}
          />
          <p className="text-xs mt-4">{t.prototypeBoundaryDisclaimer}</p>
        </article>
      ))}
    </section>
  );
}