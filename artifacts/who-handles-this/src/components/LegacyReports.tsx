import { useListLegacyReports, getListLegacyReportsQueryKey } from "@workspace/api-client-react";

export function LegacyReports() {
  const { data, isLoading, isError, refetch } = useListLegacyReports({ query: { queryKey: getListLegacyReportsQueryKey(), retry: false } });
  return <section className="my-6 rounded-xl border bg-white p-5" data-testid="legacy-reports">
    <h2 className="text-lg font-semibold">Unassigned legacy reports</h2>
    <p className="text-sm text-slate-600 my-2">Preserved from the shared-passcode prototype. Only approved staff can view these reports. They are never assigned automatically to a resident.</p>
    {isLoading ? <p>Loading legacy reports…</p> : isError ? <p role="alert">Could not load legacy reports. <button onClick={() => refetch()}>Retry</button></p> :
      !data?.length ? <p>No unassigned legacy reports.</p> : <details>
        <summary className="cursor-pointer">{data.length} preserved reports</summary>
        <ul className="space-y-3 mt-3">{data.map(row => <li key={row.id} className="rounded border p-3">
          <p className="text-xs text-slate-600">Report #{row.id} · {new Date(row.createdAt).toLocaleString()} · Unassigned</p>
          <p className="mt-1">{row.input.description}</p>
          <p className="mt-1 text-sm">{row.output.explanation}</p>
        </li>)}</ul>
      </details>}
  </section>;
}
