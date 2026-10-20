import { Link } from "wouter";
import { Landmark } from "lucide-react";
import { DeveloperSignIn } from "../components/DeveloperSignIn";

// The old shared-passcode gate is now a public introduction. It never grants
// access; individual Clerk accounts protect report history and staff decisions.
export function PublicHome() {
  return <main className="min-h-screen flex items-center justify-center bg-background p-6">
    <section className="max-w-xl rounded-2xl border border-border bg-card p-8 md:p-12">
      <Landmark className="text-primary mb-6" size={36} aria-hidden="true" />
      <p className="eyebrow">A civic routing prototype</p>
      <h1 className="font-serif text-4xl mb-5">Who Handles This?</h1>
      <p className="mb-4">Find the public office that may handle your issue, with links to official contact channels.</p>
      <p className="mb-6 text-muted-foreground">Sign in to submit a report and view only your own history. Approved reviewers can access reports for review. Existing demo reports are kept separate from resident histories.</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/sign-in" className="rounded-lg bg-primary text-primary-foreground px-5 py-3 font-semibold" data-testid="link-sign-in">Sign in</Link>
        <Link href="/sign-up" className="rounded-lg border border-border px-5 py-3 font-semibold" data-testid="link-sign-up">Create an account</Link>
      </div>
      <DeveloperSignIn />
      <p className="mt-8 text-sm text-muted-foreground">This prototype has not been approved for public government use. It does not submit official cases, and no real government staff are monitoring reports. Do not include personal or sensitive information.</p>
    </section>
  </main>;
}
