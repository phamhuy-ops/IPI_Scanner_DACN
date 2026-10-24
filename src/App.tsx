import { AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';
import { IpiAgentForm } from './components/IpiAgentForm';
import { IpiAgentPanel } from './components/IpiAgentPanel';
import { ThemeReveal } from './components/ThemeReveal';
import { AppLocale } from './i18n/locale';
import { t } from './i18n/messages';
import { ThemeMode, useStore } from './store/useStore';

function App() {
  const { themeMode, setThemeMode, ipiRunning, locale, setLocale } = useStore();
  const [pendingTheme, setPendingTheme] = useState<ThemeMode | null>(null);

  useEffect(() => {
    document.body.classList.remove('theme-dark', 'theme-light');
    document.body.classList.add(`theme-${themeMode}`);
  }, [themeMode]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const requestThemeChange = () => {
    if (pendingTheme) return;
    setPendingTheme(themeMode === 'dark' ? 'light' : 'dark');
  };

  const applyPendingTheme = () => {
    if (pendingTheme) setThemeMode(pendingTheme);
  };

  return (
    <div className="app-shell">
      <AnimatePresence>
        {pendingTheme && (
          <ThemeReveal
            key={pendingTheme}
            theme={pendingTheme}
            onCovered={applyPendingTheme}
            onComplete={() => setPendingTheme(null)}
          />
        )}
      </AnimatePresence>
      <div className="liquid-grid-overlay" aria-hidden="true" />
      <header className="app-header">
        <div className="app-logo">
          <img className="logo-icon" src="./app-icon.png" alt="" aria-hidden="true" />
          <div>
            <div className="logo-text">SENTINEL</div>
            <div className="logo-sub">{t(locale, 'header.tagline')}</div>
          </div>
        </div>
        <div className="header-divider" />
        <div className="header-gap" />
        <div className="header-actions">
          <div className="status-indicator" title={ipiRunning ? t(locale, 'header.analyzing') : t(locale, 'header.ready')}>
            <div className={`status-dot ${ipiRunning ? 'active' : ''}`} />
            <span>{ipiRunning ? t(locale, 'header.scanRunning') : t(locale, 'header.ollamaLocal')}</span>
          </div>
          <div className="header-actions-divider" />
          <div className="locale-toggle" role="group" aria-label={t(locale, 'header.language')}>
            {(['en', 'vi'] as AppLocale[]).map((option) => (
              <button
                key={option}
                type="button"
                className={`locale-toggle-btn ${locale === option ? 'active' : ''}`}
                onClick={() => setLocale(option)}
                aria-pressed={locale === option}
              >
                {t(locale, option === 'en' ? 'header.localeEn' : 'header.localeVi')}
              </button>
            ))}
          </div>
          <button className="btn-header" onClick={requestThemeChange} disabled={Boolean(pendingTheme)} title={t(locale, 'header.theme')}>
            {themeMode === 'dark' ? t(locale, 'header.themeLight') : t(locale, 'header.themeDark')}
          </button>
        </div>
      </header>

      <div className="workspace workspace-scan-v2">
        <aside className="left-panel scan-config-panel">
          <div className="layout-panel-head">
            <div className="layout-panel-title">{t(locale, 'app.inputTitle')}</div>
            <div className="layout-panel-sub">{t(locale, 'app.inputSub')}</div>
          </div>
          <IpiAgentForm />
        </aside>
        <main className="right-panel scan-results-panel">
          <IpiAgentPanel />
        </main>
      </div>
    </div>
  );
}

export default App;
