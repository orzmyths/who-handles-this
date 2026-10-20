import { getListStaffCasesQueryKey, getGetDemoStaffResetStatusQueryKey, useGetDemoStaffResetStatus, useListStaffCases, useResetDemoStaffCases } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { format } from 'date-fns';
import { ArrowUpRight, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ContactSourceQueue } from '../components/ContactSourceQueue';
import { LegacyReports } from '../components/LegacyReports';

const AGENCY_NAMES: Record<string, string> = {
  'sj-environmental-services': 'San José Environmental Services',
  'sj-code-enforcement': 'San José Code Enforcement',
  'sj-transportation': 'San José Department of Transportation',
  'scc-tax-collections': 'Santa Clara County Department of Tax and Collections',
  'scc-social-services': 'Santa Clara County Social Services Agency',
  'ca-edd': 'California Employment Development Department (EDD)',
  'ca-dmv': 'California Department of Motor Vehicles (DMV)',
};

const STATUS_LABELS: Record<string, string> = {
  needs_review: 'Needs review',
  approved: 'Approved',
  rejected: 'Rejected',
  awaiting_information: 'Awaiting information',
  suppressed: 'Suppressed',
  edited: 'Edited',
};

const AGENCY_OPTIONS = Object.entries(AGENCY_NAMES);

