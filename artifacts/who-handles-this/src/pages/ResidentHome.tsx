import { useState } from 'react';
import { useLanguage } from '@/language-context';
import { useAnalyzeRouting, useReportWrongRouting, type RoutingResult } from '@workspace/api-client-react';
import { Header, Footer, IntroPanel, SourceLine, formatDate } from '@/components/ResidentUI';
import { DepartmentEmailPreview } from '@/components/DepartmentEmailPreview';
import { AdditionalRecommendations } from '@/components/AdditionalRecommendations';
import { AgencyContacts } from '@/components/AgencyContacts';
import { Link } from 'wouter';
import { ServiceEvidence } from '@/components/ServiceEvidence';
import { useWorkflowCopy } from '@/lib/workflow-copy';
import { TranslatedText } from '@/components/TranslatedText';
import { submissionErrorMessage } from '@/lib/submission-errors';
import { ArrowLeft, ArrowUpRight, Check, ChevronDown, CircleAlert, Landmark, RotateCcw, Search, ShieldCheck, Sparkles, Globe, Loader2, AlertCircle, Info, XCircle } from 'lucide-react';

function StatusPill({ status }: { status: RoutingResult['status'] }) {
  const { t } = useLanguage();
  
  const map: Record<RoutingResult['status'], { label: string, icon: any, colorClass: string }> = {
    routed: { label: t.statusRouted, icon: Check, colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    review: { label: t.statusReview, icon: Info, colorClass: 'text-amber-700 bg-amber-50 border-amber-200' },
    clarify: { label: t.statusClarify, icon: AlertCircle, colorClass: 'text-blue-700 bg-blue-50 border-blue-200' },
    blocked: { label: t.statusBlocked, icon: XCircle, colorClass: 'text-rose-700 bg-rose-50 border-rose-200' }
  };
  
  const conf = map[status] || map.review;
  const Icon = conf.icon;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono font-bold uppercase tracking-wider shadow-sm ${conf.colorClass}`} data-testid={`status-${status}`}>
      <Icon size={14} />
      {conf.label}
    </span>
  );
}

export function ResidentHome() {
  const { language, t } = useLanguage();
  const [result, setResult] = useState<RoutingResult | null>(null);
  
  // Input State
  const [issue, setIssue] = useState('');
  const [notice, setNotice] = useState('');
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [clarificationHistory, setClarificationHistory] = useState<string[]>([]);
  const [originalIssue, setOriginalIssue] = useState('');
  
  const { mutateAsync: analyzeRouting, isPending: isRouting } = useAnalyzeRouting();
  const { mutate: reportWrong } = useReportWrongRouting();
  const [routeError, setRouteError] = useState<string | null>(null);
  const [reportedWrong, setReportedWrong] = useState(false);

  const handleSubmit = async (additionalInfo?: string) => {
    if (!additionalInfo) {
      setOriginalIssue(issue);
      setClarificationHistory([]);
    }
    
    setRouteError(null);
    setReportedWrong(false);
    
    try {
      const history = additionalInfo ? [...clarificationHistory, additionalInfo] : [];
      if (additionalInfo) {
        setClarificationHistory(history);
      }

      const res = await analyzeRouting({
        data: {
          description: issue,
          noticeText: notice || null,
          language,
          clarificationHistory: history,
        }
      });
      
      setResult(res);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const status = err && typeof err === 'object' && 'status' in err ? err.status : undefined;
      console.error('Report submission failed', { status, kind: err instanceof Error ? err.name : 'UnknownError' });
      setRouteError(submissionErrorMessage(err));
    }
  };

  const startOver = () => {
    setResult(null);
    setIssue('');
    setNotice('');
    setClarificationHistory([]);
    setPrivacyChecked(false);
    setRouteError(null);
    setReportedWrong(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleReportWrong = () => {
    if (!result?.selected) return;
    reportWrong({ data: { description: originalIssue, agencyId: result.selected.id } }, {
      onSuccess: () => setReportedWrong(true)
    });
  };

  const chooseExample = (example: string) => {
    setIssue(example);
    setNotice('');
  };

  const charCount = issue.length + notice.length;
  const MAX_CHARS = 2000;
  const isOverLimit = charCount > MAX_CHARS;
  const canSubmit = issue.trim().length > 0 && privacyChecked && !isOverLimit && !isRouting;

  return (
    <div className="app-frame paper-grain">
      <Header onStartOver={startOver} hasResult={Boolean(result)} />
      
      {!result ? (
        <main className="page-shell page-reveal" data-testid="state-input">
          <section className="hero-copy">
            <p className="eyebrow">{t.heroEyebrow}</p>
            <h1><span>{t.heroH1_1}</span><em>{t.heroH1_2}</em></h1>
            <p className="hero-lede">{t.heroLede}</p>
          </section>

          <div className="workspace-grid">
            <section className="form-card" aria-labelledby="describe-heading">
              <div className="card-kicker"><Search size={15} strokeWidth={2} /> {t.formKicker}</div>
              <h2 id="describe-heading">{t.formH2}</h2>
              <p className="card-intro">{t.formIntro}</p>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (canSubmit) handleSubmit();
                }}
              >
                <label className="field-label" htmlFor="issue">
                   {t.labelIssue} <span className="required-mark" aria-hidden="true">*</span>
                </label>
                <textarea
                  id="issue"
                  className="civic-textarea"
                  value={issue}
                  onChange={(event) => setIssue(event.target.value)}
                  placeholder={t.placeholderIssue}
                  rows={5}
                  required
                  disabled={isRouting}
                  data-testid="input-issue"
                />
                <div className="flex justify-between items-center mt-2 text-[0.73rem] font-medium text-slate-500">
                  <span>{t.metaIssue}</span>
                  <span className={`font-mono ${isOverLimit ? 'text-red-600 font-bold' : ''}`}>
                    {charCount} / {MAX_CHARS}
                  </span>
                </div>

                <label className="field-label optional-label" htmlFor="notice">
                  {t.labelNotice} <span>{t.optional}</span>
                </label>
                <textarea
                  id="notice"
                  className="civic-textarea notice-textarea"
                  value={notice}
                  onChange={(event) => setNotice(event.target.value)}
                  placeholder={t.placeholderNotice}
                  rows={4}
                  disabled={isRouting}
                  data-testid="input-notice"
                />

                <label className="flex items-start gap-3 mt-8 p-3.5 rounded-lg border border-slate-200 bg-white/60 cursor-pointer hover:bg-white transition-colors shadow-sm">
                  <input
                    type="checkbox"
                    className="mt-1 w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary focus:ring-2 focus:ring-offset-1"
                    checked={privacyChecked}
                    onChange={e => setPrivacyChecked(e.target.checked)}
                    disabled={isRouting}
                  />
                  <span className="text-sm text-slate-700 font-medium leading-snug">
                    {t.formPrivacy}
                  </span>
                </label>

                {routeError && (
                  <div role="alert" className="mt-6 mb-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <div>
                      <strong><TranslatedText text={routeError} /></strong>
                      {routeError.includes('sign-in session') && <Link href="/sign-in" className="block underline mt-2">Sign in again</Link>}
                    </div>
                  </div>
                )}

                <button className="submit-button relative" type="submit" disabled={!canSubmit} data-testid="button-find-agency">
                  <span className={isRouting ? 'opacity-0' : ''}>{t.submitBtn}</span>
                  {isRouting && <div className="absolute inset-0 flex items-center justify-center"><Loader2 size={19} className="animate-spin" /></div>}
                  <ArrowUpRight size={19} strokeWidth={1.8} aria-hidden="true" className={isRouting ? 'opacity-0' : ''} />
                </button>
                {!canSubmit && !isRouting && <p className="form-hint" role="status">{t.formHint}</p>}
              </form>

              <div className="example-section">
                <div className="example-heading"><span>{t.examplesHeading}</span><span className="example-line" /></div>
                <div className="example-list" aria-label="Example descriptions">
                  {[t.example1, t.example2, t.example3].map((example, index) => (
                    <button
                      className="example-button lift-on-hover"
                      key={index}
                      type="button"
                      disabled={isRouting}
                      onClick={() => chooseExample(example)}
                      data-testid={`button-example-${index + 1}`}
                    >
                      <span className="example-number">0{index + 1}</span>
                      <span>{example}</span>
                      <ArrowUpRight size={15} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <IntroPanel />
          </div>
        </main>
      ) : (
        <ResultView 
          result={result} 
          onStartOver={startOver} 
          originalIssue={originalIssue} 
          onSubmitClarification={handleSubmit}
          isRouting={isRouting}
          onReportWrong={handleReportWrong}
          reportedWrong={reportedWrong}
        />
      )}
      
      <Footer />
    </div>
  );
}

function ResultView({ 
  result, onStartOver, originalIssue, onSubmitClarification, isRouting, onReportWrong, reportedWrong 
}: { 
  result: RoutingResult; onStartOver: () => void; originalIssue: string; 
  onSubmitClarification: (ans: string) => void; isRouting: boolean;
  onReportWrong: () => void; reportedWrong: boolean;
}) {
  const { t, language } = useLanguage();
  const wc = useWorkflowCopy();
  const [clarificationAnswer, setClarificationAnswer] = useState('');

  const isRouted = result.status === 'routed';
  const hasAgency = Boolean(result.selected);
  
  const headline = isRouted && result.selected
    ? <>{t.headlineStartWith} <em>{result.selected.name}.</em></>
    : result.status === 'blocked'
      ? <>{t.headlineNeedMore1}<br /><em>{t.headlineNeedMore2}</em></>
      : result.status === 'clarify'
        ? <>{t.headlineGiveMore1}<br /><em>{t.headlineGiveMore2}</em></>
        : <>{t.headlineHuman1}<br /><em>{t.headlineHuman2}</em></>;

  if (result.status === 'clarify' && result.needs_clarification) {
    return (
      <main className="page-shell result-page page-reveal">
        <div className="result-topline">
          <button className="back-button" onClick={onStartOver}>
            <ArrowLeft size={16} /> {t.startOver}
          </button>
        </div>
        <div className="max-w-2xl mx-auto form-card mt-8">
          <div className="flex items-center gap-3 mb-6">
            <StatusPill status={result.status} />
          </div>
          <h2 className="mb-4">{t.clarifyHeading}</h2>
          <p className="text-slate-700 text-lg mb-6 leading-relaxed">
            <TranslatedText text={result.clarifying_question ?? ''} />
          </p>
          <textarea
            className="civic-textarea mb-6"
            value={clarificationAnswer}
            onChange={e => setClarificationAnswer(e.target.value)}
            placeholder={t.clarifyPlaceholder}
            disabled={isRouting}
          />
          <button 
            className="submit-button"
            onClick={() => onSubmitClarification(clarificationAnswer)}
            disabled={!clarificationAnswer.trim() || isRouting}
          >
            <span className={isRouting ? 'opacity-0' : ''}>{t.submitAnswerBtn}</span>
            {isRouting && <div className="absolute inset-0 flex items-center justify-center"><Loader2 size={19} className="animate-spin" /></div>}
            <ArrowUpRight size={19} strokeWidth={1.8} aria-hidden="true" className={isRouting ? 'opacity-0' : ''} />
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell result-page page-reveal" data-testid="state-output">
      <div className="result-topline">
        <button className="back-button" onClick={onStartOver} data-testid="button-start-over">
          <ArrowLeft size={16} /> {t.startOver}
        </button>
        <span className="result-label">{t.resultTopline}</span>
      </div>

      <section className={`result-hero result-${result.status}`}>
        <div className="result-heading">
          <div className="result-status flex items-center flex-wrap gap-y-2">
            <StatusPill status={result.status} />
            {language !== 'en' && language !== 'auto' && (
              <span className="ml-3 inline-flex items-center gap-1.5 text-[0.65rem] text-primary/70 uppercase tracking-wider font-mono font-bold">
                <Globe size={11} /> {t.translationIndicator}
              </span>
            )}
          </div>
          <h1>{headline}</h1>
          <p className="result-summary">
            {isRouted
               ? result.additionalRecommendations?.length ? t.summaryMultipleRouted : t.summaryRouted
              : result.status === 'blocked'
                ? t.summaryNoMatch
                : result.status === 'clarify'
                  ? t.summaryTooShort
                  : t.summaryReview}
          </p>
        </div>
        <div className="submitted-note">
          <span className="submitted-label">{t.youWrote}</span>
          <p>“{originalIssue}”</p>
        </div>
      </section>

      <div className="result-grid">
        <div className="space-y-6 min-w-0">
        <section className="result-card primary-result-card" aria-labelledby="result-details-heading">
          <div className="card-kicker"><Landmark size={15} strokeWidth={2} /> {isRouted ? t.cardKickerPrimary : t.cardKickerFound}</div>
           <h2 id="result-details-heading">
             {hasAgency && result.selected ? result.selected.name : result.status === 'blocked' ? t.cardH2NoMatch : t.cardH2NoAgency}
          </h2>

          {hasAgency && result.selected && (
            <>
              <div className="agency-meta">
                <span>{result.selected.level} {t.agencyLevelGov}</span>
                <span className="meta-separator" aria-hidden="true">·</span>
                <span>{t.reviewed} {formatDate(result.selected.lastReviewed, language)}</span>
              </div>
               <div
                 className={`source-boundary ${result.selected.id === 'sj-code-enforcement' ? 'source-boundary-alert' : ''}`}
                 role="note"
                 data-testid="source-boundary"
               >
                 <div className="source-boundary-icon" aria-hidden="true"><Landmark size={16} strokeWidth={1.8} /></div>
                 <div>
                   <span className="source-boundary-label">{t.jurisdictionBoundary}</span>
                   <p><TranslatedText text={result.selected.residentBoundary} /></p>
                   <small>{t.prototypeBoundaryDisclaimer}</small>
                 </div>
               </div>
               <p className="agency-reason text-slate-700 leading-relaxed mb-6">
                 <strong>{result.confidence}:</strong> <TranslatedText text={result.explanation} />
               </p>
              <SourceLine name={result.selected.officialTitle} url={result.selected.officialUrl} sourceLabel={t.sourceLabel} />
              {isRouted && <AgencyContacts agency={result.selected} />}
              {isRouted && (
                <DepartmentEmailPreview
                  communication={result.communication}
                  agencyId={result.selected.id}
                  agencyName={result.selected.name}
                  officialUrl={result.selected.officialUrl}
                  officialTitle={result.selected.officialTitle}
                />
              )}
            </>
          )}

          {!hasAgency && result.status === 'blocked' && (
            <p className="empty-result-copy">{t.emptyNoMatch}</p>
          )}
          {!hasAgency && result.status === 'clarify' && (
            <p className="empty-result-copy">{t.emptyTooShort1} {t.emptyTooShort2}</p>
          )}

          {result.status === 'review' && (
            <div className="review-box" role="status" data-testid="simulated-review-notice">
              <div className="review-box-icon"><CircleAlert size={18} strokeWidth={1.8} /></div>
              <div>
                <strong>{t.whyPaused}</strong>
                <p className="review-message">{t.reviewMessage}</p>
              </div>
            </div>
          )}

          {result.nextStep && (
            <div className="next-action">
              <div className="next-action-icon"><Check size={18} strokeWidth={2.2} /></div>
              <div>
                <span className="next-action-label">{t.nextActionLabel}</span>
                <p><TranslatedText text={result.nextStep} /></p>
                {result.selected?.id === 'sj-transportation' && (
                  <a href="https://www.sanjoseca.gov/311" target="_blank" rel="noopener noreferrer" className="source-line" data-testid="link-sj311">
                    {t.sj311Action}
                  </a>
                )}
              </div>
            </div>
          )}
        </section>
          <div className="result-card">
            <ServiceEvidence items={result.serviceRequests} />
          </div>
          {(result.reviewCaseId || result.historyId) && (
            <div className="review-box" role="status" data-testid="review-history-link">
              <div>
                <p className="review-message">{wc.viewHistoryNote}</p>
                <Link href={result.historyId ? `/history#record-${result.historyId}` : '/history'} className="history-source-link" data-testid="link-saved-outcome">
                  {wc.viewHistory} <ArrowUpRight size={14} aria-hidden="true" />
                </Link>
              </div>
            </div>
          )}
          <AdditionalRecommendations recommendations={isRouted ? result.additionalRecommendations : []} />
        </div>

        <aside className="result-side">
          {result.key_facts && result.key_facts.length > 0 && (
             <div className="why-card block p-5">
               <h3 className="mb-3 text-sm font-bold text-slate-800 flex items-center gap-2"><Sparkles size={16} className="text-amber-600" /> {t.helpfulFacts}</h3>
               <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1.5">
                 {result.key_facts.map((f, idx) => <li key={idx}><TranslatedText text={f} /></li>)}
               </ul>
             </div>
          )}
          
          <div className="why-card">
            <div className="why-icon"><Info size={18} strokeWidth={1.8} /></div>
            <div>
              <h3>{t.whyCardH3}</h3>
              <p>{t.whyCardP}</p>
            </div>
          </div>
          
          <div className="flex flex-col gap-3 mt-4">
            <button className="secondary-start-button" onClick={onStartOver} data-testid="button-result-start-over">
              <RotateCcw size={16} /> {t.tryAnother}
            </button>
            
            {isRouted && result.selected && (
              <button 
                onClick={onReportWrong} 
                disabled={reportedWrong} 
                className="text-xs text-slate-500 hover:text-slate-800 underline mt-2 disabled:opacity-50 disabled:no-underline text-center"
              >
                {reportedWrong ? t.feedbackSubmitted : t.thisSeemsWrong}
              </button>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
