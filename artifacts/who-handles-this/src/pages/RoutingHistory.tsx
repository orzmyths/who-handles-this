import { useEffect, useRef } from 'react';
import { useLanguage } from '@/language-context';
import { TranslatedText } from '@/components/TranslatedText';
import {
  getListRoutingHistoryQueryKey,
  type RoutingHistoryEntry,
  type RoutingResult,
  useListRoutingHistory,
} from '@workspace/api-client-react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleAlert,
  ExternalLink,
  FileText,
  Landmark,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'wouter';
import { ServiceEvidence } from '@/components/ServiceEvidence';
import { ReviewOutcomePanel } from '@/components/ReviewOutcomePanel';
import { useWorkflowCopy } from '@/lib/workflow-copy';
import { Footer, Header } from '@/components/ResidentUI';
import { AdditionalRecommendations } from '@/components/AdditionalRecommendations';
import { AgencyContacts } from '@/components/AgencyContacts';
import { DepartmentEmailPreview } from '@/components/DepartmentEmailPreview';

const localeFor = (language: string) => {
  if (language === 'zh') return 'zh-CN';
  if (language === 'zh-TW') return 'zh-TW';
  if (language === 'auto') return 'en-US';
  return language;
};

const formatTimestamp = (value: string, language: string) =>
  new Intl.DateTimeFormat(localeFor(language), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const statusIcon: Record<RoutingResult['status'], LucideIcon> = {
  routed: Check,
  clarify: AlertCircle,
  review: CircleAlert,
  blocked: XCircle,
};

function HistoryStatus({ status }: { status: RoutingResult['status'] }) {
  const { t } = useLanguage();
  const Icon = statusIcon[status];
  const label = status === 'routed'
    ? t.statusRouted
    : status === 'clarify'
      ? t.statusClarify
      : status === 'review'
        ? t.statusReview
        : t.statusBlocked;
  return (
    <span className={`history-status history-status-${status}`} data-testid={`status-history-${status}`}>
      <Icon size={14} aria-hidden="true" />
      {label}
    </span>
  );
}

function DetailList({ values, emptyLabel }: { values: string[]; emptyLabel: string }) {
  if (!values.length) return <p className="history-muted">{emptyLabel}</p>;
  return (
    <ul className="history-detail-list">
      {values.map((value, index) => <li key={`${value}-${index}`}>{value}</li>)}
    </ul>
  );
}

function Field({ label, children, testId }: { label: string; children: ReactNode; testId?: string }) {
  return (
    <div className="history-field" data-testid={testId}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function SavedResultDetails({ entry }: { entry: RoutingHistoryEntry }) {
  const { t } = useLanguage();
  const output = entry.output;
  const selected = output.selected;
  return (
    <details className="history-details">
      <summary data-testid={`button-details-${entry.id}`}>
        <span>{t.historyAllDetails}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </summary>
      <div className="history-details-content">
        <section className="history-detail-section" aria-labelledby={`fields-${entry.id}`}>
          <h3 id={`fields-${entry.id}`}>{t.historyResultFields}</h3>
          <dl className="history-fields-grid">
            <Field label={t.historyStatus}><HistoryStatus status={output.status} /></Field>
            <Field label="Issue type">{output.issue_type || t.historyNoneRecorded}</Field>
            <Field label="Government level">{output.government_level_hint}</Field>
            <Field label="Location hint">{output.location_hint || t.historyNoneRecorded}</Field>
            <Field label="Notice agency mentioned">{output.notice_agency_mentioned || t.historyNoneRecorded}</Field>
            <Field label="Confidence">{output.confidence}</Field>
            <Field label="Needs clarification">{output.needs_clarification ? t.historyYes : t.historyNo}</Field>
            <Field label="Clarification round">{String(output.clarificationRound)}</Field>
            {output.clarifying_question && <Field label={t.clarifyHeading}>{output.clarifying_question}</Field>}
          </dl>
        </section>

        <section className="history-detail-section" aria-labelledby={`facts-${entry.id}`}>
          <h3 id={`facts-${entry.id}`}>{t.historyFacts}</h3>
          <DetailList values={output.key_facts} emptyLabel={t.historyNoneRecorded} />
        </section>

        <section className="history-detail-section" aria-labelledby={`missing-${entry.id}`}>
          <h3 id={`missing-${entry.id}`}>{t.historyMissing}</h3>
          <DetailList values={output.missing_information} emptyLabel={t.historyNoneRecorded} />
        </section>

        <section className="history-detail-section" aria-labelledby={`candidates-${entry.id}`}>
          <h3 id={`candidates-${entry.id}`}>{t.historyCandidates}</h3>
          <DetailList values={output.candidate_agency_ids} emptyLabel={t.historyNoneRecorded} />
        </section>

        <section className="history-detail-section" aria-labelledby={`validation-${entry.id}`}>
          <h3 id={`validation-${entry.id}`}>{t.historyValidation}</h3>
          {output.validationChecks.length ? (
            <ul className="history-validation-list">
              {output.validationChecks.map((check, index) => (
                <li key={`${check.name}-${index}`}>
                  <span className={check.passed ? 'history-check-passed' : 'history-check-failed'}>
                    {check.passed ? <Check size={14} /> : <AlertCircle size={14} />}
                    {check.passed ? t.historyPassed : t.historyFailed}
                  </span>
                  <span><strong>{check.name}</strong>{check.detail ? ` — ${check.detail}` : ''}</span>
                </li>
              ))}
            </ul>
          ) : <p className="history-muted">{t.historyNoneRecorded}</p>}
        </section>

        {selected && (
          <section className="history-detail-section" aria-labelledby={`agency-${entry.id}`}>
            <h3 id={`agency-${entry.id}`}>{t.historySelectedAgency}</h3>
            <dl className="history-fields-grid">
              <Field label={t.historyAgency}>{selected.name}</Field>
              <Field label="Agency level">{selected.level || t.historyNoneRecorded}</Field>
              <Field label={t.historyScope}>{selected.scope}</Field>
              <Field label={t.historyBoundary}>{selected.residentBoundary}</Field>
              <Field label={t.historyReviewed}>{selected.lastReviewed}</Field>
              <Field label={t.historyReviewAfter}>{`${selected.reviewAfterDays} ${t.historyDays}`}</Field>
              <Field label={t.historyOfficialSource}>
                <a href={selected.officialUrl} target="_blank" rel="noopener noreferrer" className="history-source-link" data-testid={`link-history-source-${entry.id}`}>
                  {selected.officialTitle} <ExternalLink size={13} aria-hidden="true" />
                </a>
              </Field>
              <Field label={t.historySafeNextStep}>{selected.safeNextStepTemplate}</Field>
            </dl>
            <div className="history-subdetail-grid">
              <div><h4>{t.historyIncludedExamples}</h4><DetailList values={selected.includedExamples} emptyLabel={t.historyNoneRecorded} /></div>
              <div><h4>{t.historyExclusions}</h4><DetailList values={selected.exclusions} emptyLabel={t.historyNoneRecorded} /></div>
              <div><h4>{t.historyJurisdictionFacts}</h4><DetailList values={selected.jurisdictionFacts} emptyLabel={t.historyNoneRecorded} /></div>
              <div><h4>{t.historyClarifyingQuestions}</h4><DetailList values={selected.clarifyingQuestions} emptyLabel={t.historyNoneRecorded} /></div>
              <div><h4>{t.historyManualChecks}</h4><DetailList values={selected.todoManuallyVerify} emptyLabel={t.historyNoneRecorded} /></div>
            </div>
          </section>
        )}
      </div>
    </details>
  );
}

function HistoryRecord({ entry }: { entry: RoutingHistoryEntry }) {
  const { t, language } = useLanguage();
  const output = entry.output;
  const selected = output.selected;
  const wc = useWorkflowCopy();
  return (
    <article id={`record-${entry.id}`} className="history-record lift-on-hover scroll-mt-24" data-testid={`card-history-${entry.id}`}>
      <header className="history-record-header">
        <div>
          <p className="history-record-kicker"><FileText size={14} aria-hidden="true" /> {t.historyRecord} <span aria-hidden="true">#{entry.id}</span></p>
          <p className="history-timestamp" data-testid={`text-history-timestamp-${entry.id}`}>
            {t.historySubmitted} {formatTimestamp(entry.createdAt, language)}
          </p>
        </div>
        <HistoryStatus status={output.status} />
      </header>

      <div className="history-record-grid">
        <section className="history-input-column" aria-labelledby={`issue-${entry.id}`}>
          <h2 id={`issue-${entry.id}`}>{t.historyIssue}</h2>
          <blockquote data-testid={`text-history-issue-${entry.id}`}>{entry.input.description}</blockquote>
          {entry.input.noticeText && (
            <div className="history-input-block">
              <h3>{t.historyNotice}</h3>
              <p>{entry.input.noticeText}</p>
            </div>
          )}
          {entry.input.clarificationHistory && entry.input.clarificationHistory.length > 0 && (
            <div className="history-input-block">
              <h3>{t.historyClarifications}</h3>
              <DetailList values={entry.input.clarificationHistory} emptyLabel={t.historyNoneRecorded} />
            </div>
          )}
          <p className="history-language">{t.historyLanguage}: <strong>{entry.input.language}</strong></p>
        </section>

        <section className="history-result-column" aria-labelledby={`result-${entry.id}`}>
          <p className="history-section-label">{wc.auto}</p>
          <h2 id={`result-${entry.id}`} data-testid={`text-history-agency-${entry.id}`}>
            {selected ? selected.name : t.historyNoAgency}
          </h2>
          <p className="history-explanation" data-testid={`text-history-explanation-${entry.id}`}><TranslatedText text={output.explanation} /></p>
          {selected && output.status === 'routed' && <AgencyContacts agency={selected} />}
          {output.nextStep ? (
            <div className="history-next-step" data-testid={`text-history-next-step-${entry.id}`}>
              <Check size={16} aria-hidden="true" />
              <div>
                <span>{t.historyNextStep}</span>
                <p><TranslatedText text={output.nextStep} /></p>
                {selected?.id === 'sj-transportation' && (
                  <a href="https://www.sanjoseca.gov/311" target="_blank" rel="noopener noreferrer" className="history-source-link" data-testid={`link-history-sj311-${entry.id}`}>
                    {t.sj311Action} <ExternalLink size={13} aria-hidden="true" />
                  </a>
                )}
              </div>
            </div>
          ) : <p className="history-muted">{t.historyNoNextStep}</p>}
          {selected && (
            <a href={selected.officialUrl} target="_blank" rel="noopener noreferrer" className="history-source-link history-source-link-prominent" data-testid={`link-history-official-${entry.id}`}>
              <ExternalLink size={14} aria-hidden="true" /> {t.historyOfficialSource}: {selected.officialTitle}
            </a>
          )}
          {selected && output.status === 'routed' && (
            <DepartmentEmailPreview
              communication={output.communication}
              agencyId={selected.id}
              agencyName={selected.name}
              officialUrl={selected.officialUrl}
              officialTitle={selected.officialTitle}
            />
          )}
        </section>
      </div>

      <ServiceEvidence items={output.serviceRequests} testId={`service-evidence-${entry.id}`} />
      <ReviewOutcomePanel outcome={output.reviewOutcome} entryId={entry.id} />
      {output.status === 'routed' && <AdditionalRecommendations recommendations={output.additionalRecommendations} />}
      <SavedResultDetails entry={entry} />
    </article>
  );
}

function HistorySkeleton() {
  return (
    <div className="history-skeleton-list" aria-label="Loading saved routing records" data-testid="loading-history">
      {[0, 1].map(index => (
        <div className="history-skeleton" key={index}>
          <span /><span /><span /><span /><span />
        </div>
      ))}
    </div>
  );
}

export function RoutingHistory() {
  const { t, language } = useLanguage();
  const wc = useWorkflowCopy();
  const { data, isLoading, isError, refetch, isFetching, dataUpdatedAt } = useListRoutingHistory({
    query: {
      queryKey: getListRoutingHistoryQueryKey(),
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      staleTime: 15000,
      retry: false,
      refetchInterval: (query) =>
        (query.state.data as RoutingHistoryEntry[] | undefined)?.some(e => ['needs_review', 'awaiting_information', 'edited'].includes(e.output.reviewOutcome?.status ?? '')) ? 8000 : false,
    },
  });
  const hasPending = (data ?? []).some(e => ['needs_review', 'awaiting_information', 'edited'].includes(e.output.reviewOutcome?.status ?? ''));
  const records = data ?? [];
  const scrolledTo = useRef('');
  useEffect(() => {
    const anchor = window.location.hash.slice(1);
    const element = anchor && document.getElementById(anchor);
    if (element && scrolledTo.current !== anchor) {
      element.scrollIntoView({ block: 'start' });
      scrolledTo.current = anchor;
    }
  }, [data]);

  return (
    <div className="app-frame paper-grain">
      <Header onStartOver={() => undefined} hasResult={false} />
      <main className="page-shell history-page page-reveal" data-testid="page-history">
        <div className="history-topline">
          <Link href="/" className="back-button" data-testid="link-history-home">
            <ArrowLeft size={16} aria-hidden="true" /> {t.historyBackHome}
          </Link>
          <span className="result-label">{t.historyNav}</span>
        </div>

        <section className="history-intro">
          <p className="eyebrow">{t.historyEyebrow}</p>
          <h1>{t.historyTitle}</h1>
          <p>{t.historyIntro}</p>
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <button type="button" className="secondary-start-button" onClick={() => refetch()} disabled={isFetching} data-testid="button-refresh-history">
              <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} aria-hidden="true" /> {isFetching ? wc.refreshing : wc.refresh}
            </button>
            {dataUpdatedAt > 0 && <span className="text-xs text-slate-500">{wc.fresh}: {formatTimestamp(new Date(dataUpdatedAt).toISOString(), language)}</span>}
          </div>
          {hasPending && <p className="text-xs text-slate-600 mt-2" role="status">{wc.polling}</p>}
          <div className="history-privacy">
            <ShieldCheck size={17} aria-hidden="true" />
            <span>{t.historyPrivacy}</span>
          </div>
        </section>

        {isLoading ? <HistorySkeleton /> : isError ? (
          <section className="history-state history-error" role="alert" data-testid="state-history-error">
            <AlertCircle size={23} aria-hidden="true" />
            <div><h2>{t.historyErrorTitle}</h2><p>{t.historyErrorCopy}</p><p>{wc.errActionable}</p></div>
            <button className="secondary-start-button" onClick={() => refetch()} disabled={isFetching} data-testid="button-retry-history">
              <RefreshCw size={15} className={isFetching ? 'animate-spin' : ''} aria-hidden="true" /> {t.historyTryAgain}
            </button>
          </section>
        ) : records.length === 0 ? (
          <section className="history-state history-empty" data-testid="state-history-empty">
            <div className="history-empty-mark" aria-hidden="true"><Landmark size={22} /></div>
            <h2>{t.historyEmptyTitle}</h2>
            <p>{t.historyEmptyCopy}</p>
            <Link href="/" className="submit-button history-empty-button" data-testid="link-history-empty-home">
              {t.historyBackHome} <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
          </section>
        ) : (
          <section className="history-list" aria-label={t.historyNav} data-testid="list-history">
            {records.map(entry => <HistoryRecord key={entry.id} entry={entry} />)}
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}