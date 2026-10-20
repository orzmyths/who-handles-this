import type { ServiceRequestEvidence } from '@workspace/api-client-react';
import { Quote } from 'lucide-react';
import { lookup, useWorkflowCopy } from '@/lib/workflow-copy';

export function ServiceEvidence({ items, testId }: { items?: ServiceRequestEvidence[]; testId?: string }) {
  const c = useWorkflowCopy();
  return (
    <section className="history-detail-section" data-testid={testId ?? 'service-evidence'}>
      <h3 className="mb-2 text-sm font-bold text-slate-800">{c.evTitle}</h3>
      <p className="text-xs text-slate-600 mb-3 leading-relaxed">{c.evNote}</p>
      {!items?.length ? <p className="history-muted">{c.evNone}</p> : (
        <ul className="space-y-3">
          {items.map((item, i) => (
            <li key={i} className="rounded-lg border border-slate-200 bg-white/60 p-3 text-sm">
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2 text-xs">
                <div><dt className="text-slate-500">{c.evService}</dt><dd className="font-semibold text-slate-800">{lookup(c, 'sf', item.serviceFamily)}</dd></div>
                <div><dt className="text-slate-500">{c.evAction}</dt><dd className="font-semibold text-slate-800">{lookup(c, 'ra', item.requestedAction)}</dd></div>
                <div><dt className="text-slate-500">{c.evUncertainty}</dt><dd className="font-semibold text-slate-800">{lookup(c, 'un', item.uncertainty)}</dd></div>
              </dl>
              <p className="text-[0.68rem] uppercase tracking-wider font-mono text-slate-500 flex items-center gap-1"><Quote size={11} aria-hidden="true" /> {c.evQuote}</p>
              <blockquote className="mt-1 border-l-2 border-slate-300 pl-3 text-slate-800">{item.supportingText}</blockquote>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
