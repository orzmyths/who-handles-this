import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, routingHistory } from "@workspace/db";
import { ListRoutingHistoryResponse } from "@workspace/api-zod";
import { AGENCIES, isStale, type Agency } from "../lib/agency-data";
import { getApprovedAgencies } from "../lib/approved-contact-store";
import { currentRoutingEvidence } from "../lib/current-routing-evidence";
import { matchRoutingEvidence, nextStepFor, separateIssueMatches } from "../lib/routing-matches";
import { communicationFor } from "../lib/department-communication";
import { saveLinkedReviewReport, linkedReviewCases } from "../lib/staff-case-store";
import { SERVICE_REQUEST_SCHEMA, validateServiceEvidence, serviceRecommendations, serviceNextStep, hasUnsupportedService } from "../lib/service-evidence";
import { SERVICE_EXTRACTION_PROMPT } from "../lib/service-extraction-prompt";
import { authenticatedUserId, requireResident } from "../lib/access-control";
const router: IRouter = Router(); const limits=new Map<string,{n:number;at:number}>();
router.use("/routing", requireResident);
const injection=/(ignore|disregard|forget)\s+(all|any|the)\s+(previous|prior|system|instructions)|system prompt|developer message/i;
const sensitive=/(?:\b\d{3}[- ]?\d{2}[- ]?\d{4}\b)|(?:[\w.+-]+@[\w-]+\.[\w.-]+)|(?:\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b)|(?:\b\d{8,}\b)|\b(?:ssn|social security|password|credit card|bank account|medical record|account number|license number)\b/i;
const fullStreetAddress=/\b\d{1,6}\s+(?:(?:north|south|east|west|n|s|e|w)\.?\s+)?(?:[A-Za-z]+\s+){1,5}(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct|boulevard|blvd|way|place|pl|terrace|ter)\b/i;
const limited=(ip:string)=>{const n=Date.now(),x=limits.get(ip);if(!x||x.at<n){limits.set(ip,{n:1,at:n+60000});return false;}x.n++;return x.n>30;};
const base=(status:"routed"|"clarify"|"review"|"blocked", extra:any={})=>({status,issue_type:null,government_level_hint:"unknown",location_hint:null,notice_agency_mentioned:null,key_facts:[],missing_information:[],candidate_agency_ids:[],needs_clarification:false,clarifying_question:null,selected:null,explanation:"",nextStep:null,confidence:"Needs review",validationChecks:[],clarificationRound:0,...extra});
const grounded=(a:Agency)=>`${a.name} covers ${a.scope}. Examples: ${a.includedExamples.join(", ")}. Source: ${a.officialTitle}, reviewed ${a.lastReviewed}.`;
const getOpenAI=async()=>(
 await import("@workspace/integrations-openai-ai-server")
).openai;
type Extraction = {
 issue_type:string|null; government_level_hint:"city"|"county"|"state"|"unknown";
 location_hint:string|null; notice_agency_mentioned:string|null; key_facts:string[];
 missing_information:string[]; candidate_agency_ids:string[]; needs_clarification:boolean;
 clarifying_question:string|null;
  routing_text_english:string|null;
};
const extractionProperties = {
 issue_type:{type:["string","null"]},government_level_hint:{type:"string",enum:["city","county","state","unknown"]},
 location_hint:{type:["string","null"]},notice_agency_mentioned:{type:["string","null"]},
 key_facts:{type:"array",items:{type:"string"}},missing_information:{type:"array",items:{type:"string"}},
 candidate_agency_ids:{type:"array",items:{type:"string"}},needs_clarification:{type:"boolean"},
 clarifying_question:{type:["string","null"]},routing_text_english:{type:"string"},
 service_requests:SERVICE_REQUEST_SCHEMA,
};
const extractionFormat = {type:"json_schema" as const,json_schema:{
 name:"routing_extraction",strict:true,schema:{
  type:"object",additionalProperties:false,properties:extractionProperties,required:Object.keys(extractionProperties),
 },
}};
const sanitizeExtraction=(value:unknown):Extraction=>{
 if(!value||typeof value!=="object"||Array.isArray(value))throw new Error("invalid extraction");
 const input=value as Record<string,unknown>;
 const nullableString=(field:string)=>typeof input[field]==="string"?(input[field] as string).slice(0,500):null;
 const strings=(field:string)=>Array.isArray(input[field])?(input[field] as unknown[]).filter((item):item is string=>typeof item==="string").slice(0,10).map(item=>item.slice(0,500)):[];
 const hint=["city","county","state","unknown"].includes(String(input.government_level_hint))?input.government_level_hint as Extraction["government_level_hint"]:"unknown";
 return {
  issue_type:nullableString("issue_type"),government_level_hint:hint,location_hint:nullableString("location_hint"),
  notice_agency_mentioned:nullableString("notice_agency_mentioned"),key_facts:strings("key_facts"),
  missing_information:strings("missing_information"),
  candidate_agency_ids:strings("candidate_agency_ids").filter(id=>AGENCIES.some(agency=>agency.id===id)),
   needs_clarification:input.needs_clarification===true,clarifying_question:nullableString("clarifying_question"),
   routing_text_english:typeof input.routing_text_english==="string"?input.routing_text_english.slice(0,8000):null,
    ...(Array.isArray(input.service_requests)?{service_requests:input.service_requests}:{}),
 };
};
const historyInput=(body:any, history:string[])=>({
 description:body.description,
 noticeText:typeof body.noticeText==="string"?body.noticeText:null,
 language:typeof body.language==="string"?body.language:"auto",
 clarificationHistory:history,
});
const saveAndSend=async(req:any,res:any,body:any,history:string[],output:any)=>{
 if(req.path==="/routing/evaluate"){res.json(output);return;}
  if(output.status==="review"){
   try {
    output = await saveLinkedReviewReport({
     residentDescription:body.description,
     reviewReason:typeof output.explanation==="string"&&output.explanation.trim()?output.explanation:"Automated routing could not safely recommend an agency; simulated staff review is needed.",
     possibleAgencyIds:Array.isArray(output.candidate_agency_ids)?output.candidate_agency_ids:[],
     extractedFacts:Array.isArray(output.key_facts)?output.key_facts:[],
     missingInformation:Array.isArray(output.missing_information)?output.missing_information:[],
     sourceFreshnessWarning:Array.isArray(output.validationChecks)&&output.validationChecks.some((check:any)=>check.name==="source_freshness"&&check.passed===false),
     clarificationHistory:history,
    }, historyInput(body,history), output, authenticatedUserId(req)!);
   } catch(error) {
    req.log.error({err:error},"Failed to create simulated staff review case");
    res.status(500).json({error:"The simulated staff review case could not be saved. Please try again."});
    return;
   }
  } else {
   try {
    const [row] = await db.insert(routingHistory).values({ownerUserId:authenticatedUserId(req)!,input:historyInput(body,history),output}).returning({id:routingHistory.id});
    output.historyId = row.id;
   } catch(error) {
    req.log.error({err:error},"Failed to save routing history");
    res.status(500).json({error:"The routing result could not be saved. Please try again."});return;
   }
  }
 res.json(output);
};
router.get("/routing/history",async(req,res):Promise<void>=>{
 const rows=await db.select().from(routingHistory).where(eq(routingHistory.ownerUserId,authenticatedUserId(req)!)).orderBy(desc(routingHistory.createdAt),desc(routingHistory.id));
 const agencies = await getApprovedAgencies();
 const reviews = await linkedReviewCases(rows.map(row => row.id));
 res.json(ListRoutingHistoryResponse.parse(rows.map(row => ({
  ...row, output: (() => {
   const output = currentRoutingEvidence(row.output, agencies, (row.input as any)?.description ?? "");
   const review = reviews.find(item => item.routingHistoryId===row.id && item.id===output.reviewCaseId);
   if(review) {
    const audit = review.auditHistory.at(-1);
    const agency = review.status==="approved" ? agencies.find(item=>item.id===review.aiSuggestedAgencyId) : null;
    output.reviewOutcome = {caseId:review.id,status:review.status,message:review.residentOutcomePreview,
      reason:audit?.reason??"",updatedAt:audit?.timestamp??review.submittedAt,agency:agency??null,
      nextStep:agency&&!isStale(agency)?nextStepFor(agency,(row.input as any)?.description??""):null};
   }
   return output;
  })(),
 }))));
});
router.post(["/routing/analyze", "/routing/evaluate"],async(req,res):Promise<void>=>{
 const AGENCIES = await getApprovedAgencies();
 const b=req.body as any, historyInput=Array.isArray(b.clarificationHistory)?b.clarificationHistory.filter((x:any)=>typeof x==="string"):[], text=(typeof b.description==="string"?b.description:"")+" "+(typeof b.noticeText==="string"?b.noticeText:"")+" "+historyInput.join(" ");
 if(limited(req.ip??"unknown")){res.status(429).json({error:"Too many requests."});return;}
 if(typeof b.description!=="string"||b.description.length<1||b.description.length>2000){res.status(400).json({error:"Description must be 1–2000 characters."});return;}
 const history=historyInput;
 const round=history.length;
  if(sensitive.test(text)||fullStreetAddress.test(text)||injection.test(text)){res.json(base("blocked",{explanation:"This description contains sensitive information or instructions. Remove it and try again.",clarificationRound:round,validationChecks:[{name:"safety",passed:false,detail:"Sensitive or prompt-injection pattern detected."}]}));return;}
 let extraction:any; try {
  if(b.simulateAiFailure)throw new Error("simulated");
   const openai=await getOpenAI();
   const r=await Promise.race([openai.chat.completions.create({model:"gpt-5.4-mini",max_completion_tokens:8192,response_format:extractionFormat,messages:[{role:"system",content:`${SERVICE_EXTRACTION_PROMPT}\nCurated records: ${JSON.stringify(AGENCIES.map(a=>({id:a.id,name:a.name,level:a.level,scope:a.scope,includedExamples:a.includedExamples,exclusions:a.exclusions,jurisdictionFacts:a.jurisdictionFacts})))}.`},{role:"user",content:JSON.stringify({description:b.description,noticeText:b.noticeText??null,language:b.language,clarificationHistory:history})}]}),new Promise<never>((_,j)=>setTimeout(()=>j(new Error("timeout")),20000))]);
  extraction=sanitizeExtraction(JSON.parse(r.choices[0]?.message?.content??"{}"));
  } catch {await saveAndSend(req,res,b,history,base("review",{explanation:"Automated extraction failed; staff review is needed.",clarificationRound:round,validationChecks:[{name:"ai_extraction",passed:false,detail:"Invalid, unavailable, or timed-out AI result."}]}));return;}
 const ids=extraction.candidate_agency_ids;
  // The interface locale is not the language of the resident's report.
  // German input must also normalize when the resident leaves the UI in English.
  const normalizedText=extraction.routing_text_english?.trim()?extraction.routing_text_english:text;
  delete extraction.routing_text_english;
  if(sensitive.test(normalizedText)||fullStreetAddress.test(normalizedText)||injection.test(normalizedText)){res.json(base("blocked",{explanation:"This description contains sensitive information or instructions. Remove it and try again.",clarificationRound:round,validationChecks:[{name:"safety",passed:false,detail:"Unsafe content in translated input."}]}));return;}
  // A faithful translation can lose a recognized credential phrase. Retain
  // direct, allowlisted evidence from the original instead of relying on IDs.
  const { text:routingText, matches:found }=matchRoutingEvidence(text, normalizedText, AGENCIES);
  const structured = Object.hasOwn(extraction, "service_requests");
  const evidence = validateServiceEvidence(extraction.service_requests, text);
  delete extraction.service_requests;
  const serviceRequests = evidence.requests;
  extraction.serviceRequests = serviceRequests;
  if(structured && hasUnsupportedService(serviceRequests)){
    await saveAndSend(req,res,b,history,base("review",{...extraction,candidate_agency_ids:serviceRecommendations(serviceRequests,AGENCIES).map(item=>item.a.id),explanation:"At least one service in this report is outside the curated agency coverage. Simulated review is needed; supported issues must not hide an unhandled issue.",clarificationRound:round,validationChecks:[{name:"service_coverage",passed:false,detail:"An independent service has no curated agency mapping."}]}));return;
  }
  if(structured && (evidence.invalid || serviceRequests.some(item=>item.uncertainty==="outside_scope"))){
    await saveAndSend(req,res,b,history,base("review",{...extraction,explanation:evidence.invalid?"The service evidence could not be verified against the original report; simulated staff review is needed.":"This request is outside the curated jurisdiction; simulated staff review is needed.",clarificationRound:round,validationChecks:[{name:"service_evidence",passed:false,detail:evidence.invalid?"Invalid category or non-verbatim supporting quote.":"Explicitly outside the curated jurisdiction."}]}));return;
  }
  const independent=separateIssueMatches(routingText===text?`${b.description}\n${typeof b.noticeText==="string"?b.noticeText:""}`:routingText,found);
 const semanticMatches=serviceRecommendations(serviceRequests, AGENCIES);
 const recommendations=structured?semanticMatches:independent.length?independent:found.slice(0,1);
 const selected=recommendations[0]?.a;
 const stale=recommendations.some(match=>b.simulateStaleSource||isStale(match.a));
 const conflicting=structured?serviceRequests.some(item=>item.uncertainty==="ambiguous"||item.uncertainty==="missing_context"):found.length>1&&!independent.length;
  if(stale){await saveAndSend(req,res,b,history,base("review",{...extraction,candidate_agency_ids:[...new Set([...ids,...recommendations.map(match=>match.a.id)])],explanation:"The authoritative source needs manual review before routing.",clarificationRound:round,validationChecks:[{name:"source_freshness",passed:false,detail:"Source older than 180 days or simulated stale source."}]}));return;}
  if(conflicting&&round<2){await saveAndSend(req,res,b,history,base("clarify",{...extraction,candidate_agency_ids:(structured?semanticMatches:found).slice(0,3).map(x=>x.a.id),needs_clarification:true,clarifying_question:(structured&&extraction.clarifying_question)||selected?.clarifyingQuestions?.[0]||"Which agency or notice type is named?",clarificationRound:round,explanation:"More information is needed because the service evidence is ambiguous or missing essential context."}));return;}
  if(conflicting&&round>=2){await saveAndSend(req,res,b,history,base("review",{...extraction,candidate_agency_ids:(structured?semanticMatches:found).slice(0,3).map(x=>x.a.id),clarificationRound:round,explanation:"The service evidence remains unresolved after two clarification rounds; simulated staff review is needed.",validationChecks:[{name:"conflict_resolution",passed:false,detail:"Unresolved evidence after two clarification rounds."}]}));return;}
  if(!selected){await saveAndSend(req,res,b,history,base("review",{...extraction,explanation:"No authoritative agency matched; staff review is needed.",clarificationRound:round}));return;}
   const nextStep=serviceNextStep(selected,serviceRequests,nextStepFor(selected,routingText));
  const additionalRecommendations=recommendations.slice(1).map(match=>({
    selected:match.a,explanation:grounded(match.a),nextStep:serviceNextStep(match.a,serviceRequests,nextStepFor(match.a,routingText)),communication:communicationFor(match.a,routingText),
   confidence:match.score>1?"Strong match":"Supported match",
  }));
  let explanation=grounded(selected); let generationFallback=false;
 try {
    const openai=await getOpenAI();
   const generationRecord={...selected,safeNextStepTemplate:nextStep};
   const g=await Promise.race([openai.chat.completions.create({model:"gpt-5.4-mini",max_completion_tokens:8192,response_format:{type:"json_object"},messages:[{role:"system",content:`Return a JSON object with exactly explanation and nextStep. Use ONLY this agency record: ${JSON.stringify(generationRecord)}. Write the explanation in ${b.language==="auto"?"English":b.language||"English"}, including the exact agency name "${selected.name}" and the literal URL "${selected.officialUrl}". Copy nextStep verbatim from safeNextStepTemplate, without translating or changing it, even when the explanation is not in English.`},{role:"user",content:"Generate a short, plain-language grounded explanation."}]}),new Promise<never>((_,j)=>setTimeout(()=>j(new Error("timeout")),20000))]);
   const parsed=JSON.parse(g.choices[0]?.message?.content??""); if(typeof parsed.explanation!=="string"||parsed.nextStep!==nextStep||!parsed.explanation.includes(selected.name)||!parsed.explanation.includes(selected.officialUrl))throw new Error("invalid generation"); explanation=parsed.explanation;
 } catch { generationFallback=true; }
   await saveAndSend(req,res,b,history,base("routed",{...extraction,candidate_agency_ids:recommendations.map(match=>match.a.id),selected,additionalRecommendations,communication:communicationFor(selected,routingText),needs_clarification:false,clarifying_question:null,explanation,nextStep,confidence:recommendations[0].score>1?"Strong match":"Supported match",clarificationRound:round,validationChecks:[{name:"service_evidence",passed:structured,detail:structured?"Service/action categories grounded in exact resident quotes; this verifies evidence presence, not semantic correctness.":"Legacy keyword fallback; structured service evidence was not supplied."},{name:"allowlist",passed:true,detail:"Every recommended agency is in the curated allowlist."},{name:"source_freshness",passed:true,detail:"Every recommended source was reviewed within 180 days."},{name:"explanation_generation",passed:!generationFallback,detail:generationFallback?"AI explanation unavailable or invalid; deterministic grounded fallback used.":"Generated from selected agency record."}]}));
});
export default router;