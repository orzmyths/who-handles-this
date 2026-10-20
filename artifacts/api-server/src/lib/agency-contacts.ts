// Verified against the linked official pages on 2026-10-04.
// Keep channel purposes separate; an appointment number is not complaint intake.
export type AgencyContact = {
  kind: "phone" | "online";
  label: string;
  value: string;
  hours?: string;
  hoursSourceUrl?: string;
  note?: string;
  sourceUrl: string;
  lastReviewed: string;
  reviewAfterDays: number;
};

const city = "https://www.sanjoseca.gov";
const code = `${city}/your-government/departments-offices/planning-building-code-enforcement/code-enforcement`;
const garbage = `${city}/your-government/departments-offices/environmental-services/recycling-garbage/residents/request-residential-garbage-and-recycling-services`;
const signals = `${city}/your-government/departments-offices/transportation/streets/signals`;
const tax = "https://dtac.santaclaracounty.gov/about-us/our-office-location-and-operating-information";
const benefits = "https://ssa.santaclaracounty.gov/about-us/contact-social-services-agency";
const edd = "https://edd.ca.gov/en/about_edd/contact_edd";
const dmv = "https://www.dmv.ca.gov/portal/contacting-dmv/";
const countyHours = "Monday–Friday, 8 a.m.–5 p.m.; except County holidays";
const eddHours = "Monday–Friday, 8 a.m.–5 p.m. Pacific; except state holidays";
const reviewed = (contacts: Omit<AgencyContact, "lastReviewed" | "reviewAfterDays">[]): AgencyContact[] =>
  contacts.map(contact => ({ ...contact, lastReviewed: "2026-10-04", reviewAfterDays: 180 }));

export const AGENCY_CONTACTS: Record<string, AgencyContact[]> = {
  "sj-environmental-services": reviewed([
    { kind: "phone", label: "Residential recycling and garbage service / City Contact Center", value: "+14085353500", hours: "24 hours a day, seven days a week (City Contact Center)", hoursSourceUrl: `${city}/your-government/departments-offices/information-technology/customer-service`, note: "Missed collections, damaged containers, service issues and container size changes. For other inquiries, contact your collection company.", sourceUrl: garbage },
    { kind: "online", label: "San José 311 — residential recycling and garbage requests", value: `${city}/311`, sourceUrl: garbage },
    { kind: "online", label: "City Contact Center hours and contact information", value: `${city}/your-government/departments-offices/information-technology/customer-service`, sourceUrl: `${city}/your-government/departments-offices/information-technology/customer-service` },
  ]),
  "sj-code-enforcement": reviewed([
    { kind: "phone", label: "Code Enforcement — inspector / City Hall appointments", value: "+14085357770", note: "For appointments about a case or compliance work. Use the service-request page to file a complaint; public-property issues belong to San José 311.", sourceUrl: code },
    { kind: "online", label: "Request Code Enforcement service or check case status", value: `${code}/request-service-check-status`, note: "The page links the complaint form and explains how to check a case.", sourceUrl: code },
  ]),
  "scc-tax-collections": reviewed([
    { kind: "phone", label: "Property-tax questions", value: "+14088087900", hours: "Monday–Friday, 9 a.m.–4 p.m.; except County holidays", note: "Office hours: Monday–Friday, 8 a.m.–5 p.m.; except County holidays.", sourceUrl: tax },
    { kind: "online", label: "Property-tax services and official payment portal", value: "https://dtac.santaclaracounty.gov/home", sourceUrl: "https://dtac.santaclaracounty.gov/home" },
  ]),
  "scc-social-services": reviewed([
    { kind: "phone", label: "Apply for benefits / CalFresh and cash-aid cases", value: "+14087583800", hours: countyHours, note: "If you already receive benefits, call the County Worker listed on your latest Notice of Action first.", sourceUrl: benefits },
    { kind: "phone", label: "Existing Medi-Cal-only cases", value: "+14087583600", hours: countyHours, sourceUrl: benefits },
    { kind: "online", label: "Apply for public benefits — County application hub", value: "https://ssa.santaclaracounty.gov/apply-public-benefits", note: "Links to BenefitsCal for applications and documents. BenefitsCal is not available for CAPI.", sourceUrl: "https://ssa.santaclaracounty.gov/apply-public-benefits" },
  ]),
  "ca-edd": reviewed([
    { kind: "phone", label: "Unemployment Insurance — English and Spanish", value: "+18003005616", hours: eddHours, sourceUrl: edd },
    { kind: "phone", label: "Disability Insurance — English", value: "+18004803287", hours: eddHours, note: "Spanish: 1-866-658-8846. For other languages, press 3 for free interpreter services.", sourceUrl: edd },
    { kind: "phone", label: "Paid Family Leave — English", value: "+18772384373", hours: eddHours, note: "Spanish: 1-877-379-3819. For other languages, press 3 for free interpreter services.", sourceUrl: edd },
    { kind: "online", label: "Contact EDD — myEDD, claim help and program contacts", value: edd, sourceUrl: edd },
  ]),
  "ca-dmv": reviewed([
    { kind: "phone", label: "DMV customer service", value: "+18007770133", hours: "Monday–Friday, 8 a.m.–5 p.m.", sourceUrl: dmv },
    { kind: "online", label: "Contact DMV — live chat and technical support", value: dmv, sourceUrl: dmv },
  ]),
  "sj-transportation": reviewed([
    { kind: "phone", label: "Urgent broken traffic signals / City streets", value: "+14087941900", hours: "24 hours a day, seven days a week (City streets line)", hoursSourceUrl: `${city}/your-government/departments-offices/transportation/streets`, note: "Call for flashing red signals, turned signal heads, lamp outages, all signals out, or no green / walk indication. Do not use a routine online report for these failures. Pavement & Bridges office hours: Monday–Friday, 8 a.m.–5 p.m.", sourceUrl: signals },
    { kind: "phone", label: "Non-emergency traffic-signal timing problems", value: "+14089753700", sourceUrl: signals },
    { kind: "online", label: "San José 311 — potholes", value: `${city}/311`, sourceUrl: `${city}/your-government/departments-offices/transportation/streets` },
    { kind: "online", label: "San José 311 — streetlight outages", value: `${city}/311`, note: "Report exposed wires or damaged poles immediately by dialing 3-1-1.", sourceUrl: `${city}/your-government/departments-offices/transportation/streets/streetlights` },
    { kind: "online", label: "Traffic-signal reporting instructions", value: signals, sourceUrl: signals },
  ]),
};

export const contactIsStale = (contact: AgencyContact, now = Date.now()) => {
  const reviewedAt = Date.parse(contact.lastReviewed);
  return !Number.isFinite(reviewedAt) || reviewedAt > now ||
    contact.reviewAfterDays !== 180 || now - reviewedAt > contact.reviewAfterDays * 86400000;
};

// Monitor both the instructions and independently published hours.
export const contactSourceUrls = (contacts: readonly AgencyContact[]) =>
  [...new Set(contacts.flatMap(contact => [
    contact.sourceUrl, ...(contact.hoursSourceUrl ? [contact.hoursSourceUrl] : []),
  ]))];

export const isOfficialContactUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port && [
      "www.sanjoseca.gov", "311.sanjoseca.gov", "dtac.santaclaracounty.gov",
      "ssa.santaclaracounty.gov", "edd.ca.gov", "www.dmv.ca.gov",
    ].includes(url.hostname);
  } catch {
    return false;
  }
};