# Who Handles This? — presentation readiness

## Recommendation

Recommend a bounded, City-reviewed pilot evaluation—not production deployment. The prototype now demonstrates multilingual service/action extraction, recommendations constrained to seven curated agencies, resident-checked email drafts, and a linked simulated human-review outcome. It does not submit City cases, send email, establish resident eligibility, or connect to City case-management systems.

## Civic problem and persona

**Problem:** A resident can understand their problem without knowing whether the next step belongs to the City, County or State; ordinary office directories still require them to translate the problem into government terminology.

**Illustrative persona, not an observed research participant:** A San José resident reading an unemployment notice and a garbage bill in a non-English language. A staff intake reviewer needs the issue, supporting facts and missing information without re-reading an unstructured message from the beginning.

**Verified local context:** The City's 2025 SJ311 open-data resource displays **341,441 entries**, with data last updated January 5, 2026. This supports the scale of service-request activity, NOT the frequency of misrouting, unique residents, language barriers or time saved. Confirm deduplication and count definitions with the City before describing it as unique requests.

Source: https://data.sanjoseca.gov/dataset/311-service-request-data/resource/761d15cc-0e89-46f4-a35b-0e586d746edf

There is no measured local misrouting baseline or resident usability study yet. Do not invent one.

## Why AI, and what is not AI

- **AI:** Interprets varied multilingual wording, extracts stable service/action categories with original supporting quotes, identifies independent issues and uncertainties, translates text, and generates constrained explanations.
- **Deterministic safeguards:** Check category allowlists, literal quote presence, supported jurisdiction/freshness, unsafe-input patterns and curated contact evidence. Quote presence does not prove that the model interpreted the quote correctly.
- **Human oversight:** A demo reviewer chooses or corrects an office, supplies a reason, and approves/rejects the routing; the resident sees a separate simulated decision in saved history.
- **Ordinary software:** Database transactions, saved history, polling, revision-conflict checks and audit records. Do not present these as autonomous AI tool use.

This is constrained language understanding and decision support, not an autonomous agent or live RAG system. Sources are curated records; the model does not browse or continuously verify official policy. Against generic search/chat, the differentiators are bounded agency choices, explicit uncertainty, inspected contact evidence, multiple distinct issue handoffs and a traceable human-review path. Comparative superiority has not been established.

## What the linked review demonstrates

A review report and its case are saved in one transaction. The report carries its case identifier; the case points back to the report. Saved history reads current persisted decisions, not a browser's old snapshot.

Pending, edited and awaiting-information cases refresh automatically. Approval shows the reviewed office and official next step separately from the original automated result. Rejection and suppression do not display an approved office. Editing is not approval. If more information is requested, the prototype instructs the resident to submit a clarified report; replying within the same case and real staff notifications are not implemented.

All staff review remains simulated. Shared-passcode access does not separate staff from residents.

## Measured evidence

See evaluation-results.json and evaluation-summary.md for the latest actual end-to-end outputs. initial-evaluation-results.json retains the first run, including its failures. All corpus inputs are synthetic and expectations are developer-authored provisional judgments—not independent native-speaker, City or domain-expert validation.

The first run passed **19/22** cases, including **5/7** language-parity checks and **11/12** adversarial cases. It unnecessarily asked German and Simplified Chinese users whether an expired driving credential needed renewal or replacement. It also refused a combined unemployment/trash-bill report because an extracted quote was not verbatim.

Mitigation: clarify the service/action extraction rules across languages, require short contiguous original quotes, and distinguish ambiguity about an office from merely unspecified account details or desired action. The quote validator was strengthened, not bypassed.

The second run is a regression check on cases used to improve the prompt, not a held-out accuracy estimate. Keep any remaining failures visible. Corpus routing, clarification, review and usable-handoff counts are not production accuracy or time-saved claims.

## Responsible-AI failure for the pitch

**Exact input:** Mein Führerschein ist abgelaufen.

**Actual first-run result:** status clarify; requestedAction unknown; uncertainty missing_context; question “Möchten Sie Ihren Führerschein erneuern oder ersetzen?”

**Failure:** The model introduced an unnecessary renewal-versus-replacement ambiguity despite the report explicitly saying the credential expired.

**Potential harm:** Extra steps can delay reaching the correct service and disproportionately burden residents using a non-English language. No actual resident harm was measured.

**Severity:** Moderate in this corpus; consequences may be more serious for deadline-sensitive services.

**Mitigation:** Language-independent semantic guidance, literal original-evidence validation, curated agency checks and recorded regression cases. Success on one retest is not a guarantee against future variation.

The combined-report quote failure is a second useful example: refusing invented evidence is correct safety behavior, but inaccurate extraction still causes a usability failure. Do not describe the validator as having incorrectly rejected valid evidence.

## Production gates

- Real staff identity, role-based authorization and resident-specific history access. Any holder of the shared prototype passcode can currently access resident history and staff actions.
- City-approved retention, deletion, consent, privacy/security assessment and incident handling. Pattern-based identifier blocking is not comprehensive PII protection.
- Named owners and review cadence for agency scopes and contact evidence; automated access restrictions must not be mistaken for official website unavailability.
- Accessibility audit and independent native-speaker evaluation, including machine-translated official-purpose warnings and draft guidance.
- Held-out domain-expert review, comparative baseline, realistic resident/staff usability tests and ongoing monitoring.
- Approved case-management integration and delivery confirmation before any claim of official submission or operational staff review.

These are deployment requirements, not capabilities quietly assumed by the demo.

## Provisional internal score

Story **22/30**: concrete persona and workflow with a sourced local scale indicator; lacks observed local pain and a measured comparative baseline.

AI innovation **90/120**: meaningful multilingual extraction, constrained evidence/action mapping and connected decision support; lacks independent effectiveness evidence and a demonstrated advantage over current intake/search workflows.

Responsible AI **35/50**: real failure evidence, at least ten adversarial inputs, visible uncertainty and simulation boundaries; incomplete privacy/access controls, language validation and City governance approval.

**Total: 147/200.** This is a subjective internal appraisal using the supplied category weights, not an official judge score or a claimed improvement over an unmeasured previous score. Governance readiness has no invented extra point allocation. Revise this appraisal if remaining live failures or user-study evidence materially change the conclusions.

## Five-minute presentation plan

- 0:00–0:40: State the resident problem and illustrative persona. Use the SJ311 count only as service-volume context.
- 0:40–1:20: Explain why language understanding is needed and how curated rules constrain recommendations.
- 1:20–2:50: Run the 90-second workflow in demo-script.md.
- 2:50–3:45: Show the actual German expired-license failure and mitigation, with measured corpus limitations.
- 3:45–4:35: Explain simulated review and the unmet identity/privacy/City-approval gates.
- 4:35–5:00: Ask for a City-reviewed pilot evaluation, not immediate production approval.

## Three pitch priorities

1. One report can contain different City/County/State needs; preserve both.
2. AI interprets language while bounded sources and human decisions constrain the handoff.
3. Show one real failure, the mitigation, the actual retest and the remaining production gates.

## Three low-value topics to omit

1. Cosmetic redesign details and the number of interface features.
2. Unsupported autonomous-agent/RAG labels or model novelty claims.
3. Unmeasured time savings, production accuracy, real City integration or delivery claims.