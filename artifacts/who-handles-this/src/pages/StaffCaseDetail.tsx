import { useGetStaffCase, useActOnStaffCase, type CaseActionAction, getListStaffCasesQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useWorkflowCopy } from '@/lib/workflow-copy';
import { format } from 'date-fns';

const APPROVED_AGENCIES = [
  ['sj-environmental-services', 'San José Environmental Services'],
  ['sj-code-enforcement', 'San José Code Enforcement'],
  ['sj-transportation', 'San José Department of Transportation'],
  ['scc-tax-collections', 'Santa Clara County Department of Tax and Collections'],
  ['scc-social-services', 'Santa Clara County Social Services Agency'],
  ['ca-edd', 'California Employment Development Department (EDD)'],
  ['ca-dmv', 'California Department of Motor Vehicles (DMV)'],
] as const;

function Badge({ children, tooltip }: { children: React.ReactNode; tooltip: string }) {
  return (
    <span 
      className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 cursor-help uppercase tracking-wider border border-indigo-200"
      title={tooltip}
    >
      {children}
    </span>
  );
}

const agencyName = (id: string | null) =>
  APPROVED_AGENCIES.find(([agencyId]) => agencyId === id)?.[1] ?? id ?? 'None';

export function StaffCaseDetail({ id }: { id: string }) {
  const { data: caseData, isLoading } = useGetStaffCase(id);
  const actOnCase = useActOnStaffCase();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const wc = useWorkflowCopy();

  const [action, setAction] = useState<CaseActionAction>('approve');
  const [reason, setReason] = useState('');
  const [agencyId, setAgencyId] = useState('');
  
  if (isLoading || !caseData) return <div className="p-8 text-slate-500">Loading case...</div>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    actOnCase.mutate({ caseId: id, data: { action, reason, revision: caseData.revision, agencyId: action === 'edit_agency' ? agencyId : undefined } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListStaffCasesQueryKey() });
        setLocation('/staff');
      }
    });
  };

  return (
    <div className="grid md:grid-cols-3 gap-8 items-start">
      <div className="md:col-span-2 space-y-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <strong className="block text-xs uppercase tracking-wider mb-1">Demo case</strong>
          This is a simulated staff workspace, not production case management. Seeded examples are fictional; submitted reports may contain real text. No real staff are monitoring these reports. Resetting seeded demo cases does not delete resident wrong-routing reports.
        </div>
        {caseData.routingHistoryId != null && (
          <Link href={`/history#record-${caseData.routingHistoryId}`} className="inline-block text-sm underline text-slate-700" data-testid="link-staff-history">
            {wc.staffBack} #{caseData.routingHistoryId}
          </Link>
        )}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex justify-between items-center">
            Resident Submission
            <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] border border-slate-200">Original</span>
          </h3>
          <p className="text-lg text-slate-900 font-serif mb-6 leading-relaxed">
            "{caseData.residentDescription}"
          </p>

          <div className="grid sm:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
             <div>
               <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                 Extracted Facts 
                 <Badge tooltip="Structured data extraction">AI</Badge>
               </h4>
               <ul className="list-disc pl-4 text-sm text-slate-700 space-y-1.5">
                 {caseData.extractedFacts.map((f, i) => <li key={i}>{f}</li>)}
                 {caseData.extractedFacts.length === 0 && <li className="text-slate-400 italic list-none -ml-4">None identified</li>}
               </ul>
             </div>
             <div>
               <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                 Missing Info
                 <Badge tooltip="Text generation">AI</Badge>
               </h4>
               <ul className="list-disc pl-4 text-sm text-slate-700 space-y-1.5">
                 {caseData.missingInformation.map((f, i) => <li key={i}>{f}</li>)}
                 {caseData.missingInformation.length === 0 && <li className="text-slate-400 italic list-none -ml-4">None identified</li>}
               </ul>
             </div>
          </div>
          
          {caseData.clarificationHistory && caseData.clarificationHistory.length > 0 && (
             <div className="pt-6 mt-6 border-t border-slate-100">
               <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                 Clarification History
                 <Badge tooltip="Multi-turn context">Context</Badge>
               </h4>
               <div className="space-y-3">
                 {caseData.clarificationHistory.map((h, i) => (
                   <div key={i} className="text-sm bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-800">
                     {h}
                   </div>
                 ))}
               </div>
             </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
           <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex justify-between items-center">
             Automated Assessment
             <Badge tooltip="RAG / grounded retrieval">AI</Badge>
           </h3>
           
           <div className="space-y-6">
             {caseData.riskFlags.length > 0 && (
               <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm shadow-sm">
                 <strong className="block mb-2 flex items-center gap-2 uppercase tracking-wide text-xs">Risk Flags Detected</strong>
                 <ul className="list-disc pl-4 space-y-1">
                   {caseData.riskFlags.map((r, i) => <li key={i}>{r}</li>)}
                 </ul>
               </div>
             )}
             
             {caseData.validationConflicts.length > 0 && (
               <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm shadow-sm">
                 <strong className="block mb-2 flex items-center gap-2 uppercase tracking-wide text-xs">Validation Conflicts</strong>
                 <ul className="list-disc pl-4 space-y-1">
                   {caseData.validationConflicts.map((c, i) => <li key={i}>{c}</li>)}
                 </ul>
               </div>
             )}
             
             <div>
               <strong className="block text-xs uppercase tracking-wide text-slate-500 mb-2">Suggested Routing</strong>
               <div className="text-sm bg-slate-50 p-3 rounded-lg border border-slate-200 font-medium text-slate-900">
                  {agencyName(caseData.aiSuggestedAgencyId)}
               </div>
             </div>

              <div>
                <strong className="block text-xs uppercase tracking-wide text-slate-500 mb-2">Possible agencies</strong>
                <div className="text-sm bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-700 space-y-1">
                  {caseData.possibleAgencyIds.map((agencyId) => <div key={agencyId}>{agencyName(agencyId)}</div>)}
                </div>
              </div>

              {caseData.sourceFreshnessWarning && (
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-sm">
                  <strong className="block mb-1 uppercase tracking-wide text-xs">Source freshness warning</strong>
                  Confirm the official source is current before approving this routing.
                </div>
              )}

             {caseData.officialEvidence.length > 0 && (
               <div>
                 <strong className="block text-xs uppercase tracking-wide text-slate-500 mb-2">Official Evidence Considered</strong>
                 <ul className="list-disc pl-4 text-sm text-slate-700 space-y-1.5">
                   {caseData.officialEvidence.map((e, i) => <li key={i}>{e}</li>)}
                 </ul>
               </div>
             )}

             <div>
               <strong className="block text-xs uppercase tracking-wide text-slate-500 mb-2">Resident Outcome Preview</strong>
               <div className="text-sm bg-blue-50 p-4 rounded-lg border border-blue-200 text-blue-900 italic shadow-sm">
                 {caseData.residentOutcomePreview || 'No preview generated.'}
               </div>
             </div>
           </div>
        </div>
      </div>

      <div className="md:col-span-1 space-y-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-6">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex justify-between items-center">
            Review Action
            <Badge tooltip="Human review is governance, not AI. Tool use records the decision.">Governance & Tool Use</Badge>
          </h3>

          {actOnCase.isError && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              This case changed while you were reviewing it. Return to the queue and reopen the case before submitting another decision.
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Action</label>
              <select 
                value={action} 
                onChange={(e) => setAction(e.target.value as CaseActionAction)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="approve">Approve Routing</option>
                <option value="request_more_information">Request Clarification</option>
                <option value="edit_agency">Edit Agency</option>
                <option value="suppress_unsafe">Suppress (Unsafe)</option>
                <option value="reject">Reject</option>
              </select>
            </div>

            {action === 'edit_agency' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Agency ID</label>
                <select 
                  value={agencyId}
                  onChange={e => setAgencyId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                >
                  <option value="">Select an approved agency</option>
                  {APPROVED_AGENCIES.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Reason (Required)</label>
              <textarea 
                value={reason} 
                onChange={(e) => setReason(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[120px] resize-y"
                required
                placeholder="Document your reasoning for the audit log..."
              />
            </div>

            <button 
              type="submit" 
              disabled={actOnCase.isPending || !reason.trim()}
              className="w-full bg-slate-900 text-white font-medium py-2.5 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors mt-2"
            >
              {actOnCase.isPending ? 'Saving...' : 'Submit Decision'}
            </button>
          </div>
        </form>

        {caseData.auditHistory.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Audit History</h3>
             <div className="space-y-4">
               {caseData.auditHistory.map((a, i) => (
                 <div key={i} className="text-sm border-l-2 border-slate-200 pl-3">
                   <div className="text-slate-500 text-xs mb-1">{format(new Date(a.timestamp), 'MMM d, h:mm a')} &middot; {a.reviewer}</div>
                   <div className="font-medium text-slate-800 capitalize tracking-wide text-xs">{a.action}</div>
                   <div className="text-slate-600 mt-1">"{a.reason}"</div>
                 </div>
               ))}
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
