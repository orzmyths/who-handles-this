# Resident–staff workflow verification

These observations came from the running, passcode-protected prototype in a real browser. All submitted inputs and staff reasons were synthetic; no email was sent, City case submitted, existing data reset or unrelated case modified.

## Verified resident experience

- In the English interface, “Mein Führerschein ist abgelaufen.” recommended California DMV renewal and displayed Driver license / Renew with the original German quote.
- An unsupported passport-renewal report created a linked simulated-review case and saved resident report, with no confirmed agency.
- The linked case's synthetic-only office edit appeared in another history page within approximately one eight-second polling interval, while the original automated review result remained separate.
- Rejection, its reason and its non-official outcome message persisted after reload. The deliberately incorrect passport/DMV pairing was never approved.
- The asynchronous history anchor scrolled to the intended report.
- At a 390 × 844 mobile viewport, Spanish review/evidence labels and simulation warnings were translated and there was no horizontal page overflow.

## Verified approval and information-request branches

A separate, supported California unemployment report used the documented simulateAiFailure flag to create a linked case. This was a controlled outage fixture, not a genuine AI failure or an additional red-team finding.

- A staff request for more information appeared as Awaiting information in the queue and as its localized status in resident history; the exact synthetic reason/message were retained.
- The demo reviewer selected California EDD, then approved it with a synthetic-only reason.
- Resident history showed Approved, the reason, simulated/non-official message, EDD's official-source title, contact options and next step.
- The original automated result still showed Staff review needed, no agency selected and the extraction-failure explanation.
- Approved status and the agency/source/next-step information survived a reload in a fresh browser session.

## Evidence limitation

Approval was verified from rendered UI content after reload. The browser tool did not return the final approval screenshot; available screenshots show intermediate review/edit forms only. Do not claim a final approval screenshot exists.

This demonstrates prototype workflow behavior, not production role-based security, actual staff monitoring, official approval or case delivery.