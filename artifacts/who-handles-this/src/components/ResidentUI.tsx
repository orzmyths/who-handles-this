import { ArrowUpRight, ChevronDown, ExternalLink, Globe, Landmark, RotateCcw, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '@/language-context';
import { Link, useLocation } from 'wouter';
import { AccountControls } from './AccountControls';

export function Header({ onStartOver, hasResult }: { onStartOver: () => void; hasResult: boolean }) {
  const { t, selectedLanguage, setLanguage, isTranslatingUI, uiTranslationError, retryUITranslation } = useLanguage();
  const [location] = useLocation();
  return (
    <header className="site-header">
      <div className="header-inner">
        <button className="brand" onClick={onStartOver} data-testid="button-brand-start-over" aria-label={t.startOver}>
          <span className="brand-mark" aria-hidden="true"><Landmark size={19} strokeWidth={1.7} /></span>
          <span className="brand-name">
            {t.brandName.endsWith('?') ? (
              <>{t.brandName.slice(0, -1)}<span className="brand-period">?</span></>
            ) : t.brandName}
          </span>
        </button>
        <div className="header-context">
          <AccountControls />
          <span className="context-rule hidden md:block" aria-hidden="true" />
          <span className="hidden md:inline">{t.forResidents}</span>
          
          <div className="lang-selector-wrapper md:ml-2">
            <Globe size={13} className="lang-icon-left" />
            <select 
              className="lang-selector" 
              value={selectedLanguage}
              onChange={e => setLanguage(e.target.value)}
              aria-label={t.historyLanguage}
              aria-busy={isTranslatingUI}
              data-testid="select-language"
            >
              <option value="auto">Auto detect</option>
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="de">Deutsch</option>
              <option value="vi">Tiếng Việt</option>
              <option value="zh">中文（简体）</option>
              <option value="zh-TW">繁體中文</option>
              <option value="tl">Tagalog</option>
            </select>
            <ChevronDown size={13} className="lang-icon-right" />
          </div>
          {isTranslatingUI && <Loader2 size={14} className="animate-spin text-muted-foreground ml-2" />}
          {uiTranslationError && (
             <button onClick={retryUITranslation} className="text-destructive ml-2 flex items-center gap-1 text-[10px]" title={t.retry} aria-label={t.retry}>
               <AlertCircle size={13} />
             </button>
          )}

          {hasResult && (
            <button className="header-reset" onClick={onStartOver} data-testid="button-header-start-over">
              <RotateCcw size={14} /> <span className="hidden md:inline">{t.startOver}</span>
            </button>
          )}
          <Link href={location === '/history' ? '/' : '/history'} className="header-history-link" data-testid="link-history">
            <span>{location === '/history' ? t.historyBackHome : t.historyNav}</span>
            <ArrowUpRight size={13} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="site-footer">
      <span>{t.brandName}</span>
      <span className="footer-dot" aria-hidden="true">•</span>
      <span>{t.footerTagline}</span>
    </footer>
  );
}

export function Step({ number, title, copy, active = false }: { number: string; title: string; copy: string; active?: boolean }) {
  return (
    <div className={`step-row ${active ? 'step-active' : ''}`}>
      <span className="step-number">{number}</span>
      <div>
        <p className="step-title">{title}</p>
        <p className="step-copy">{copy}</p>
      </div>
    </div>
  );
}

export function IntroPanel() {
  const { t } = useLanguage();
  return (
    <aside className="intro-panel" aria-label="How this helper works">
      <div className="intro-ornament" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="eyebrow">{t.introEyebrow}</p>
      <h2>{t.introH2_1}<br /><em>{t.introH2_2}</em></h2>
      <p className="intro-copy">{t.introCopy}</p>
      <div className="steps">
        <Step number={t.step1} title={t.step1Title} copy={t.step1Copy} active />
        <Step number={t.step2} title={t.step2Title} copy={t.step2Copy} />
        <Step number={t.step3} title={t.step3Title} copy={t.step3Copy} />
      </div>
      <div className="privacy-note">
        <ShieldCheck size={17} strokeWidth={1.7} aria-hidden="true" />
        <span>{t.privacyNote}</span>
      </div>
    </aside>
  );
}

export function SourceLine({ name, url, sourceLabel }: { name: string; url: string; sourceLabel: string }) {
  return (
    <a className="source-line" href={url} target="_blank" rel="noopener noreferrer" data-testid="link-source">
      <span className="source-icon" aria-hidden="true"><ExternalLink size={14} strokeWidth={1.8} /></span>
      <span><strong>{sourceLabel}</strong> {name}</span>
      <ArrowUpRight size={15} aria-hidden="true" />
    </a>
  );
}

export const formatDate = (value: string, language: string) =>
  new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : language === 'zh-TW' ? 'zh-TW' : language === 'auto' ? 'en-US' : language, { month: 'long', day: 'numeric', year: 'numeric' }).format(
    new Date(`${value.slice(0, 10)}T00:00:00`),
  );
