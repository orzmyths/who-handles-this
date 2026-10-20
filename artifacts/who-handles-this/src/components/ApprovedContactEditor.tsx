import { useState } from 'react';
import { useCorrectApprovedContact, type ApprovedContactRecord } from '@workspace/api-client-react';

export function ApprovedContactEditor({ record, sourceUrl, sourceRevision, onSaved, onCancel }: {
  record: ApprovedContactRecord; sourceUrl: string; sourceRevision: number;
  onSaved: () => void; onCancel: () => void;
}) {
  const mutation = useCorrectApprovedContact();
  const [form, setForm] = useState({
    label: record.contact.label, value: record.contact.value, sourceUrl: record.contact.sourceUrl,
    hours: record.contact.hours ?? '', hoursSourceUrl: record.contact.hoursSourceUrl ?? '',
    note: record.contact.note ?? '', reason: '',
  });
  const [sourceVerified, setSourceVerified] = useState(false);
  const [purposeVerified, setPurposeVerified] = useState(false);
  const fields = [
    ['label', 'Verified channel purpose'], ['value', record.contact.kind === 'phone' ? 'Phone (+1 and ten digits)' : 'Official online channel URL'],
    ['sourceUrl', 'Official source URL'], ['hours', 'Published hours (blank removes hours)'],
    ['hoursSourceUrl', 'Separate official hours source (optional)'], ['note', 'Purpose / use restrictions (blank removes note)'],
    ['reason', 'Correction reason and verification notes'],
  ] as const;
  return <form className="mt-3 space-y-3 rounded-lg border border-blue-200 bg-white p-4" aria-label="Correct approved contact"
    onSubmit={event => {
      event.preventDefault();
      if (!sourceVerified || !purposeVerified) return;
      mutation.mutate({ data: {
        ...form, contactId: record.contactId, revision: record.revision,
        reviewedSourceUrl: sourceUrl, sourceRevision, sourceVerified, purposeVerified,
      } }, { onSuccess: onSaved });
    }}>
    <h5 className="font-semibold">Manually correct {record.contact.label}</h5>
    <p className="text-sm text-slate-600">Enter only details you personally verified. Page snapshots never supply replacements. Saving renews this contact’s evidence to today for 180 days; it does not renew agency evidence or confirm a comparison baseline.</p>
    {fields.map(([key, label]) => <label key={key} className="block text-sm">
      {label}
      <input className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
        value={form[key]} disabled={mutation.isPending} required={['label', 'value', 'sourceUrl', 'reason'].includes(key)}
        maxLength={key === 'label' ? 500 : key === 'hours' ? 1000 : 2000}
        onChange={event => { setForm(previous => ({ ...previous, [key]: event.target.value })); setSourceVerified(false); setPurposeVerified(false); }} />
    </label>)}
    <a href={form.sourceUrl} target="_blank" rel="noopener noreferrer" className="block text-sm text-blue-700 underline">Open entered evidence source</a>
    {form.hoursSourceUrl && <a href={form.hoursSourceUrl} target="_blank" rel="noopener noreferrer" className="block text-sm text-blue-700 underline">Open entered hours source</a>}
    <label className="flex gap-2 text-sm"><input type="checkbox" checked={sourceVerified} disabled={mutation.isPending} onChange={event => setSourceVerified(event.target.checked)} />I personally checked the official source and any separate hours source; these details match.</label>
    <label className="flex gap-2 text-sm"><input type="checkbox" checked={purposeVerified} disabled={mutation.isPending} onChange={event => setPurposeVerified(event.target.checked)} />I verified this channel’s purpose and restrictions, not just its number or link.</label>
    {mutation.isError && <p role="alert" className="text-sm text-red-700">
      {(mutation.error as any)?.status === 409
        ? 'The contact or source review changed. Cancel and reopen the source review to verify current evidence. Your correction was not saved.'
        : (mutation.error as any)?.data?.error ?? 'Correction was not saved. Check the official URLs and required fields, then retry.'}
    </p>}
    <div className="flex gap-3">
      <button type="submit" disabled={mutation.isPending || !sourceVerified || !purposeVerified || !form.reason.trim() ||
        (mutation.error as any)?.status === 409} className="rounded bg-blue-700 px-3 py-2 text-sm text-white disabled:opacity-50">
        {mutation.isPending ? 'Saving correction…' : 'Save verified correction'}
      </button>
      <button type="button" disabled={mutation.isPending} onClick={onCancel} className="text-sm text-blue-700 underline">Cancel correction</button>
    </div>
  </form>;
}