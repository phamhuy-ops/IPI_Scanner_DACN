export type AppLocale = 'en' | 'vi';

export const DEFAULT_LOCALE: AppLocale = 'en';
export const LOCALE_STORAGE_KEY = 'sentinel-ui-locale';

export function isAppLocale(value: unknown): value is AppLocale {
  return value === 'en' || value === 'vi';
}

export function readStoredLocale(): AppLocale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isAppLocale(stored) ? stored : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function persistLocale(locale: AppLocale) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore quota / private-mode failures */
  }
  if (typeof document !== 'undefined') document.documentElement.lang = locale;
}
