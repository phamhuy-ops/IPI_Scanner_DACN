import { useState } from 'react';
import { useProjects } from '../store/useProjects';
import { useStore } from '../store/useStore';

export function ProjectPicker() {
  const { projects, activeId, createProject, selectProject, deleteProject, storageError } = useProjects();
  const { locale, ipiRunning, pickingSource } = useStore();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const vi = locale === 'vi';
  const busy = ipiRunning || pickingSource;
  return <aside className="project-sidebar" aria-label={vi ? 'Dự án kiểm thử' : 'Test projects'}>
    <div className="project-sidebar-brand">SENTINEL <span>Workspace</span></div>
    {creating ? <form className="project-create" onSubmit={event => {
      event.preventDefault();
      if (!name.trim() || busy) return;
      createProject(name);
      setName('');
      setCreating(false);
    }}>
      <label htmlFor="project-name">{vi ? 'Tên project' : 'Project name'}</label>
      <input id="project-name" autoFocus maxLength={80} value={name} disabled={busy} onChange={event => setName(event.target.value)} placeholder={vi ? 'Ví dụ: Kiểm thử tài liệu tháng 11' : 'e.g. November documents'} />
      <button className="btn-primary" type="submit" disabled={busy || !name.trim()}>{vi ? 'Tạo project' : 'Create project'}</button>
      <button className="btn-header" type="button" onClick={() => setCreating(false)}>{vi ? 'Hủy' : 'Cancel'}</button>
    </form> : <button className="btn-primary" disabled={busy} onClick={() => setCreating(true)}>＋ {vi ? 'Project mới' : 'New project'}</button>}
    <h2 className="project-list-heading">Projects <span>{projects.length}</span></h2>
    <nav aria-label={vi ? 'Danh sách project' : 'Project list'}>
      <ul className="project-list">{projects.map(project => <li key={project.id}>
        <div className={`project-row ${activeId === project.id ? 'is-active' : ''}`}>
          <button className="project-open" disabled={busy} aria-current={activeId === project.id ? 'page' : undefined} onClick={() => { selectProject(project.id); setDeleting(null); }} title={project.name}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 7V5a1 1 0 0 1 1-1h5l2 3h9a1 1 0 0 1 1 1v11H3V7Z"/></svg>
            <span>{project.name}</span>
          </button>
          <button className="project-delete" disabled={busy} aria-label={`${vi ? 'Xóa project' : 'Delete project'} ${project.name}`} title={vi ? 'Xóa project' : 'Delete project'} onClick={() => setDeleting(project.id)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/></svg>
          </button>
        </div>
        {deleting === project.id && <div className="project-delete-confirm">
          <p>{vi ? 'Xóa project và kết quả đã lưu? Tệp gốc vẫn được giữ trên máy.' : 'Delete this project and saved results? Original files stay on your device.'}</p>
          <button className="btn-header" disabled={busy} onClick={() => { deleteProject(project.id); setDeleting(null); }}>{vi ? 'Xóa project' : 'Delete project'}</button>
          <button className="btn-header" onClick={() => setDeleting(null)}>{vi ? 'Hủy' : 'Cancel'}</button>
        </div>}
      </li>)}</ul>
    </nav>
    {!projects.length && <p className="project-sidebar-note">{vi ? 'Chưa có project. Tạo project đầu tiên để bắt đầu.' : 'No projects yet. Create your first project to begin.'}</p>}
    {busy && <small>{vi ? 'Hoàn tất lượt quét hoặc đóng hộp thoại chọn tệp để chuyển project.' : 'Finish the scan or close the file picker to switch projects.'}</small>}
    {storageError && <p role="alert" className="error-bar">{vi ? 'Không thể đọc hoặc lưu project trên máy. Dữ liệu hiện tại chỉ được giữ trong phiên này.' : 'Projects could not be read or saved locally. Current data is available in this session only.'}</p>}
  </aside>;
}
