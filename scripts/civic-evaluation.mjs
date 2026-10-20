import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { cases } from "./civic-evaluation-cases.mjs";
import { openEvaluationSession } from "./civic-evaluation-auth.mjs";

const base = process.env.CIVIC_EVALUATION_BASE_URL || "http://localhost:80";
const session = await openEvaluationSession();
try {
const outputDir = new URL("../reports/civic-readiness/", import.meta.url);
await mkdir(outputDir,{recursive:true});
try {
  await copyFile(new URL("evaluation-results.json",outputDir),new URL("initial-evaluation-results.json",outputDir),1);
} catch(error) {
  if (!["ENOENT","EEXIST"].includes(error.code)) throw error;
}
const headers = {"content-type":"application/json"};
const historyBefore = await (await session.fetch(`${base}/api/routing/history`, {headers})).json();
const results = [];
for (const test of cases) {
  const started = Date.now();
  const response = await session.fetch(`${base}/api/routing/evaluate`, {
    method:"POST", headers, signal:AbortSignal.timeout(50_000),
    body:JSON.stringify({description:test.description,language:test.language}),
  });
  const output = await response.json();
  if (output.historyId || output.reviewCaseId) throw new Error("Evaluation unexpectedly returned a saved report/case identifier.");
  const agencies = [output.selected?.id,...(output.additionalRecommendations??[]).map(item=>item.selected.id)].filter(Boolean);
  const statePass = response.ok && test.statuses.includes(output.status);
  const agencyPass = !test.agencies || JSON.stringify(test.agencies)===JSON.stringify(agencies);
  const actionPass = !test.nextStep || output.nextStep?.toLowerCase().includes(test.nextStep.toLowerCase());
  const evidencePass = output.status!=="routed" || output.validationChecks?.some(check=>check.name==="service_evidence"&&check.passed);
  results.push({...test,httpStatus:response.status,output,actualAgencies:agencies,ms:Date.now()-started,
    passed:Boolean(statePass&&agencyPass&&actionPass&&evidencePass)});
  console.log(`${results.at(-1).passed?"PASS":"FAIL"} ${test.id}: ${output.status} ${agencies.join(",")}`);
  if (response.status===429) throw new Error("Evaluation hit the rate limit; rerun after the limiter resets instead of claiming an AI failure.");
}
const historyAfter = await (await session.fetch(`${base}/api/routing/history`, {headers})).json();
const historyCountUnchanged = historyBefore.length===historyAfter.length;
const routable = results.filter(item=>item.agencies);
const redTeam = results.filter(item=>item.category==="red-team");
const languages = results.filter(item=>item.category==="language-parity");
const report = {
  evaluatedAt:new Date().toISOString(),
  methodology:"One live end-to-end API run with real configured AI. Synthetic inputs; developer-authored provisional expectations, not independent expert/City validation. No resident history or staff cases are created. No UI usability or real-time-saving measurement.",
  persistenceCheck:{noSavedIdentifiers:true,historyCountUnchanged,
    note:historyCountUnchanged?"History count unchanged during this run.":"History changed during concurrent activity; evaluate the unsaved endpoint separately before attributing any change."},
  metrics:{
    overall:{passed:results.filter(item=>item.passed).length,total:results.length},
    routableCorrect:{passed:routable.filter(item=>item.passed).length,total:routable.length},
    languageParity:{passed:languages.filter(item=>item.passed).length,total:languages.length},
    redTeam:{passed:redTeam.filter(item=>item.passed).length,total:redTeam.length},
    clarificationCount:results.filter(item=>item.output.status==="clarify").length,
    reviewCount:results.filter(item=>item.output.status==="review").length,
    usableHandoffCount:results.filter(item=>item.output.status==="routed"&&item.output.selected?.officialUrl&&item.output.nextStep).length,
  },results,
};
await mkdir(outputDir,{recursive:true});
await writeFile(new URL("evaluation-results.json",outputDir),JSON.stringify(report,null,2)+"\n");
const rows = results.map(item=>`| ${item.id} | ${item.language} | ${item.output.status??"error"} | ${item.actualAgencies.join(", ")||"—"} | ${item.passed?"PASS":"FAIL"} |`).join("\n");
await writeFile(new URL("evaluation-summary.md",outputDir),
  `# Live prototype evaluation\n\nEvaluated: ${report.evaluatedAt}\n\n${report.methodology}\n\n`+
  `Overall: **${report.metrics.overall.passed}/${results.length}**. Routable cases: **${report.metrics.routableCorrect.passed}/${routable.length}**. Language parity: **${report.metrics.languageParity.passed}/${languages.length}**. Red-team cases: **${report.metrics.redTeam.passed}/${redTeam.length}**.\n\n`+
  `Clarifications: ${report.metrics.clarificationCount}. Reviews: ${report.metrics.reviewCount}. Usable source-and-next-step handoffs: ${report.metrics.usableHandoffCount}. These are corpus counts, not production accuracy or time-saved estimates.\n\n`+
  `| Case | Language | Actual status | Actual agencies | Result |\n|---|---|---|---|---|\n${rows}\n\n`+
  `Exact inputs and full outputs, including failures, are preserved in evaluation-results.json. No failures are removed from this report.\n`);
console.log(JSON.stringify(report.metrics));
} finally {
  await session.close();
}