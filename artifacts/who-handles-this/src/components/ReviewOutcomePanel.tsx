import type { ReviewOutcome } from '@workspace/api-client-react';
import { Gavel } from 'lucide-react';
import { useLanguage } from '@/language-context';
import { TranslatedText } from '@/components/TranslatedText';
import { SourceLine } from '@/components/ResidentUI';
import { AgencyContacts } from '@/components/AgencyContacts';
import { lookup, useWorkflowCopy } from '@/lib/workflow-copy';

const stamp = (v: string, language: string) => {
  const loc = language === 'zh' ? 'zh-CN' : language === 'auto' ? 'en-US' : language;
  try { return new Intl.DateTimeFormat(loc, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v)); } catch { return v; }
};

export function ReviewOutcomePanel({ outcome, entryId }: { outcome?: ReviewOutcome; entryId: number }) {
  const c = useWorkflowCopy();
  const { t, language } = useLanguage();
  if (!outcome) return null;
  const showAgency = outcome.agency && (outcome.status === 'approved' || outcome.status === 'edited');
  const a = outcome.agency;
  return (
    <section className="history-detail-section mt-4 rounded-lg border border-indigo-200 bg-indigo-50/50 p-4" data-testid={`review-outcome-${entryId}`} aria-labelledby={`review-${entryId}`}>
      <h3 id={`review-${entryId}`} className="flex items-center gap-2 text-sm font-bold text-slate-800"><Gavel size={15} aria-hidden="true" /> {c.humanTitle}</h3>
      <p className="text-xs text-slate-600 my-2">{c.humanNote}</p>
      <p className="mb-2"><span className="inline-flex px-2.5 py-1 rounded-full border border-indigo-200 bg-white text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-800" data-testid={`status-review-${outcome.status}-${entryId}`}>{lookup(c, 'st', outcome.status === 'needs_review' ? 'pending' : outcome.status, outcome.status)}</span></p>
      <dl className="text-sm space-y-2">
        <div><dt className="text-xs text-slate-500">{c.reason}</dt><dd><TranslatedText text={outcome.reason} /></dd></div>
        <div><dt className="text-xs text-slate-500">{c.message}</dt><dd><TranslatedText text={outcome.message} /></dd></div>
        <div><dt className="text-xs text-slate-500">{c.updated}</dt><dd>{stamp(outcome.updatedAt, language)}</dd></div>
      </dl>
      {showAgency && a && (
        <div className="mt-3 pt-3 border-t border-indigo-200">
          <p className="text-xs text-slate-500">{c.approvedAgency}</p>
          <p className="font-semibold text-slate-900 mb-2">{a.name}</p>
          <SourceLine name={a.officialTitle} url={a.officialUrl} sourceLabel={t.sourceLabel} />
          <AgencyContacts agency={a} />
          {outcome.nextStep && <p className="mt-2 text-sm"><strong>{t.historyNextStep}:</strong> <TranslatedText text={outcome.nextStep} /></p>}
        </div>
      )}
    </section>
  );
}
