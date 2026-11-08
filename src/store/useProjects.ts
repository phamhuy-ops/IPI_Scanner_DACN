import { create } from 'zustand';
import { useStore } from './useStore';

function snapshot() {
  const state = useStore.getState();
  return {
    ipiRun: state.ipiRun,
    scanTarget: state.scanTarget,
    scanProfile: state.scanProfile,
    ipiFixModel: state.ipiFixModel,
    ipiCheckModel: state.ipiCheckModel,
    selectedFolder: state.selectedFolder,
  };
}

const defaults = snapshot();
type Project = { id: string; name: string; data: ReturnType<typeof snapshot> };
type ProjectsState = {
  projects: Project[];
  activeId: string | null;
  storageError: boolean;
  createProject: (name: string) => void;
  renameProject: (id: string, name: string) => void;
  selectProject: (id: string) => void;
  deleteProject: (id: string) => void;
};
const storageKey = 'sentinel-projects-v1';
function restore(): Pick<ProjectsState, 'projects' | 'activeId' | 'storageError'> {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return { projects: [], activeId: null, storageError: false };
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved.projects) || !saved.projects.every((p: Project) =>
      typeof p.id === 'string' && typeof p.name === 'string' && p.data &&
      ['idle', 'completed', 'error'].includes(p.data.ipiRun?.status))) throw new Error('Invalid project data');
    const projects: Project[] = saved.projects.map((project: Project) =>
      saved.modelDefaultsVersion !== 2 && project.data.ipiFixModel === 'gemma3:1b' && project.data.ipiCheckModel === 'qwen2.5-coder:1.5b'
        ? { ...project, data: { ...project.data, ipiFixModel: defaults.ipiFixModel, ipiCheckModel: defaults.ipiCheckModel } }
        : project);
    return { projects, activeId: projects.some(p => p.id === saved.activeId) ? saved.activeId : null, storageError: false };
  } catch {
    return { projects: [], activeId: null, storageError: true };
  }
}

const initial = restore();
const active = initial.projects.find(project => project.id === initial.activeId);
if (active) useStore.setState({ ...defaults, ...active.data, ipiRunning: false, pickingSource: false });

export const useProjects = create<ProjectsState>((set, get) => ({
  ...initial,
  deleteProject: (id) => {
    const state = useStore.getState();
    if (state.ipiRunning || state.pickingSource) return;
    const current = get();
    if (!current.projects.some(project => project.id === id)) return;
    const projects = current.projects.filter(project => project.id !== id);
    if (current.activeId !== id) {
      set({ projects });
      return;
    }
    const next = projects[0];
    set({ projects, activeId: next?.id ?? null });
    useStore.setState({ ...structuredClone(defaults), ...next?.data, ipiRunning: false });
  },
  createProject: (name) => {
    const state = useStore.getState();
    if (!name.trim() || state.ipiRunning || state.pickingSource) return;
    const project = { id: crypto.randomUUID(), name: name.trim().slice(0, 80), data: structuredClone(defaults) };
    set({ projects: [...get().projects, project], activeId: project.id });
    useStore.setState({ ...project.data, ipiRunning: false });
  },
  renameProject: (id, name) => {
    const state = useStore.getState();
    if (!name.trim() || state.ipiRunning || state.pickingSource) return;
    set(current => ({ projects: current.projects.map(project => project.id === id ? { ...project, name: name.trim().slice(0, 80) } : project) }));
  },
  selectProject: (id) => {
    const state = useStore.getState();
    const project = get().projects.find(item => item.id === id);
    if (!project || state.ipiRunning || state.pickingSource || id === get().activeId) return;
    set({ activeId: id });
    useStore.setState({ ...defaults, ...project.data, ipiRunning: false });
  },
}));

// Lưu khi trạng thái ổn định để không khôi phục một lượt quét đang chạy dở.
useStore.subscribe((state, previous) => {
  if (state.ipiRunning || state.pickingSource || state.ipiRun.status === 'running') return;
  if (state.ipiRun === previous.ipiRun && state.scanTarget === previous.scanTarget &&
      state.scanProfile === previous.scanProfile && state.ipiFixModel === previous.ipiFixModel &&
      state.ipiCheckModel === previous.ipiCheckModel && state.ipiRunning === previous.ipiRunning &&
      state.pickingSource === previous.pickingSource) return;
  const { activeId, projects } = useProjects.getState();
  if (!activeId) return;
  useProjects.setState({ projects: projects.map(project => project.id === activeId ? { ...project, data: snapshot() } : project) });
});

useProjects.subscribe((state, previous) => {
  if (state.projects === previous.projects && state.activeId === previous.activeId) return;
  try {
    localStorage.setItem(storageKey, JSON.stringify({ projects: state.projects, activeId: state.activeId, modelDefaultsVersion: 2 }));
    if (state.storageError) useProjects.setState({ storageError: false });
  } catch {
    if (!state.storageError) useProjects.setState({ storageError: true });
  }
});
