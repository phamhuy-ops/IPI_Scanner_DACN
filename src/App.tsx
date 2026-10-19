import { AnimatePresence } from 'motion/react';
import { useEffect, useState } from 'react';
import { IpiAgentForm } from './components/IpiAgentForm';
import { IpiAgentPanel } from './components/IpiAgentPanel';
import { ThemeReveal } from './components/ThemeReveal';
import { ThemeMode, useStore } from './store/useStore';

function App() {
  const { themeMode, setThemeMode, ipiRunning } = useStore();
  const [pendingTheme, setPendingTheme] = useState<ThemeMode | null>(null);

  useEffect(() => {
    document.body.classList.remove('theme-dark', 'theme-light');
    document.body.classList.add(`theme-${themeMode}`);
  }, [themeMode]);

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
            <div className="logo-sub">LOCAL TINYLLM IPI DEFENSE</div>
          </div>
        </div>
        <div className="header-divider" />
        <div className="header-gap" />
        <div className="header-actions">
          <div className="status-indicator" title={ipiRunning ? 'Đang phân tích tài liệu' : 'Sẵn sàng'}>
            <div className={`status-dot ${ipiRunning ? 'active' : ''}`} />
            <span>{ipiRunning ? 'Đang quét IPI' : 'Ollama local'}</span>
          </div>
          <div className="header-actions-divider" />
          <button className="btn-header" onClick={requestThemeChange} disabled={Boolean(pendingTheme)} title="Đổi giao diện">
            {themeMode === 'dark' ? 'Sáng' : 'Tối'}
          </button>
        </div>
      </header>

      <div className="workspace workspace-scan-v2">
        <aside className="left-panel scan-config-panel">
          <div className="layout-panel-head">
            <div className="layout-panel-title">Tài liệu đầu vào</div>
            <div className="layout-panel-sub">Chọn tài liệu hoặc thư mục để kiểm tra Indirect Prompt Injection.</div>
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
