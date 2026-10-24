import { IpiRunState, SecurityVerdict } from '../../../types';
import { AppLocale, DEFAULT_LOCALE } from '../../../i18n/locale';
import { t } from '../../../i18n/messages';

export function verdictLabel(verdict: SecurityVerdict, locale: AppLocale = DEFAULT_LOCALE): string {
  return t(locale, `verdict.${verdict}`);
}

export function processingLabel(status: IpiRunState['processingStatus'], locale: AppLocale = DEFAULT_LOCALE): string {
  return t(locale, `processing.${status}`);
}