export function StaffQueue() {
  const { data: cases, isLoading } = useListStaffCases();
  const {
    data: resetStatus,
    isLoading: isResetStatusLoading,
    isError: isResetStatusError,
    refetch: refetchResetStatus,
  } = useGetDemoStaffResetStatus({
    query: {
      queryKey: getGetDemoStaffResetStatusQueryKey(),
      retry: false,
    },
  });
  const queryClient = useQueryClient();
  const resetDemo = useResetDemoStaffCases();
  const [statusFilter, setStatusFilter] = useState('all');
  const [freshnessFilter, setFreshnessFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [agencyFilter, setAgencyFilter] = useState('all');
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  const filteredCases = useMemo(() => {
    return (cases ?? []).filter((caseItem) => {
      const matchesStatus = statusFilter === 'all' || caseItem.status === statusFilter;
      const matchesFreshness =
        freshnessFilter === 'all' ||
        (freshnessFilter === 'warning' && caseItem.sourceFreshnessWarning) ||
        (freshnessFilter === 'current' && !caseItem.sourceFreshnessWarning);
      const matchesRisk =
        riskFilter === 'all' ||
        (riskFilter === 'flagged' && caseItem.riskFlags.length > 0) ||
        (riskFilter === 'clear' && caseItem.riskFlags.length === 0);
      const matchesAgency =
        agencyFilter === 'all' || caseItem.possibleAgencyIds.includes(agencyFilter);

      return matchesStatus && matchesFreshness && matchesRisk && matchesAgency;
    }).sort((first, second) => Date.parse(second.submittedAt) - Date.parse(first.submittedAt));
  }, [agencyFilter, cases, freshnessFilter, riskFilter, statusFilter]);

  const hasActiveFilters =
    statusFilter !== 'all' ||
    freshnessFilter !== 'all' ||
    riskFilter !== 'all' ||
    agencyFilter !== 'all';

  const resetFilters = () => {
    setStatusFilter('all');
    setFreshnessFilter('all');
    setRiskFilter('all');
    setAgencyFilter('all');
  };

  const handleResetDemo = () => {
    resetDemo.mutate(undefined, {
      onSuccess: (result) => {
        queryClient.invalidateQueries({ queryKey: getListStaffCasesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDemoStaffResetStatusQueryKey() });
        setConfirmReset(false);
        setResetMessage(
          `Reset ${result.resetCaseCount} seeded demo cases. Kept ${result.retainedReportCount} resident report${result.retainedReportCount === 1 ? '' : 's'}.`,
        );
      },
    });
  };

  if (isLoading) return <div className="p-8 text-slate-500">Loading queue...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif text-slate-900">Review Queue</h2>
        <p className="mt-1 text-sm text-slate-600">
          Narrow the queue to focus on cases that need attention first.
        </p>
      </div>

      <LegacyReports />
      <ContactSourceQueue />

      <section className="rounded-xl border border-blue-200 bg-blue-50 p-5" aria-labelledby="demo-controls-title">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 id="demo-controls-title" className="text-sm font-semibold text-blue-950">Demo data controls</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-blue-900">
              Reset restores the six seeded demo cases for the next walkthrough. Resident wrong-routing reports are kept.
              This changes demo data only; it is not production case management.
            </p>
          </div>
          {!confirmReset && (
            <button
              type="button"
              onClick={() => { setResetMessage(''); setConfirmReset(true); }}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-blue-300 bg-white px-3 py-2 text-sm font-medium text-blue-900 hover:bg-blue-100"
            >
              <RotateCcw size={15} />
              Reset seeded cases
            </button>
          )}
        </div>
        {confirmReset && (
          <div className="mt-4 rounded-lg border border-blue-300 bg-white p-4" role="dialog" aria-label="Confirm demo reset">
            <p className="text-sm font-medium text-slate-900">Reset the six seeded demo cases?</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Reviewer decisions and audit history on seeded cases will be replaced. Resident reports will remain in the queue.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleResetDemo}
                disabled={resetDemo.isPending}
                className="rounded-md bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {resetDemo.isPending ? 'Resetting...' : 'Confirm reset'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                disabled={resetDemo.isPending}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
            {resetDemo.isError && (
              <p className="mt-3 text-sm text-red-700" role="alert">The demo cases could not be reset. Try again.</p>
            )}
          </div>
        )}
        {resetMessage && <p className="mt-3 text-sm font-medium text-blue-900" role="status">{resetMessage}</p>}
        {isResetStatusError ? (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900" role="alert">
            <span>Demo reset history is temporarily unavailable. The case queue is still usable.</span>
            <button
              type="button"
              onClick={() => void refetchResetStatus()}
              className="rounded-md border border-amber-400 bg-white px-2.5 py-1.5 font-medium text-amber-900 hover:bg-amber-100"
            >
              Retry history
            </button>
          </div>
        ) : isResetStatusLoading ? (
          <p className="mt-3 text-xs text-blue-800" role="status">Loading demo reset history...</p>
        ) : (
          <>
            <p className="mt-3 text-xs text-blue-800">
              {resetStatus?.lastResetAt
                ? `Last demo reset: ${format(new Date(resetStatus.lastResetAt), 'MMM d, yyyy h:mm a')}`
                : 'No demo reset recorded yet.'}
            </p>
            {resetStatus?.recentResets && resetStatus.recentResets.length > 0 && (
              <div className="mt-3 border-t border-blue-200 pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-900">Recent demo resets</p>
                <ul className="mt-2 space-y-1 text-xs text-blue-800">
                  {resetStatus.recentResets.map((reset) => (
                    <li key={reset.resetAt}>
                      {format(new Date(reset.resetAt), 'MMM d, yyyy h:mm a')} · {reset.resetCaseCount} seeded cases restored · {reset.retainedReportCount} resident reports kept
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>

      <form
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        aria-label="Filter review queue"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Filter cases</h3>
            <p className="text-xs text-slate-500 mt-1">Filters apply together.</p>
          </div>
          <button
            type="button"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
            className="rounded-md border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear filters
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="status-filter" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All statuses</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="freshness-filter" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Source freshness
            </label>
            <select
              id="freshness-filter"
              value={freshnessFilter}
              onChange={(event) => setFreshnessFilter(event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All source statuses</option>
              <option value="warning">Needs freshness review</option>
              <option value="current">Current sources</option>
            </select>
          </div>

          <div>
            <label htmlFor="risk-filter" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Risk flags
            </label>
            <select
              id="risk-filter"
              value={riskFilter}
              onChange={(event) => setRiskFilter(event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All risk levels</option>
              <option value="flagged">Has risk flags</option>
              <option value="clear">No risk flags</option>
            </select>
          </div>

          <div>
            <label htmlFor="agency-filter" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Agency
            </label>
            <select
              id="agency-filter"
              value={agencyFilter}
              onChange={(event) => setAgencyFilter(event.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All agencies</option>
              {AGENCY_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </form>

      <p className="text-sm text-slate-600" aria-live="polite">
        Showing <span className="font-semibold text-slate-900">{filteredCases.length}</span> of{' '}
        <span className="font-semibold text-slate-900">{cases?.length ?? 0}</span> cases
      </p>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        <table className="w-full min-w-[1050px] text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
            <tr>
              <th className="px-6 py-3">Case ID</th>
              <th className="px-6 py-3">Submitted</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Possible agencies</th>
              <th className="px-6 py-3">Source</th>
              <th className="px-6 py-3">Resident Input</th>
              <th className="px-6 py-3">Reason for Review</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredCases.map(c => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-mono text-xs text-slate-600 whitespace-nowrap">{c.id}</td>
                <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                  {format(new Date(c.submittedAt), 'MMM d, h:mm a')}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-medium uppercase tracking-wide">
                    {STATUS_LABELS[c.status] ?? c.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-700 max-w-[280px]">
                  <div className="space-y-1">
                    {c.possibleAgencyIds.map(id => <div key={id}>{AGENCY_NAMES[id] ?? id}</div>)}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {c.sourceFreshnessWarning ? (
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 border border-amber-200">
                      Review freshness
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">Current</span>
                  )}
                </td>
                <td className="px-6 py-4 text-slate-900 max-w-[200px] truncate" title={c.residentDescription}>
                  {c.residentDescription}
                </td>
                <td className="px-6 py-4 text-slate-600 max-w-[200px] truncate" title={c.reviewReason}>
                  {c.reviewReason}
                </td>
                <td className="px-6 py-4 text-right">
                  <Link href={`/staff/${c.id}`} className="text-blue-600 font-medium hover:underline inline-flex items-center gap-1">
                    Review <ArrowUpRight size={14} />
                  </Link>
                </td>
              </tr>
            ))}
            {filteredCases.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                  <p className="font-medium text-slate-700">
                    {hasActiveFilters ? 'No cases match these filters.' : 'No cases in the queue.'}
                  </p>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="mt-2 text-sm font-medium text-blue-600 hover:underline"
                    >
                      Clear filters and show all cases
                    </button>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
