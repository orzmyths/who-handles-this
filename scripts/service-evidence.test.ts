import {test} from "node:test";
import assert from "node:assert/strict";
import {AGENCIES} from "../artifacts/api-server/src/lib/agency-data";
import {validateServiceEvidence,serviceRecommendations,serviceNextStep,hasUnsupportedService} from "../artifacts/api-server/src/lib/service-evidence";
const request = {serviceFamily:"driver_license",requestedAction:"renew",supportingText:"Mein Führerschein ist abgelaufen.",uncertainty:"none"};
test("German exact evidence maps a renewal without an English keyword",()=>{
 const result=validateServiceEvidence([request],request.supportingText);
 assert.equal(result.invalid,false);
 assert.equal(serviceRecommendations(result.requests,AGENCIES)[0].a.id,"ca-dmv");
 assert.match(serviceNextStep(AGENCIES.find(a=>a.id==="ca-dmv")!,result.requests,"fallback"),/renewal/);
});
test("Fabricated supporting quotes and unknown categories are rejected",()=>{
 assert.equal(validateServiceEvidence([{...request,supportingText:"A fabricated claim"}],"Original").invalid,true);
 assert.equal(validateServiceEvidence([{...request,serviceFamily:"passport"}],request.supportingText).invalid,true);
});
test("Short Chinese service names remain valid literal evidence",()=>{
 assert.equal(validateServiceEvidence([{...request,supportingText:"驾照"}],"驾照过期了").invalid,false);
 assert.equal(validateServiceEvidence([{...request,supportingText:"駕照"}],"駕照過期了").invalid,false);
});
test("A supported issue must not hide an independent unsupported service",()=>{
 const result=validateServiceEvidence([
  {...request,supportingText:"driver's license"},
  {...request,serviceFamily:"unknown",supportingText:"passport"},
 ],"My driver's license and my passport have expired.");
 assert.equal(result.invalid,false);
 assert.equal(hasUnsupportedService(result.requests),true);
 assert.equal(serviceRecommendations(result.requests,AGENCIES).length,1);
});
test("Alternatives retain uncertainty instead of being promoted to confirmed evidence",()=>{
 const result=validateServiceEvidence([{...request,uncertainty:"ambiguous"}],request.supportingText);
 assert.equal(result.requests[0].uncertainty,"ambiguous");
});
test("Independent requests retain resident order and deduplicate the agency",()=>{
 const original="My garbage bill and my unemployment letter.";
 const result=validateServiceEvidence([
 {...request,serviceFamily:"unemployment",supportingText:"unemployment letter"},
 {...request,serviceFamily:"garbage_recycling",requestedAction:"dispute_bill",supportingText:"garbage bill"},
 ],original);
 assert.deepEqual(serviceRecommendations(result.requests,AGENCIES).map(item=>item.a.id),["sj-environmental-services","ca-edd"]);
});