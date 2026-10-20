import {writeFile} from "node:fs/promises";
import {openEvaluationSession} from "./civic-evaluation-auth.mjs";
const base=process.env.CIVIC_EVALUATION_BASE_URL||"http://localhost:80";
const session=await openEvaluationSession();
try {
const description="Recibí una carta sobre mis beneficios de desempleo y mi factura de basura.";
const response=await session.fetch(`${base}/api/routing/evaluate`,{method:"POST",body:JSON.stringify({description,language:"es"}),signal:AbortSignal.timeout(50_000)});
const output=await response.json();
const agencies=[output.selected?.id,...(output.additionalRecommendations??[]).map(item=>item.selected.id)].filter(Boolean);
const passed=response.ok&&output.status==="routed"&&JSON.stringify(agencies)===JSON.stringify(["ca-edd","sj-environmental-services"])&&
 output.serviceRequests?.length===2&&output.serviceRequests.every(item=>description.includes(item.supportingText))&&!output.historyId&&!output.reviewCaseId;
await writeFile(new URL("../reports/civic-readiness/spanish-demo-verification.json",import.meta.url),JSON.stringify({
 checkedAt:new Date().toISOString(),methodology:"Supplementary live API check of the exact Spanish demonstration input; not added to the 22-case corpus metrics.",description,language:"es",httpStatus:response.status,passed,output,
},null,2)+"\n");
console.log(JSON.stringify({spanishCombinedDemoPassed:Boolean(passed),status:output.status,agencies}));
if(!passed)process.exitCode=1;
} finally {
  await session.close();
}