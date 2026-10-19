import { create } from 'zustand';
import { IpiRunState } from '../types';

export type ThemeMode = 'dark' | 'light';

const EMPTY_IPI_RUN: IpiRunState = {
  status: 'idle',
  events: [],
  scanResult: null,
  check: null,
  error: null,
  fixModel: 'gemma3:1b',
  checkModel: 'qwen2.5-coder:1.5b',
};

interface AppState {
  themeMode: ThemeMode;
  setThemeMode: (themeMode: ThemeMode) => void;
  toggleThemeMode: () => void;
  selectedFolder: string | null;
  setSelectedFolder: (folder: string | null) => void;
  ipiFixModel: string;
  setIpiFixModel: (model: string) => void;
  ipiCheckModel: string;
  setIpiCheckModel: (model: string) => void;
  ollamaStatus: { checked: boolean; available: boolean; models: string[]; error?: string };
  checkOllamaStatus: () => Promise<void>;
  ipiRun: IpiRunState;
  ipiRunning: boolean;
  resetIpiRun: () => void;
}

export const useStore = create<AppState>((set) => ({
  themeMode: 'dark',
  setThemeMode: (themeMode) => set({ themeMode }),
  toggleThemeMode: () => set((state) => ({ themeMode: state.themeMode === 'dark' ? 'light' : 'dark' })),
  selectedFolder: null,
  setSelectedFolder: (folder) => set({ selectedFolder: folder || null }),
  ipiFixModel: 'gemma3:1b',
  setIpiFixModel: (model) => set({ ipiFixModel: model }),
  ipiCheckModel: 'qwen2.5-coder:1.5b',
  setIpiCheckModel: (model) => set({ ipiCheckModel: model }),
  ollamaStatus: { checked: false, available: false, models: [] },
  checkOllamaStatus: async () => {
    try {
      const result = await window.owaspWorkbench?.checkOllama();
      if (result?.ok) {
        set({ ollamaStatus: { checked: true, available: true, models: result.models || [] } });
      } else {
        set({ ollamaStatus: { checked: true, available: false, models: [], error: result?.error || 'Ollama chưa sẵn sàng.' } });
      }
    } catch (error) {
      set({ ollamaStatus: { checked: true, available: false, models: [], error: error instanceof Error ? error.message : 'Không thể kiểm tra Ollama.' } });
    }
  },
  ipiRun: EMPTY_IPI_RUN,
  ipiRunning: false,
  resetIpiRun: () => set({ ipiRun: EMPTY_IPI_RUN }),
}));
