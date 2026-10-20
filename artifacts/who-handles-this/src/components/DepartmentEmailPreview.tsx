import { useEffect, useId, useState } from 'react';
import { translateText, type DepartmentCommunication } from '@workspace/api-client-react';
import { useQuery } from '@tanstack/react-query';
import { Copy, ExternalLink, Mail, ShieldAlert } from 'lucide-react';
import { useLanguage } from '@/language-context';
import { formatDate } from './ResidentUI';
import { translateDepartmentCommunication } from '@/lib/translate-department-communication';
import { useNearViewport } from '@/lib/use-near-viewport';

const RECIPIENT_RE = /^[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
const MAX_SUBJECT = 150;
const MAX_BODY = 4000;

const safeHttp = (u?: string) => {
  if (!u) return null;
  try {
    const p = new URL(u);
    return p.protocol === 'https:' || p.protocol === 'http:' ? p.href : null;
  } catch {
    return null;
  }
};

const safeDate = (v: string | undefined, lang: string) => {
  try {
    return v ? formatDate(v, lang) : '';
  } catch {
    return v ?? '';
  }
};

type PreviewProps = {
  communication?: DepartmentCommunication;
  agencyId: string;
  agencyName: string;
  officialUrl: string;
  officialTitle: string;
};

export function DepartmentEmailPreview(props: PreviewProps) {
  const { language, t } = useLanguage();
  const { ref, visible } = useNearViewport();
  const { communication } = props;
  const needsTranslation = Boolean(communication) && language !== 'en' && language !== 'auto';
  const translated = useQuery({
    queryKey: ['email-instructions', language, props.agencyId, communication],
    queryFn: () => translateDepartmentCommunication(communication!, language, translateText),
    enabled: needsTranslation && visible,
    retry: false,
    staleTime: Infinity,
  });
  if (needsTranslation && !translated.data) {
    const official = safeHttp(communication?.fallbackUrl) ||
      safeHttp(communication?.sourceUrl) || safeHttp(props.officialUrl);
    return (
      <section ref={ref} className="source-boundary mt-6" aria-label={t.heading} data-testid={`email-preview-${props.agencyId}`}>
        <div>
          <div className="card-kicker"><Mail size={15} aria-hidden="true" /> {t.heading}</div>
          <p className="text-sm font-semibold mb-1">{props.agencyName}</p>
          <p className="text-sm mb-3">{t.sendsNothing}</p>
          <p role={translated.isError ? 'alert' : 'status'}>
            {translated.isError ? t.emailTranslationFailed : t.emailTranslating}
          </p>
          {translated.isError && <button type="button" className="secondary-start-button mt-3" onClick={() => void translated.refetch()} disabled={translated.isFetching}>{t.retry}</button>}
          {official && <p className="mt-3"><a href={official} className="underline" target="_blank" rel="noopener noreferrer">{t.officialSource}</a></p>}
        </div>
      </section>
    );
  }
  const localized = needsTranslation ? translated.data : communication;
  // Language changes restore curated text and require fresh review; never send
  // resident edits for translation or retain approval from another language.
  return <EmailPreviewFields key={`${language}-${JSON.stringify(localized)}`} {...props} communication={localized} />;
}

function EmailPreviewFields({
  communication, agencyId, agencyName, officialUrl, officialTitle,
}: PreviewProps) {
  const { language, t: c } = useLanguage();
  const instanceId = useId();
  const draft = communication?.emailDraft;
  const draftRecipient = draft?.recipient ?? '';
  const draftSubject = draft?.subject ?? '';
  const draftBody = draft?.body ?? '';

  const [subject, setSubject] = useState(draftSubject);
  const [body, setBody] = useState(draftBody);
  const [okContent, setOkContent] = useState(false);
  const [okSender, setOkSender] = useState(false);
  const [opened, setOpened] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'fail'>('idle');

  useEffect(() => {
    setSubject(draftSubject);
    setBody(draftBody);
    setOkContent(false);
    setOkSender(false);
    setOpened(false);
    setCopyState('idle');
  }, [draftRecipient, draftSubject, draftBody]);

  const resetApproval = () => {
    setOkContent(false);
    setOkSender(false);
    setOpened(false);
    setCopyState('idle');
  };

  const recipientValid = RECIPIENT_RE.test(draftRecipient);
  const subjectValid = subject.trim().length > 0 && subject.length <= MAX_SUBJECT && !/[\r\n]/.test(subject);
  const bodyValid = body.trim().length > 0 && body.length <= MAX_BODY;
  const reviewedAt = Date.parse(communication?.lastReviewed ?? '');
  const evidenceFresh = Number.isFinite(reviewedAt) && reviewedAt <= Date.now() && Date.now() - reviewedAt <= 180 * 86400000;
  const evidenceValid = Boolean(safeHttp(communication?.sourceUrl)) && evidenceFresh;
  const canOpen = Boolean(draft) && evidenceValid && recipientValid && subjectValid && bodyValid && okContent && okSender;

  const openDraft = () => {
    if (!canOpen) return;
    const crlfBody = body.replace(/\r\n|\r|\n/g, '\r\n');
    const url = `mailto:${draftRecipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(crlfBody)}`;
    setOpened(true);
    window.location.href = url;
  };

  const copyMessage = async () => {
    const text = `${c.copyAll}: ${draftRecipient}\n${c.subject}: ${subject}\n\n${body}`;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        setCopyState('ok');
        return;
      }
      throw new Error('no clipboard');
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        setCopyState(ok ? 'ok' : 'fail');
      } catch {
        setCopyState('fail');
      }
    }
  };

  const evidenceUrl = safeHttp(communication?.sourceUrl);
  const fallbackUrl = safeHttp(communication?.fallbackUrl);
  const officialSafe = safeHttp(officialUrl);
  const reviewed = safeDate(communication?.lastReviewed, language);
  const tid = `email-preview-${agencyId}-${instanceId}`;

  const linkClass = 'inline-flex items-center gap-2 text-sm font-semibold text-primary underline underline-offset-4 break-words';
  const inputClass = 'civic-textarea';

  const altAction = fallbackUrl ? (
    <div className="mt-4 pt-4 border-t border-border">
      <span className="next-action-label">{c.altChannel}</span>
      <p className="mt-1">
        <a className={linkClass} href={fallbackUrl} target="_blank" rel="noopener noreferrer" data-testid={`link-fallback-${agencyId}`}>
          <ExternalLink size={14} aria-hidden="true" /> {communication?.fallbackLabel || c.openLink}
        </a>
      </p>
    </div>
  ) : null;

  const header = (
    <>
      <div className="card-kicker"><Mail size={15} aria-hidden="true" /> {c.heading}</div>
      <p className="text-sm font-semibold mb-1">{agencyName}</p>
    </>
  );

  if (!draft) {
    const sourceUrl = fallbackUrl || evidenceUrl || officialSafe;
    return (
      <section className="source-boundary mt-6 flex-col" aria-label={c.heading} data-testid={`email-preview-${agencyId}`}>
        <div>
          {header}
          <span className="source-boundary-label">{c.noEmail}</span>
          <p>{communication?.channelNote || c.noEmailFallback}</p>
          <small>{c.sendsNothing}</small>
          {sourceUrl && (
            <p className="mt-3">
              <a className={linkClass} href={sourceUrl} target="_blank" rel="noopener noreferrer" data-testid={`link-official-fallback-${agencyId}`}>
                <ExternalLink size={14} aria-hidden="true" />
                {communication?.fallbackLabel || `${c.officialSource}: ${officialTitle}`}
              </a>
            </p>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="source-boundary mt-6" aria-label={c.heading} data-testid={`email-preview-${agencyId}`}>
      <div className="min-w-0 w-full">
        {header}
        <p className="text-xs text-muted-foreground mb-3">{c.sendsNothing}</p>
        {communication?.channelNote && <p className="text-sm mb-4">{communication.channelNote}</p>}
        <p className="flex items-start gap-2 text-xs mb-4"><ShieldAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />{c.sensitive}</p>

        <dl className="text-sm grid gap-2 mb-4">
          <div>
            <dt className="source-boundary-label">{c.to}</dt>
            <dd className="font-mono-ui break-all" data-testid={`text-recipient-${agencyId}`}>{draftRecipient}</dd>
          </div>
          <div>
            <dt className="source-boundary-label">{c.evidence}</dt>
            <dd className="break-words">
              {evidenceUrl ? (
                <a className={linkClass} href={evidenceUrl} target="_blank" rel="noopener noreferrer">{evidenceUrl}</a>
              ) : '—'}
              {reviewed && <span className="block text-xs text-muted-foreground">{c.reviewedOn} {reviewed}</span>}
            </dd>
          </div>
        </dl>

        {!recipientValid && <p role="alert" className="text-sm text-destructive mb-3">{c.invalidRecipient}</p>}
        {!evidenceValid && <p role="alert" className="text-sm text-destructive mb-3">{c.staleEvidence}</p>}

        <label className="field-label" htmlFor={`${tid}-subject`}>{c.subject}</label>
        <input
          id={`${tid}-subject`}
          type="text"
          className={inputClass}
          style={{ minHeight: 0 }}
          value={subject}
          maxLength={MAX_SUBJECT}
          onChange={(e) => { setSubject(e.target.value.replace(/[\r\n]+/g, ' ')); resetApproval(); }}
          aria-invalid={!subjectValid}
          aria-describedby={`${tid}-subject-help`}
          data-testid={`input-subject-${agencyId}`}
        />
        <p id={`${tid}-subject-help`} className={`text-xs mt-1 mb-3 ${subjectValid ? 'text-muted-foreground' : 'text-destructive'}`}>
          {subjectValid ? c.subjectHelp : c.invalidSubject}
        </p>

        <label className="field-label" htmlFor={`${tid}-body`}>{c.body}</label>
        <textarea
          id={`${tid}-body`}
          className={inputClass}
          rows={8}
          value={body}
          maxLength={MAX_BODY}
          onChange={(e) => { setBody(e.target.value); resetApproval(); }}
          aria-invalid={!bodyValid}
          aria-describedby={`${tid}-body-help`}
          data-testid={`input-body-${agencyId}`}
        />
        <p id={`${tid}-body-help`} className={`text-xs mt-1 mb-4 ${bodyValid ? 'text-muted-foreground' : 'text-destructive'}`}>
          {bodyValid ? c.bodyHelp : c.invalidBody} <span className="font-mono-ui">{body.length} / {MAX_BODY}</span>
        </p>

        <label className="flex items-start gap-3 mb-2 cursor-pointer text-sm">
          <input type="checkbox" className="mt-1 w-4 h-4" checked={okContent} onChange={(e) => setOkContent(e.target.checked)} data-testid={`check-content-${agencyId}`} />
          <span>{c.confirmContent}</span>
        </label>
        <label className="flex items-start gap-3 mb-4 cursor-pointer text-sm">
          <input type="checkbox" className="mt-1 w-4 h-4" checked={okSender} onChange={(e) => setOkSender(e.target.checked)} data-testid={`check-sender-${agencyId}`} />
          <span>{c.confirmSender}</span>
        </label>

        <div className="flex flex-col sm:flex-row gap-3">
          <button type="button" className="submit-button !mt-0 sm:!w-auto gap-3" onClick={openDraft} disabled={!canOpen} data-testid={`button-open-draft-${agencyId}`}>
            <span>{c.open}</span><Mail size={17} aria-hidden="true" />
          </button>
          <button type="button" className="secondary-start-button !w-auto gap-2" onClick={copyMessage} disabled={!evidenceValid || !recipientValid || !subjectValid || !bodyValid} data-testid={`button-copy-message-${agencyId}`}>
            <Copy size={15} aria-hidden="true" /> {c.copy}
          </button>
        </div>

        <div role="status" aria-live="polite" className="mt-3 text-sm">
          {opened && <p>{c.openedNote}</p>}
          {copyState === 'ok' && <p className="text-emerald-700">{c.copied}</p>}
          {copyState === 'fail' && <p className="text-destructive">{c.copyFailed}</p>}
        </div>

        {altAction}
        {!fallbackUrl && officialSafe && (
          <div className="mt-4 pt-4 border-t border-border">
            <span className="next-action-label">{c.altChannel}</span>
            <p className="mt-1"><a className={linkClass} href={officialSafe} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} aria-hidden="true" /> {c.officialSource}: {officialTitle}</a></p>
          </div>
        )}
      </div>
    </section>
  );
}
