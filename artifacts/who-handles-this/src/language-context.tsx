import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslateText } from '@workspace/api-client-react';
import { chunkArray, requireCompleteTranslation } from './translation-utils';
import { DEFAULT_EMAIL_COPY, getEmailSafetyCopy } from './components/departmentEmailCopy';
import bundledTranslations from './ui-translations.json';

export const DEFAULT_UI_STRINGS = {
  ...DEFAULT_EMAIL_COPY,
  forResidents: "For San José residents",
  startOver: "Start over",
  brandName: "Who Handles This?",
  footerTagline: "Local rules. Official sources. Clear next steps.",

  introEyebrow: "A small civic desk",
  introH2_1: "Less guessing.",
  introH2_2: "More direction.",
  introCopy: "Describe what happened in your own words. We compare it with seven verified public-agency records and show you why.",
  step1: "01",
  step1Title: "Describe",
  step1Copy: "Tell us what the notice says or what you saw.",
  step2: "02",
  step2Title: "Match locally",
  step2Copy: "A safeguarded analysis checks your words against seven verified records.",
  step3: "03",
  step3Title: "Take action",
  step3Copy: "Get an official source and a useful next step.",
  privacyNote: "When translation is needed, your text goes only to this project's private translation service and is not saved.",

  heroEyebrow: "Plain-language public service help",
  heroH1_1: "Got a government notice or problem?",
  heroH1_2: "Tell us what’s going on.",
  heroLede: "A notice in the mail. A problem on your block. Start with what you know, and we’ll point you to the right public agency.",

  formKicker: "Start here",
  formH2: "What’s going on?",
  formIntro: "Use everyday words. You don’t need to know the department name.",
  labelIssue: "Describe your issue in your own words",
  placeholderIssue: "For example: there is a pothole outside my building…",
  metaIssue: "Useful facts: topic, agency named on the notice, and whether the place is in San José or Santa Clara County.",
  wordCountLabel: "words",
  labelNotice: "Paste notice text",
  optional: "(optional)",
  placeholderNotice: "A few lines from the letter can help us match it…",
  formPrivacy: "Do not enter your Social Security number, full address, driver's license number, immigration documents, account numbers, or other sensitive personal information. This is a student prototype and not an official City of San José service.",
  privacyAck: "I understand this privacy and prototype notice.",
  submitBtn: "Find the right agency",
  formHint: "Add a description and acknowledge the privacy notice to begin.",
  examplesHeading: "Not sure where to start?",

  example1: "I got a letter about unpaid property tax on my house",
  example2: "My garbage wasn't picked up this week",
  example3: "I got a letter about my unemployment benefits and my trash bill",

  resultTopline: "Your routing result",
  statusRouted: "Ready to use",
  statusReview: "Staff review needed",
  statusClarify: "Clarification needed",
  statusBlocked: "Unable to process",
  youWrote: "You wrote",
  
  headlineStartWith: "Start with",
  headlineNeedMore1: "We need a little",
  headlineNeedMore2: "more direction.",
  headlineGiveMore1: "Give us a little",
  headlineGiveMore2: "more to go on.",
  headlineHuman1: "This one needs",
  headlineHuman2: "a human check.",

  summaryRouted: "Based on the words in your description, this is the best place to begin.",
  summaryMultipleRouted: "Your report describes separate issues. Start with the first agency, and see the other recommendation below.",
  alsoForOtherIssue: "Also for your other issue",
  summaryNoMatch: "We won’t guess when the local list does not have a clear answer.",
  summaryTooShort: "A few more details will help us avoid sending you to the wrong desk.",
  summaryReview: "We can’t safely recommend an agency yet. Any staff review is simulated; no real staff are monitoring this prototype.",

  cardKickerPrimary: "Recommended first step",
  cardKickerFound: "What we found",
  cardH2NoMatch: "No official source directly supports a recommendation",
  cardH2NoAgency: "No confirmed agency yet",
  agencyLevelGov: "government",
  reviewed: "Reviewed",
  jurisdictionBoundary: "Jurisdiction & handoff",
  prototypeBoundaryDisclaimer: "Prototype guidance only. Nothing is submitted to an agency from this page.",
  emptyNoMatch: "Nothing in the local agency list matched strongly enough to recommend an agency. That’s a useful result: it means we need more specific words, not a guess.",
  emptyTooShort1: "One non-sensitive answer can help us identify the right jurisdiction.",
  emptyTooShort2: "After two questions, the case will move to simulated staff review rather than guessing.",
  whyPaused: "Why we paused",
  reviewMessage: "Your report was added to this prototype’s simulated review queue. No real staff are monitoring it or will contact you.",
  compareMatches: "Possible matches to compare",
  matchSingular: "match",
  matchPlural: "matches",
  matchedTermsLabel: "Matched:",
  nextActionLabel: "Next action",
  sj311Action: "Open San José 311",

  whyCardH3: "Transparent by design",
  whyCardP: "The server compares your description with seven curated agency records, then plain rules validate every recommendation.",
  seeWhy: "See why this matched",
  ruleUsed: "Rule used",
  inputLength: "Input length",
  triggerWords: "Trigger words",
  rulesFootnote: "Sources are reviewed on a rolling basis. Always confirm deadlines and instructions on the official source.",
  tryAnother: "Try another issue",
  sourceLabel: "Source",
  thisSeemsWrong: "This seems wrong",
  feedbackSubmitted: "Feedback submitted. Thank you.",
  helpfulFacts: "Helpful facts",

  submitAnswerBtn: "Submit Answer",
  clarifyHeading: "More details needed",
  clarifyPlaceholder: "Type your answer here…",

  translationIndicator: "Translation active",
  translationFailed: "Translation failed. Please try again.",
  retry: "Retry",

  historyNav: "Saved history",
  historyBackHome: "Back to home",
  historyEyebrow: "Your report history",
  historyTitle: "What you asked. What came back.",
  historyIntro: "Review your submitted routing questions, agency guidance, and next steps.",
  historyPrivacy: "This page shows only your reports. Approved reviewers can access reports for review. Please do not include sensitive personal details.",
  historyLoading: "Loading saved routing records",
  historyErrorTitle: "Saved history is unavailable",
  historyErrorCopy: "We could not load your routing records. Try again in a moment.",
  historyEmptyTitle: "No saved routing records yet",
  historyEmptyCopy: "When you use the helper, your submitted issue and returned guidance will appear here.",
  historyTryAgain: "Try again",
  historyRecord: "Routing record",
  historySubmitted: "Submitted",
  historyIssue: "Original issue",
  historyNotice: "Notice text",
  historyLanguage: "Language",
  historyClarifications: "Clarification answers",
  historyResult: "Returned result",
  historyStatus: "Status",
  historyAgency: "Recommended agency",
  historyNoAgency: "No agency selected",
  historyExplanation: "Why this result",
  historyNextStep: "Next step",
  historyNoNextStep: "No next step was returned.",
  historyAllDetails: "All saved result details",
  historyResultFields: "Routing fields",
  historySelectedAgency: "Selected agency details",
  historyFacts: "Key facts",
  historyMissing: "Missing information",
  historyValidation: "Validation checks",
  historyCandidates: "Candidate agencies",
  historyNoneRecorded: "None recorded",
  historyYes: "Yes",
  historyNo: "No",
  historyOfficialSource: "Official source",
  historyScope: "Scope",
  historyBoundary: "Resident boundary",
  historyReviewed: "Last reviewed",
  historyReviewAfter: "Review interval",
  historyDays: "days",
  historyIncludedExamples: "Included examples",
  historyExclusions: "Exclusions",
  historyJurisdictionFacts: "Jurisdiction facts",
  historySafeNextStep: "Safe next-step template",
  historyClarifyingQuestions: "Clarifying questions",
  historyManualChecks: "Manual verification notes",
  historyPassed: "Passed",
  historyFailed: "Needs attention",
  contactHeading: "Official phone and online options",
  contactTranslating: "Translating official contact guidance…",
  contactTranslationFailed: "Contact guidance could not be translated. Retry or check the official agency source.",
  contactEnglishEvidence: "Original English contact guidance",
  contactHours: "Published phone hours",
  contactHoursUnpublished: "Phone hours are not published on the linked source. Check with the agency.",
  contactNotSaved: "This saved result has no verified contact details. Run a new routing search or check the official agency website.",
  contactNeedsReview: "These contact details need a fresh source review. Check the official agency website for current options.",
  contactHandoffDisclaimer: "This prototype does not call, submit reports, or create official cases. These links open the agency’s own services; review their instructions before submitting."
};

