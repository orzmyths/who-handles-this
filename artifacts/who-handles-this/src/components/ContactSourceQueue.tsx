import {
  getListContactSourceReviewsQueryKey, getListRoutingHistoryQueryKey, useListContactSourceReviews,
  useCheckContactSources, useConfirmContactSource, type ContactSourceReview,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ApprovedContactEditor } from './ApprovedContactEditor';

const labels = { changed: 'Page changed — review needed', baseline_needed: 'Manual baseline needed', overdue: '180-day review overdue', current: 'No detected change' };
const displayTime = (time: string | null) => time ? new Date(time).toLocaleString() : 'Not yet';

export function ContactSourceQueue() {
  const queryClient = useQueryClient();
  const queryKey = getListContactSourceReviewsQueryKey();
  const { data, isLoading, isError, refetch } = useListContactSourceReviews({
    query: { queryKey, retry: false, refetchInterval: 60_000 },
  });
  const check = useCheckContactSources();
  const confirm = useConfirmContactSource();
  const [selected, setSelected] = useState<ContactSourceReview | null>(null);
  const [reason, setReason] = useState('');
  const [attested, setAttested] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const needsAttention = (item: ContactSourceReview) => item.status !== 'current' || item.overdue || item.accessStatus !== 'ok';
  const pending = data?.filter(needsAttention) ?? [];
  const visible = showCurrent ? data ?? [] : pending;
  const refresh = () => check.mutate(undefined, {
    onSuccess: result => { queryClient.setQueryData(queryKey, result); setSelected(null); setMessage('Official page checks saved. Contact details and freshness dates were not changed.'); },
  });
  const accept = () => {
    if (!selected) return;
    confirm.mutate({ data: { sourceUrl: selected.sourceUrl, revision: selected.revision, reason } }, {
      onSuccess: result => {
        queryClient.setQueryData<ContactSourceReview[]>(queryKey, previous =>
          previous?.map(item => item.sourceUrl === result.sourceUrl ? result : item));
        void queryClient.invalidateQueries({ queryKey });
        setSelected(null);
        setMessage('Comparison baseline confirmed. Approved contacts and 180-day review dates remain unchanged.');
      },
      onError: () => { void queryClient.invalidateQueries({ queryKey }); },
    });
  };
  return (
    <section className="rounded-xl border border-amber-200 bg-white p-5" aria-labelledby="contact-source-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="contact-source-title" className="font-semibold text-slate-900">Official contact source reviews</h3>
          <p className="mt-1 text-sm text-slate-600">Changes to instructions, phone numbers, channel purposes or hours need human review.</p>
          <p className="mt-2 text-xs text-slate-600">Checks never replace approved contacts or renew the 180-day evidence dates. Restricted access is not evidence of a change.</p>
        </div>
        <button type="button" onClick={refresh} disabled={editingId !== null || check.isPending || confirm.isPending}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-50">
          {check.isPending ? 'Checking official pages…' : 'Check official pages'}
        </button>
      </div>
      {message && <p className="mt-3 text-sm text-blue-800" role="status">{message}</p>}
      {check.isError && <p className="mt-3 text-sm text-red-700" role="alert">Checks could not be completed. Retry; existing review evidence has been kept.</p>}
      {isLoading ? <p className="mt-3 text-sm">Loading contact-source reviews…</p> : isError ? (
        <div className="mt-3 text-sm text-red-700" role="alert">Contact-source reviews are unavailable. <button type="button" onClick={() => void refetch()} className="underline">Retry reviews</button></div>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium" aria-live="polite">{pending.length} source{pending.length === 1 ? '' : 's'} need attention</p>
            <label className="flex gap-2 text-sm"><input type="checkbox" checked={showCurrent} onChange={e => setShowCurrent(e.target.checked)} />Show all sources</label>
          </div>
          <ul className="mt-3 divide-y divide-slate-200">
            {visible.map(item => (
              <li key={item.sourceUrl} className="py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{item.agencyNames.join(' / ')}</p>
                    <p className={`mt-1 text-sm ${needsAttention(item) ? 'text-amber-800' : 'text-slate-600'}`}>{labels[item.status]}</p>
                    <p className="mt-1 text-xs text-slate-600">{item.detail}</p>
                    {item.overdue && item.status !== 'overdue' && <p className="mt-1 text-xs text-amber-800">Approved contact evidence is also overdue; baseline confirmation does not renew it.</p>}
                  </div>
                  <button type="button" onClick={() => { setSelected(item); setEditingId(null); setReason(''); setAttested(false); confirm.reset(); }}
                    disabled={editingId !== null || check.isPending || confirm.isPending} className="rounded-md border border-slate-300 px-3 py-2 text-sm">Review source</button>
                </div>
                <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block break-all text-xs text-blue-700 underline">{item.sourceUrl}</a>
                <p className="mt-1 text-xs text-slate-500">Last automated check: {displayTime(item.checkedAt)} · Baseline confirmed: {displayTime(item.baselineReviewedAt)}</p>
              </li>
            ))}
          </ul>
          {visible.length === 0 && <p className="mt-3 text-sm text-slate-600">No contact sources currently need review.</p>}
        </>
      )}
      {selected && (
        <div className="mt-4 rounded-lg border border-slate-300 bg-slate-50 p-4" aria-label="Review official contact source">
          <h4 className="font-semibold">Compare official instructions</h4>
          <a href={selected.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-1 block break-all text-sm text-blue-700 underline">Open official source in a new tab</a>
          <p className="mt-2 text-sm text-slate-600">Verify each approved purpose, number and published hours below. Correct changed records manually before confirming the comparison baseline. Do not infer a new channel purpose. Corrections are permitted after personal browser verification even when automated access is restricted.</p>
          <ul className="mt-3 space-y-2 text-sm">
            {selected.approvedContacts.map(record => {
              const contact = record.contact;
              return (
              <li key={record.contactId}><strong>{contact.label}</strong>: {contact.value}{contact.hours && ` · ${contact.hours}`}
                {contact.note && <p className="text-slate-600">{contact.note}</p>}
                <p className="text-xs text-slate-500">Approved evidence reviewed: {contact.lastReviewed}</p>
                <button type="button" disabled={editingId !== null || confirm.isPending || check.isPending}
                  onClick={() => setEditingId(record.contactId)} className="mt-1 text-sm text-blue-700 underline disabled:opacity-50">Correct approved contact</button>
                {record.history.length > 0 && <details className="mt-2">
                  <summary>Correction audit history ({record.history.length})</summary>
                  {record.history.map((audit, index) => <div key={index} className="mt-2 rounded border bg-white p-2 text-xs">
                    <p>{displayTime(audit.reviewedAt)} · {audit.reviewer} · {audit.reason}</p>
                    <p>Official source and channel purpose personally verified.</p>
                    <pre className="whitespace-pre-wrap break-all">Before: {JSON.stringify(audit.before, null, 2)}{'\n'}After: {JSON.stringify(audit.after, null, 2)}</pre>
                  </div>)}
                </details>}
                {editingId === record.contactId && <ApprovedContactEditor key={`${record.contactId}:${record.revision}`}
                  record={record} sourceUrl={selected.sourceUrl} sourceRevision={selected.revision}
                  onCancel={() => setEditingId(null)} onSaved={() => {
                    setEditingId(null); setSelected(null);
                    void queryClient.invalidateQueries({ queryKey });
                    void queryClient.invalidateQueries({ queryKey: getListRoutingHistoryQueryKey() });
                    setMessage('Verified contact correction saved with an audit trail. Only this contact’s 180-day evidence date was renewed; the comparison baseline is unchanged.');
                  }} />}
              </li>
            ); })}
          </ul>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div><h5 className="text-sm font-semibold">Confirmed baseline</h5><pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap rounded border bg-white p-3 text-xs">{selected.baselineText ?? 'No staff-confirmed baseline yet.'}</pre></div>
            <div><h5 className="text-sm font-semibold">Latest usable page snapshot</h5><pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap rounded border bg-white p-3 text-xs">{selected.candidateText ?? 'No usable snapshot. Check the page in your browser; automated access may be restricted.'}</pre></div>
          </div>
          {selected.history.length > 0 && (
            <details className="mt-3 text-xs"><summary>Recent baseline reviews</summary><ul className="mt-2 space-y-1">{selected.history.map((item, index) => <li key={index}>{displayTime(item.reviewedAt)} · {item.reviewer ?? "Legacy reviewer not recorded"} — {item.reason}</li>)}</ul></details>
          )}
          {selected.canConfirm ? (
            <div className="mt-4 space-y-3">
              <label className="block text-sm">Review note<textarea value={reason} onChange={e => setReason(e.target.value)} maxLength={2000} className="mt-1 block w-full rounded border border-slate-300 p-2" /></label>
              <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={attested} onChange={e => setAttested(e.target.checked)} />I checked the official page and all approved contact purposes, numbers and hours still match this snapshot.</label>
              <button type="button" onClick={accept} disabled={editingId !== null || !attested || !reason.trim() || confirm.isPending || check.isPending}
                className="rounded-md bg-blue-700 px-3 py-2 text-sm text-white disabled:opacity-50">{confirm.isPending ? 'Saving review…' : 'Confirm comparison baseline'}</button>
              {confirm.isError && <p className="text-sm text-red-700" role="alert">Review could not be saved. The source may have changed or become inaccessible. Close and reopen this review to load current evidence.</p>}
            </div>
          ) : <p className="mt-3 text-sm text-amber-800">No current usable snapshot. Baseline confirmation is blocked; check again after manual browser review.</p>}
          <button type="button" onClick={() => { setSelected(null); setEditingId(null); }} disabled={confirm.isPending || editingId !== null} className="mt-3 text-sm text-blue-700 underline disabled:opacity-50">Close review</button>
        </div>
      )}
    </section>
  );
}