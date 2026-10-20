import { useState } from "react";
import { useClerk } from "@clerk/react";
import { developerSignIn } from "@workspace/api-client-react";
import { useLocation } from "wouter";

export function DeveloperSignIn() {
  const clerk = useClerk();
  const [, navigate] = useLocation();
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !passcode || !acknowledged) return;
    setBusy(true); setError("");
    try {
      const { ticket } = await developerSignIn({ passcode, demoAcknowledged: true });
      if (!clerk.client) throw new Error("Account sign-in is still loading.");
      const attempt = await clerk.client.signIn.create({ strategy: "ticket", ticket });
      if (attempt.status !== "complete" || !attempt.createdSessionId) throw new Error("Session could not be completed.");
      await clerk.setActive({ session: attempt.createdSessionId });
      setPasscode("");
      navigate("/reports");
    } catch (cause) {
      const status = cause && typeof cause === "object" && "status" in cause ? cause.status : undefined;
      setError(status === 400
        ? "Incorrect demo passcode or missing demo acknowledgement."
        : status === 429
          ? "Wait one minute, then try again."
          : "Demo sign-in is unavailable or not configured yet. Regular sign-in is still available.");
    } finally { setBusy(false); }
  }

  return <details className="mt-6 border-t border-border pt-5">
    <summary className="cursor-pointer font-semibold" data-testid="developer-sign-in-toggle">Developer demo sign-in</summary>
    <p className="my-3 text-sm text-muted-foreground">Try the app using a shared test account. Everyone using this demo account can see its saved reports. No access to other residents’ reports or staff tools.</p>
    <form onSubmit={submit} className="flex flex-wrap gap-3">
      <label className="sr-only" htmlFor="developer-passcode">Demo passcode</label>
      <input id="developer-passcode" type="password" autoComplete="off" maxLength={128}
        value={passcode} onChange={event => setPasscode(event.target.value)}
        disabled={busy} placeholder="Demo passcode" required
        className="rounded-lg border border-border px-3 py-2 bg-background" />
      <label className="flex basis-full items-start gap-2 text-sm">
        <input type="checkbox" checked={acknowledged} required disabled={busy}
          onChange={event => setAcknowledged(event.target.checked)} className="mt-1"
          data-testid="demo-acknowledgement" />
        <span>I understand demo reports are shared. I will use made-up information only.</span>
      </label>
      <button type="submit" disabled={busy || !passcode || !acknowledged}
        className="rounded-lg border border-primary px-4 py-2 font-semibold disabled:opacity-50"
        data-testid="developer-sign-in-submit">{busy ? "Signing in…" : "Enter shared demo"}</button>
    </form>
    {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
  </details>;
}