# Who Handles This? — Verification Report

**Run date:** September 22, 2026  
**Environment:** Replit development workflows with the managed OpenAI integration and self-hosted LibreTranslate  
**Result:** 15/15 routing cases passed, plus access/staff safeguards and a targeted driver-license handoff check

## Automated routing cases

| # | Scenario | Expected | Actual | Result |
|---|---|---|---|---|
| 1 | San José missed garbage pickup | Route to San José Environmental Services | Routed to `sj-environmental-services` | Pass |
| 2 | San José private-property blight and unsafe housing | Route to San José Code Enforcement | Routed to `sj-code-enforcement` | Pass |
| 3 | Santa Clara County delinquent property-tax bill | Route to Department of Tax and Collections | Routed to `scc-tax-collections` | Pass |
| 4 | CalFresh food-assistance notice | Route to County Social Services | Routed to `scc-social-services` | Pass |
| 5 | California unemployment claim | Route to California EDD | Routed to `ca-edd` | Pass |
| 6 | Two-word “DMV registration” input | Route without a minimum-word rule | Routed to `ca-dmv` | Pass |
| 7 | Mixed EDD and garbage topics, first round | Ask for clarification | `clarify` | Pass |
| 8 | Mixed topics, second round | Ask one final clarification | `clarify` | Pass |
| 9 | Mixed topics after two clarification rounds | Do not guess; require review | `review` | Pass |
| 10 | Input containing a Social Security number | Block before AI processing | `blocked` | Pass |
| 11 | Prompt-injection instruction | Block before AI processing | `blocked` | Pass |
| 12 | Pothole outside the six-agency allowlist | Do not route; require review | `review` | Pass |
| 13 | Simulated AI outage | Safe review fallback | `review` | Pass |
| 14 | Simulated stale authoritative source | Safe review fallback | `review` | Pass |
| 15 | German DMV description | Route to DMV with German selected | Routed to `ca-dmv` | Pass |

## Additional checks

- Unauthenticated routing request returned `401 Passcode access is required`.
- Unauthenticated staff reset returned `401 Staff access required`.
- Secure passcode verification set an httpOnly signed access cookie; status then returned `verified: true`.
- Staff queue returned six recent seeded demo cases with case IDs, official agency names, friendly status labels, and source-freshness indicators.
- Staff case detail showed a clearly labeled Demo case, a realistic resident description, extracted facts, missing information, official agency names, validation conflicts, risk flags, and clarification history.
- Staff `request_more_information` action required a written reason and appended an audit entry.
- Staff edit to an unapproved agency returned `400 Agency must be approved`.
- Resident “This seems wrong” intake returned `{ "accepted": true }`.
- Staff-only demo reset restored all six seeded cases and their initial audit entries while retaining resident wrong-routing reports.
- Staff queue displayed the persisted most-recent demo reset timestamp separately from case audit history.
- Staff queue displayed up to five newest-first demo reset records with restored-case and retained-report counts.
- Staff queue distinguishes loading, empty, and unavailable reset history; an unavailable history shows a retry action without blocking case review.
- The latest demo reset timestamp, restored seeded case, and retained resident report survived a second API restart.
- The reset-history safety check created six records and confirmed the API returned exactly the five newest records in descending order.
- A lost-driver-license description routed to DMV with a replacement-specific next step rather than vehicle-registration guidance.
- English-to-German translation returned a successful German translation.
- Full workspace TypeScript checks passed.
- Resident Vite production build passed.
- API server production bundle passed.

## Safety and scope assertions

- Recommendations are restricted to exactly six curated agencies.
- AI extraction is treated as untrusted; deterministic code enforces allowlisting, source freshness, supported evidence, and conflict handling.
- Official URLs and next-step instructions come from curated agency records.
- Sensitive patterns and prompt-injection patterns are rejected before an AI call.
- The staff interface and queue remain explicitly simulated demo data; reviewer actions, audit history, and resident wrong-routing reports are persisted in the staff demo store so a server restart does not erase them.
- The staff queue explains that reset affects demo data only, requires confirmation, and retains resident reports; it does not imply production case management.
- The prototype does not claim SJ311 integration, real agency submission, production authentication, official City approval, eligibility decisions, legal advice, or production resident-case management.

## Official source verification

On September 22, 2026, a responsible reviewer manually opened all six official URLs in the agency records. The pages loaded successfully and the records below were checked against the page's scope, jurisdiction, exclusions, and safe handoff:

| Agency | Source facts confirmed | Safe handoff and boundary |
|---|---|---|
| San José Environmental Services | The City page links Recycling & Garbage, Residential Services Lookup, and San José 311. The curated record is intentionally limited to garbage, recycling, and residential collection. | Include the service address and use the City's service-request page; county, state, and private-hauling matters remain outside this record. |
| San José Code Enforcement | The page covers safe conditions on private property and lists blight, building, housing, graffiti, junk/debris, vegetation, and zoning issues. It explicitly excludes public streets, public grounds, and public property. | File a private-property code report with address, observation, and date. Public-property issues go to San José 311; emergencies are not routed as code complaints. |
| Santa Clara County Department of Tax and Collections | The page provides secured and unsecured property-tax information, payment services, penalty information, and delinquent/collection notices. | Use the County tax page with the tax bill or parcel number; income tax, state unemployment, and city code cases remain outside this record. |
| Santa Clara County Social Services Agency | The page links health coverage, food assistance, financial assistance, protective services, and IHSS. The curated record covers public-assistance, food, health, and cash-aid benefits only. | Read the notice deadline and use County Social Services or the official benefit portal; EDD, DMV, and tax matters remain outside this record. |
| California Employment Development Department (EDD) | The official EDD page links unemployment benefits and Work Sharing and identifies EDD as the source for California employment-support programs. | Check the claim or notice on the EDD website and follow its deadline; County CalFresh, DMV, and property-tax matters remain outside this record. |
| California Department of Motor Vehicles (DMV) | The page confirms online DMV business, MyDMV, vehicle-registration renewal, driver-license transactions, and DMV fraud warnings. | Use the DMV notice or plate number for online checking or an appointment; police reports, EDD claims, and county taxes remain outside this record. |

All six records have `lastReviewed: "2026-09-22"` and a 180-day review interval. The source-review TODOs were removed after this check. `isStale` still treats either an expired review date or the explicit stale test flag as a safety condition, and routing must fall back to staff review rather than relying on stale evidence.

## Automated agency preflight and demo readiness

The standalone pre-demo command is `pnpm run preflight:agency`. The readiness command used by the `routing-safety` validation workflow is `pnpm run demo:ready`; it runs the agency preflight first, then the workspace typecheck and routing/staff safety matrix. A failed record or link check stops the readiness command before the demo checks run. It also exercises the validator's failure cases for a missing date, an expired date, and a pending manual-verification marker.

The live link check treats an HTTP 401 or 403 as reachable-but-access-restricted and prints an explicit warning; network failures and other HTTP error responses fail the preflight. Presenters should not hide those warnings: manually open affected official links in a normal browser before the demo and confirm the curated record still matches the page. On September 22, 2026, all six links responded, with 403 warnings for the County tax and Social Services sites. Their content was still confirmed through the manual browser verification above.

The routing safety matrix separately simulates a stale authoritative source and asserts that it returns `review` with a failed `source_freshness` check, confirming that stale evidence takes the staff-review path. It also restarts the API after a reviewer agency edit and a resident wrong-routing report, then confirms the decision, audit history, and report are still present.