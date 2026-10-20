// Never expose server stack traces, SQL details, or the resident's input.
export function submissionErrorMessage(error: unknown): string {
  const status = error && typeof error === "object" && "status" in error
    ? error.status : undefined;
  if (status === 401) {
    return "Your sign-in session has expired. Sign in again before submitting your report.";
  }
  if (status === 403) {
    return "Report submission was refused. Refresh this page and try again. If it continues, sign out and sign in again.";
  }
  if (status === 429) {
    return "Too many requests were submitted. Wait one minute, then try again.";
  }
  if (status === 400 || status === 413) {
    return "Check your report: the description is required and the combined text must be no more than 2,000 characters.";
  }
  if (typeof status === "number" && status >= 500) {
    return "The routing service could not finish this request. Your text is still here; please try again shortly.";
  }
  return "The report could not be submitted. Check your connection and try again. Your text is still here.";
}