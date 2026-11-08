import { create } from 'zustand';
import { DESKTOP_DETECTOR_MODEL, DESKTOP_VERIFIER_MODEL } from '../ai/agents/slmCatalog';
import { AppLocale, persistLocale, readStoredLocale } from '../i18n/locale';
import { IpiRunState, SemanticScanProfile } from '../types';

export type ScanTarget = { folderPath: string; folderFileCount?: number | null; filePaths?: never } | { filePaths: string[]; folderPath?: never };

export type ThemeMode = 'dark' | 'light';
export type { AppLocale };

const EMPTY_IPI_RUN: IpiRunState = {
  status: 'idle',
  processingStatus: 'idle',
  suspicions: [],
  events: [],
  scanResult: null,
  check: null,
  error: null,
  fixModel: DESKTOP_DETECTOR_MODEL,
  checkModel: DESKTOP_VERIFIER_MODEL,
};

interface AppState {
  scanTarget: ScanTarget | null;
  scanProfile: SemanticScanProfile;
  pickingSource: boolean;
  themeMode: ThemeMode;
  setThemeMode: (themeMode: ThemeMode) => void;
  toggleThemeMode: () => void;
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
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
  scanTarget: null,
  scanProfile: 'balanced',
  pickingSource: false,
  themeMode: 'dark',
  setThemeMode: (themeMode) => set({ themeMode }),
  toggleThemeMode: () => set((state) => ({ themeMode: state.themeMode === 'dark' ? 'light' : 'dark' })),
  locale: readStoredLocale(),
  setLocale: (locale) => {
    persistLocale(locale);
    set({ locale });
  },
  selectedFolder: null,
  setSelectedFolder: (folder) => set({ selectedFolder: folder || null }),
  ipiFixModel: DESKTOP_DETECTOR_MODEL,
  setIpiFixModel: (model) => set({ ipiFixModel: model }),
  ipiCheckModel: DESKTOP_VERIFIER_MODEL,
  setIpiCheckModel: (model) => set({ ipiCheckModel: model }),
  ollamaStatus: { checked: false, available: false, models: [] },
  checkOllamaStatus: async () => {
    try {
      const result = await window.owaspWorkbench?.checkOllama();
      if (result?.ok) {
        set({ ollamaStatus: { checked: true, available: true, models: result.models || [] } });
      } else {
        set({ ollamaStatus: { checked: true, available: false, models: [], error: result?.error || 'Ollama is not ready.' } });
      }
    } catch (error) {
      set({ ollamaStatus: { checked: true, available: false, models: [], error: error instanceof Error ? error.message : 'Could not check Ollama.' } });
    }
  },
  ipiRun: EMPTY_IPI_RUN,
  ipiRunning: false,
  resetIpiRun: () => set({ ipiRun: EMPTY_IPI_RUN }),
}));
