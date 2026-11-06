import { AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';
import { IpiAgentForm } from './components/IpiAgentForm';
import { IpiAgentPanel } from './components/IpiAgentPanel';
import { ModelSettings } from './components/ModelSettings';
import { ThemeReveal } from './components/ThemeReveal';
import { AppLocale } from './i18n/locale';
import { t } from './i18n/messages';
import { ThemeMode, useStore } from './store/useStore';
import { useProjects } from './store/useProjects';
import { ProjectPicker } from './components/ProjectPicker';

function App() {
  const activeProject = useProjects(state => state.activeId);
  const { themeMode, setThemeMode, ipiRunning, locale, setLocale, ollamaStatus } = useStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [pendingTheme, setPendingTheme] = useState<ThemeMode | null>(null);
  const connectionLabel = !ollamaStatus.checked
    ? (locale === 'vi' ? 'Ollama chưa kiểm tra' : 'Ollama not checked')
    : ollamaStatus.available
      ? (locale === 'vi' ? 'Ollama đã kết nối' : 'Ollama connected')
      : (locale === 'vi' ? 'Ollama không khả dụng' : 'Ollama unavailable');

  useEffect(() => {
    document.body.classList.remove('theme-dark', 'theme-light');
    document.body.classList.add(`theme-${themeMode}`);
    document.body.classList.toggle('desktop-window', Boolean(window.owaspWorkbench?.setWindowTheme));
    void window.owaspWorkbench?.setWindowTheme?.(themeMode);
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
    <div
      className="app-shell"
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes('Files')) event.preventDefault();
      }}
      onDrop={(event) => {
        if (event.dataTransfer.types.includes('Files')) event.preventDefault();
      }}
    >
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
          <div className="status-indicator" title={connectionLabel}>
            <div className={`status-dot ${ipiRunning ? 'active' : !ollamaStatus.checked ? 'unchecked' : ollamaStatus.available ? 'connected' : 'unavailable'}`} />
            <span>{ipiRunning ? t(locale, 'header.scanRunning') : connectionLabel}</span>
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
          <button type="button" className="btn-header settings-trigger" onClick={() => setSettingsOpen(true)} aria-label={locale === 'vi' ? 'Cài đặt' : 'Settings'} title={locale === 'vi' ? 'Cài đặt' : 'Settings'} aria-haspopup="dialog" aria-expanded={settingsOpen}>
            <span aria-hidden="true">⚙</span>
          </button>
        </div>
      </header>

      <ModelSettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <div className="project-layout">
        <aside className="workspace-sidebar" aria-label={locale === 'vi' ? 'Project và tài liệu đầu vào' : 'Projects and input documents'}>
          <ProjectPicker />
          {activeProject && (
            <section key={activeProject} className="sidebar-input" aria-label={t(locale, 'app.inputTitle')}>
              <IpiAgentForm />
            </section>
          )}
        </aside>
        <main className="project-content">
          {activeProject ? (
            <div key={activeProject} className="workspace workspace-scan-v2">
              <div className="right-panel scan-results-panel">
                <IpiAgentPanel />
              </div>
            </div>
          ) : (
            <div className="project-welcome">
              <h1>{locale === 'vi' ? 'Không gian kiểm thử của bạn' : 'Your testing workspace'}</h1>
              <p>{locale === 'vi' ? 'Tạo project mới ở thanh bên để bắt đầu.' : 'Create a new project in the sidebar to begin.'}</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
