import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('project kiểm thử độc lập', () => {
  it('xóa project đang chọn sẽ phục hồi project còn lại và xóa cuối sẽ về trạng thái rỗng', async () => {
    const { useProjects } = await import('./useProjects');
    const { useStore } = await import('./useStore');
    useProjects.getState().createProject('A');
    const first = useProjects.getState().activeId!;
    useStore.setState({ scanTarget: { filePaths: ['a.txt'] } });
    useProjects.getState().createProject('B');
    const second = useProjects.getState().activeId!;
    useStore.setState({ ipiRunning: true });
    useProjects.getState().deleteProject(second);
    expect(useProjects.getState().projects).toHaveLength(2);
    useStore.setState({ ipiRunning: false });
    useProjects.getState().deleteProject(second);
    expect(useProjects.getState().activeId).toBe(first);
    expect(useStore.getState().scanTarget).toEqual({ filePaths: ['a.txt'] });
    useProjects.getState().deleteProject(first);
    expect(useProjects.getState().activeId).toBeNull();
    expect(useStore.getState().scanTarget).toBeNull();
    expect(JSON.parse(localStorage.getItem('sentinel-projects-v1')!).projects).toEqual([]);
  });
  it('tạo mới sạch và phục hồi nguồn, cấu hình, kết quả của project trước', async () => {
    const { useProjects } = await import('./useProjects');
    const { useStore } = await import('./useStore');
    useProjects.getState().createProject('A');
    const first = useProjects.getState().activeId!;
    useStore.setState({ scanTarget: { filePaths: ['a.txt'] }, scanProfile: 'deep',
      ipiRun: { ...useStore.getState().ipiRun, status: 'completed', processingStatus: 'completed' } });
    useProjects.getState().createProject('B');
    expect(useStore.getState().scanTarget).toBeNull();
    expect(useStore.getState().scanProfile).toBe('balanced');
    expect(useStore.getState().ipiRun.status).toBe('idle');
    useProjects.getState().selectProject(first);
    expect(useStore.getState().scanTarget).toEqual({ filePaths: ['a.txt'] });
    expect(useStore.getState().scanProfile).toBe('deep');
    expect(useStore.getState().ipiRun.status).toBe('completed');
    vi.resetModules();
    const restored = await import('./useProjects');
    const restoredStore = await import('./useStore');
    expect(restored.useProjects.getState().activeId).toBe(first);
    expect(restoredStore.useStore.getState().scanTarget).toEqual({ filePaths: ['a.txt'] });
  });
  it('chặn đổi project và tạo mới trong lúc quét hoặc chọn nguồn', async () => {
    const { useProjects } = await import('./useProjects');
    const { useStore } = await import('./useStore');
    useProjects.getState().createProject('A');
    const first = useProjects.getState().activeId!;
    useProjects.getState().createProject('B');
    const second = useProjects.getState().activeId;
    for (const lock of ['ipiRunning', 'pickingSource'] as const) {
      useStore.setState({ [lock]: true });
      useProjects.getState().selectProject(first);
      useProjects.getState().createProject('C');
      expect(useProjects.getState().activeId).toBe(second);
      expect(useProjects.getState().projects).toHaveLength(2);
      useStore.setState({ [lock]: false });
    }
  });
  it('báo lỗi lưu và vẫn giữ project trong phiên', async () => {
    const { useProjects } = await import('./useProjects');
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => { throw new Error('Quota'); });
    useProjects.getState().createProject('A');
    expect(useProjects.getState().storageError).toBe(true);
    expect(useProjects.getState().projects).toHaveLength(1);
  });
});
