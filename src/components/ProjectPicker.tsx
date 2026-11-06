import { useState } from 'react';
import { useProjects } from '../store/useProjects';
import { useStore } from '../store/useStore';

export function ProjectPicker() {
  const { projects, activeId, createProject, renameProject, selectProject, deleteProject, storageError } = useProjects();
  const { locale, ipiRunning, pickingSource } = useStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [page, setPage] = useState(() => Math.floor(Math.max(0, projects.findIndex(project => project.id === activeId)) / 4));
  const pageCount = Math.max(1, Math.ceil(projects.length / 4));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleProjects = projects.slice(currentPage * 4, currentPage * 4 + 4);
  const vi = locale === 'vi';
  const busy = ipiRunning || pickingSource;
  return <aside className="project-sidebar" aria-label={vi ? 'Dự án kiểm thử' : 'Test projects'}>
    <div className="project-sidebar-brand">SENTINEL <span>Workspace</span></div>
    <div className="project-heading-row">
      <h2 className="project-list-heading">Projects <span className="project-count">{projects.length}</span></h2>
      <button className="project-add" type="button" disabled={busy || editingId !== null} onClick={() => {
        if (busy) return;
        const defaultName = `Project ${projects.length + 1}`;
        createProject(defaultName);
        const nextId = useProjects.getState().activeId;
        if (!nextId || nextId === activeId) return;
        setPage(Math.floor(projects.length / 4));
        setName(defaultName);
        setEditingId(nextId);
        setDeleting(null);
      }} aria-label={vi ? 'Tạo project mới' : 'Create new project'} title={vi ? 'Tạo project mới' : 'Create new project'}>+</button>
    <nav className="project-pagination" aria-label={vi ? 'Phân trang project' : 'Project pagination'}>
      <button className="btn-header" type="button" disabled={currentPage === 0} onClick={() => { setPage(currentPage - 1); setDeleting(null); setEditingId(null); }} aria-label={vi ? 'Trang project trước' : 'Previous project page'}>‹</button>
      <span role="status">{vi ? 'Trang' : 'Page'} {currentPage + 1} / {pageCount}</span>
      <button className="btn-header" type="button" disabled={currentPage === pageCount - 1} onClick={() => { setPage(currentPage + 1); setDeleting(null); setEditingId(null); }} aria-label={vi ? 'Trang project tiếp theo' : 'Next project page'}>›</button>
    </nav>
    </div>
    <nav aria-label={vi ? 'Danh sách project' : 'Project list'}>
      <ul className="project-list">{visibleProjects.map(project => <li key={project.id}>
        {editingId === project.id ? <form className="project-inline-name" onSubmit={event => {
          event.preventDefault();
          if (busy || !name.trim()) return;
          renameProject(project.id, name);
          setEditingId(null);
        }}>
          <input autoFocus maxLength={80} aria-label={vi ? 'Tên project' : 'Project name'} value={name} disabled={busy} onFocus={event => event.currentTarget.select()} onChange={event => setName(event.target.value)} onKeyDown={event => {
            if (event.key === 'Escape') { event.preventDefault(); setEditingId(null); }
          }} />
          <button type="submit" disabled={busy || !name.trim()} aria-label={vi ? 'Lưu tên project' : 'Save project name'} title={vi ? 'Lưu tên project' : 'Save project name'}><span aria-hidden="true">✓</span></button>
          <button type="button" disabled={busy} onClick={() => setEditingId(null)} aria-label={vi ? 'Giữ tên mặc định' : 'Keep default name'} title={vi ? 'Giữ tên mặc định' : 'Keep default name'}><span aria-hidden="true">✕</span></button>
        </form> : <div className={`project-row ${activeId === project.id ? 'is-active' : ''}`}>
          <button className="project-open" disabled={busy} aria-current={activeId === project.id ? 'page' : undefined} onClick={() => { selectProject(project.id); setDeleting(null); setEditingId(null); }} title={project.name}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 7V5a1 1 0 0 1 1-1h5l2 3h9a1 1 0 0 1 1 1v11H3V7Z"/></svg>
            <span>{project.name}</span>
          </button>
          {deleting === project.id ? <form className="project-delete-actions" aria-label={vi ? `Xác nhận xóa ${project.name}` : `Confirm deletion of ${project.name}`} onSubmit={event => {
            event.preventDefault();
            if (busy) return;
            deleteProject(project.id);
            setPage(Math.min(currentPage, Math.max(0, Math.ceil((projects.length - 1) / 4) - 1)));
            setDeleting(null);
          }} onKeyDown={event => {
            if (event.key === 'Escape') { event.preventDefault(); setDeleting(null); }
          }}>
            <button type="submit" disabled={busy} aria-label={vi ? 'Xác nhận xóa project' : 'Confirm project deletion'} title={vi ? 'Xác nhận xóa project' : 'Confirm project deletion'}><span aria-hidden="true">✓</span></button>
            <button type="button" autoFocus disabled={busy} onClick={() => setDeleting(null)} aria-label={vi ? 'Hủy xóa project' : 'Cancel project deletion'} title={vi ? 'Hủy xóa project' : 'Cancel project deletion'}><span aria-hidden="true">✕</span></button>
          </form> : <button className="project-delete" disabled={busy} aria-label={`${vi ? 'Xóa project' : 'Delete project'} ${project.name}`} title={vi ? 'Xóa project' : 'Delete project'} onClick={() => setDeleting(project.id)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/></svg>
          </button>}
        </div>}
      </li>)}</ul>
    </nav>
    {!projects.length && <p className="project-sidebar-note">{vi ? 'Chưa có project. Tạo project đầu tiên để bắt đầu.' : 'No projects yet. Create your first project to begin.'}</p>}
    {busy && <small>{vi ? 'Hoàn tất lượt quét hoặc đóng hộp thoại chọn tệp để chuyển project.' : 'Finish the scan or close the file picker to switch projects.'}</small>}
    {storageError && <p role="alert" className="error-bar">{vi ? 'Không thể đọc hoặc lưu project trên máy. Dữ liệu hiện tại chỉ được giữ trong phiên này.' : 'Projects could not be read or saved locally. Current data is available in this session only.'}</p>}
  </aside>;
}
