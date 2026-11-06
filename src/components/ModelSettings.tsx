import { useEffect, useRef } from 'react';
import { t } from '../i18n/messages';
import { useStore } from '../store/useStore';
import { useProjects } from '../store/useProjects';

const MODEL_CHOICES = ['gemma3:1b', 'qwen2.5-coder:1.5b'];

export function ModelSettings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const activeProject = useProjects(state => state.activeId);
  const { locale, ipiRunning, pickingSource, ipiFixModel, setIpiFixModel, ipiCheckModel, setIpiCheckModel, ollamaStatus, checkOllamaStatus } = useStore();
  const busy = ipiRunning || pickingSource || !activeProject;
  const detectorModel = ipiFixModel || MODEL_CHOICES[0];
  const verifierModel = ipiCheckModel || MODEL_CHOICES[1];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={dialogRef} className="settings-dialog" aria-labelledby="settings-title" onClose={onClose} onClick={event => {
      if (event.target === event.currentTarget) {
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
      }
    }}>
      <div className="settings-dialog-header">
        <h2 id="settings-title">{locale === 'vi' ? 'Cài đặt' : 'Settings'}</h2>
        <button type="button" className="btn-header" onClick={onClose} aria-label={locale === 'vi' ? 'Đóng cài đặt' : 'Close settings'}>×</button>
      </div>
      <section className="settings-dialog-body">
        <h3>{t(locale, 'form.models')}</h3>
        {!activeProject && <p className="field-hint">{locale === 'vi' ? 'Chọn hoặc tạo project để cấu hình model.' : 'Select or create a project to configure models.'}</p>}
        <div className="field">
          <label className="field-label" htmlFor="ipi-detector-model">{t(locale, 'form.detector')}</label>
          <select id="ipi-detector-model" className="input-base" value={detectorModel} disabled={busy} onChange={(event) => setIpiFixModel(event.target.value)}>
            {MODEL_CHOICES.map((model) => <option key={model} value={model}>{model}</option>)}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="ipi-verifier-model">{t(locale, 'form.verifier')}</label>
          <select id="ipi-verifier-model" className="input-base" value={verifierModel} disabled={busy} onChange={(event) => setIpiCheckModel(event.target.value)}>
            {MODEL_CHOICES.map((model) => <option key={model} value={model}>{model}</option>)}
          </select>
        </div>
        <div className="ipi-auto-loop-info" style={{ marginTop: 8 }}>{t(locale, 'form.modelHint')}</div>
        <button type="button" className="btn-header" style={{ marginTop: 8 }} onClick={() => void checkOllamaStatus()} disabled={busy}>{t(locale, 'form.checkOllama')}</button>
        {ollamaStatus.checked && <div className={ollamaStatus.available ? 'success-bar' : 'error-bar'} style={{ marginTop: 8 }}>
          {ollamaStatus.available ? t(locale, 'form.ollamaOk', { models: ollamaStatus.models.join(', ') || t(locale, 'form.noModels') }) : ollamaStatus.error}
        </div>}
      </section>
    </dialog>
  );
}