type UIStrings = typeof DEFAULT_UI_STRINGS;

interface LanguageContextType {
  language: string;
  selectedLanguage: string;
  setLanguage: (lang: string) => void;
  t: UIStrings;
  isTranslatingUI: boolean;
  uiTranslationError: boolean;
  retryUITranslation: () => void;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const UI_KEYS = Object.keys(DEFAULT_UI_STRINGS) as (keyof typeof DEFAULT_UI_STRINGS)[];
const UI_VALUES = UI_KEYS.map(k => DEFAULT_UI_STRINGS[k as keyof typeof DEFAULT_UI_STRINGS]);
const INITIAL_TRANSLATIONS: Record<string, UIStrings> = {
  en: DEFAULT_UI_STRINGS,
  auto: DEFAULT_UI_STRINGS,
  ...Object.fromEntries(Object.entries(bundledTranslations).filter(([, copy]) =>
    UI_KEYS.every(key => typeof (copy as Record<string, unknown>)[key] === 'string' &&
      Boolean((copy as Record<string, string>)[key].trim())),
  ).map(([lang, copy]) => [lang, { ...copy, ...getEmailSafetyCopy(lang) }])),
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const translationRequest = useRef(0);
  const [language, setLanguage] = useState(() => {
    try {
      const saved = localStorage.getItem('resident-language');
      return saved && INITIAL_TRANSLATIONS[saved] ? saved : 'auto';
    } catch { return 'auto'; }
  });
  const [pendingLanguage, setPendingLanguage] = useState<string | null>(null);
  const [cache, setCache] = useState<Record<string, UIStrings>>(INITIAL_TRANSLATIONS);
  const [uiTranslationError, setUiTranslationError] = useState(false);
  const { mutateAsync: translateTextMutation } = useTranslateText();
  useEffect(() => {
    document.documentElement.lang = language === 'auto' ? 'en' : language === 'zh' ? 'zh-CN' : language;
    try { localStorage.setItem('resident-language', language); } catch { /* Storage may be disabled. */ }
  }, [language]);

  const loadTranslation = async (lang: string) => {
    const request = ++translationRequest.current;
    if (cache[lang]) {
      setLanguage(lang);
      setPendingLanguage(null);
      setUiTranslationError(false);
      return;
    }
    
    if (lang === 'auto' || lang === 'en') {
      setLanguage(lang);
      setPendingLanguage(null);
      setUiTranslationError(false);
      return;
    }
    
    setPendingLanguage(lang);
    setUiTranslationError(false);
    
    try {
      const chunks = chunkArray(UI_VALUES, 20);
      const responses = await Promise.all(
        chunks.map(chunk => translateTextMutation({
          data: {
            text: chunk,
            targetLanguage: lang,
            sourceLanguage: 'en',
          },
        }))
      );
      
      const translatedArray = responses.flatMap((r, index) =>
        requireCompleteTranslation(r.translatedText, chunks[index].length));
      if (request !== translationRequest.current) return;
      const translatedObj = {} as UIStrings;
      
      UI_KEYS.forEach((key, idx) => {
        translatedObj[key] = translatedArray[idx];
      });
      
      setCache(prev => ({ ...prev, [lang]: { ...translatedObj, ...getEmailSafetyCopy(lang) } }));
      setLanguage(lang);
      setPendingLanguage(null);
    } catch (err) {
      if (request !== translationRequest.current) return;
      console.error('Failed to translate UI:', err);
      setUiTranslationError(true);
    }
  };

  const handleSetLanguage = (lang: string) => {
    if (lang === language && !pendingLanguage) return;
    loadTranslation(lang);
  };

  const retryUITranslation = () => {
    if (pendingLanguage) {
      loadTranslation(pendingLanguage);
    }
  };

  const t = cache[language] || DEFAULT_UI_STRINGS;

  return (
    <LanguageContext.Provider value={{
      language,
      selectedLanguage: pendingLanguage ?? language,
      setLanguage: handleSetLanguage,
      t,
      isTranslatingUI: pendingLanguage !== null && !uiTranslationError,
      uiTranslationError,
      retryUITranslation
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
