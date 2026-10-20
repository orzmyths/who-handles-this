import {readFile,writeFile} from "node:fs/promises";
const dir=new URL("../reports/civic-readiness/",import.meta.url);
const result=JSON.parse(await readFile(new URL("evaluation-results.json",dir),"utf8"));
let initial;
try {initial=JSON.parse(await readFile(new URL("initial-evaluation-results.json",dir),"utf8"));} catch(error) {if(error.code!=="ENOENT") throw error;}
const readiness=await readFile(new URL("readiness.md",dir),"utf8");
const demo=await readFile(new URL("demo-script.md",dir),"utf8");
let browserVerification="";
try {browserVerification=await readFile(new URL("browser-verification.md",dir),"utf8");} catch(error) {if(error.code!=="ENOENT") throw error;}
let spanishDemo;
try {spanishDemo=JSON.parse(await readFile(new URL("spanish-demo-verification.json",dir),"utf8"));} catch(error) {if(error.code!=="ENOENT") throw error;}
const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const inline=text=>escape(text).replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>")
 .replace(/(https:\/\/[^\s<]+)/g,'<a href="$1" rel="noopener noreferrer">$1</a>');
function markdown(text) {
 return text.split(/\n\n+/).map(block=>{
  if(block.startsWith("### "))return `<h3>${inline(block.slice(4))}</h3>`;
  if(block.startsWith("## "))return `<h2>${inline(block.slice(3))}</h2>`;
  if(block.startsWith("# "))return `<h1>${inline(block.slice(2))}</h1>`;
  if(block.split("\n").every(line=>line.startsWith("- ")))return `<ul>${block.split("\n").map(line=>`<li>${inline(line.slice(2))}</li>`).join("")}</ul>`;
  if(block.split("\n").every(line=>/^\d+\.\s/.test(line)))return `<ol>${block.split("\n").map(line=>`<li>${inline(line.replace(/^\d+\.\s/,""))}</li>`).join("")}</ol>`;
  return `<p>${inline(block).replace(/\n/g,"<br>")}</p>`;
 }).join("\n");
}
const metric=(key,label)=>`<tr><th>${label}</th><td>${result.metrics[key].passed} / ${result.metrics[key].total}</td></tr>`;
const resultsTable=`<div class="table-wrap"><table><thead><tr><th>Case</th><th>Locale</th><th>Actual status</th><th>Actual agencies</th><th>Result</th></tr></thead><tbody>${result.results.map(x=>`<tr><td>${escape(x.id)}</td><td>${escape(x.language)}</td><td>${escape(x.output.status??x.httpStatus)}</td><td>${escape(x.actualAgencies.join(", ")||"—")}</td><td class="${x.passed?"pass":"fail"}">${x.passed?"PASS":"FAIL"}</td></tr>`).join("")}</tbody></table></div>`;
function caseEvidence(x) {
 const affected=x.category==="language-parity"||/renewal|replacement/.test(x.id)
  ?"Residents using a non-English interface or report language."
  :/benefits|combined|alternatives/.test(x.id)?"Residents with benefits notices or multiple time-sensitive needs.":"Residents relying on the prototype for a safe next step.";
 const severity=/identifier|address|injection|outside/.test(x.id)?"High potential harm if mishandled; actual corpus outcome is shown below.":"Moderate potential harm; no resident harm was measured.";
 return `<details><summary>${escape(x.id)} — ${x.passed?"PASS":"FAIL"}</summary><p><strong>Exact synthetic input:</strong> ${escape(x.description)}</p><p><strong>Provisional expectation:</strong> ${escape(x.statuses.join(" or "))}${x.agencies?`; ${escape(x.agencies.join(", "))}`:""}.</p><p><strong>Potential harm:</strong> ${escape(x.harm??"Extra steps or an incorrect handoff can prevent the resident reaching an appropriate service.")}</p><p><strong>Potentially affected users:</strong> ${escape(affected)}</p><p><strong>Severity:</strong> ${severity}</p><p><strong>Mitigation:</strong> ${x.passed?"Retain the guardrail and regression case; independent held-out validation remains required.":"Keep the failure visible; investigate intent/evidence extraction and guardrails before claiming reliable handling."}</p><p><strong>Actual HTTP status:</strong> ${x.httpStatus}; <strong>elapsed API time:</strong> ${x.ms} ms. This is not resident task-completion time.</p><pre>${escape(JSON.stringify(x.output,null,2))}</pre></details>`;
}
const firstFailures=initial?.results.filter(x=>!x.passed)??[];
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Who Handles This? — evidence and readiness</title><style>
*{box-sizing:border-box}body{margin:0;background:#f3f5f7;color:#192d40;font:16px/1.65 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{max-width:1050px;margin:32px auto;padding:40px;background:white;border:1px solid #d7dfe7;border-radius:12px}h1{font-size:30px;line-height:1.2}h2{font-size:23px;margin-top:36px;line-height:1.35}h3{font-size:19px}a{color:#1554a2;overflow-wrap:anywhere}.notice{padding:16px 20px;border-left:4px solid #96741b;background:#fff8e5}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;margin:16px 0;font-size:14px}th,td{padding:10px 12px;border-bottom:1px solid #d7dfe7;text-align:left;vertical-align:top}th{background:#f1f5f8}.pass{color:#176642;font-weight:700}.fail{color:#a82929;font-weight:700}details{border:1px solid #d7dfe7;border-radius:6px;padding:14px;margin:12px 0}summary{font-weight:650;cursor:pointer}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f4f6f8;padding:18px;font-size:12px;line-height:1.5}nav{display:flex;gap:16px;flex-wrap:wrap;border-bottom:1px solid #d7dfe7;padding-bottom:20px}.meta{font-size:13px;color:#586a7a}li{margin:5px 0}@media(max-width:650px){main{margin:0;padding:22px;border:0;border-radius:0}h1{font-size:26px}th,td{padding:8px}}@media print{body{background:white}main{margin:0;max-width:none;border:0;padding:0}nav{display:none}details{break-inside:avoid}pre{font-size:10px}}
</style></head><body><main><header><p class="meta">City of San José presentation preparation · Snapshot ${escape(result.evaluatedAt)}</p><h1>Who Handles This? — evidence and readiness</h1><p class="notice"><strong>Prototype, not production.</strong> No City integration, real staff monitoring, official submission or delivered email is demonstrated. All evaluation inputs are synthetic; expected outcomes are developer judgments.</p></header><nav><a href="#metrics">Live results</a><a href="#readiness">Readiness</a><a href="#demo">90-second demo</a><a href="#failures">Actual first-run failures</a><a href="#evidence">Full current outputs</a></nav>
<section id="metrics"><h2>Latest live regression results</h2><p>${escape(result.methodology)} The corpus was used to tune extraction, so a retest is not independent held-out evidence.</p><table><tbody>${metric("overall","All cases")}${metric("routableCorrect","Routable cases meeting provisional expectations")}${metric("languageParity","Language-parity cases")}${metric("redTeam","Adversarial / edge cases")}</tbody></table><p>Clarifications: ${result.metrics.clarificationCount}. Reviews: ${result.metrics.reviewCount}. Usable source-and-next-step handoffs: ${result.metrics.usableHandoffCount}. These are corpus counts, not population accuracy, real task completion or measured time savings.</p><p class="meta">Unsaved endpoint check: ${escape(result.persistenceCheck?.note??"See JSON record.")}</p>${resultsTable}</section>
<section id="readiness">${markdown(readiness)}</section><section id="demo">${markdown(demo)}</section>${browserVerification?`<section id="workflow">${markdown(browserVerification)}</section>`:""}
<section id="failures"><h2>Actual first-run failures retained</h2><p>${initial?`The initial run met provisional expectations on ${initial.metrics.overall.passed}/${initial.metrics.overall.total} cases.`:"No earlier run is available in this snapshot."} The outputs below are preserved before mitigation, not reconstructed.</p>${firstFailures.map(caseEvidence).join("")}</section>
<section id="evidence"><h2>Exact current inputs and full API outputs</h2><p>Expanded records contain actual HTTP results. All inputs are synthetic; severity and potential harm are developer assessments. No failures are omitted. Stable agency records and contacts are curated evidence, not live AI browsing.</p>${result.results.map(caseEvidence).join("")}${spanishDemo?`<h3>Supplementary Spanish demonstration input</h3><p>${escape(spanishDemo.methodology)} Result: ${spanishDemo.passed?"PASS":"FAIL"}; checked ${escape(spanishDemo.checkedAt)}.</p><pre>${escape(JSON.stringify(spanishDemo,null,2))}</pre>`:""}</section>
<footer><p class="meta">Generated from retained evaluation JSON and readiness documents. Sources and limitations are included above. No external scripts, fonts or images are required.</p></footer></main></body></html>`;
if(Buffer.byteLength(html,"utf8")>5_242_880)throw new Error("Report exceeds 5 MiB; do not silently truncate.");
await writeFile(new URL("readiness-report.html",dir),html);
console.log(`Wrote readiness-report.html (${Buffer.byteLength(html,"utf8")} bytes).`);