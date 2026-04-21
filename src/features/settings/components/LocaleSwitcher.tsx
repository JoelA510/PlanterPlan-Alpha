import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { SUPPORTED_LOCALES } from '@/shared/i18n';

export function LocaleSwitcher() {
  const { i18n, t } = useTranslation();
  return (
    <div className="flex items-center gap-3">
      <label className="text-slate-700">{t('settings.profile.locale_label')}</label>
      <Select
        value={i18n.language}
        onValueChange={(code) => void i18n.changeLanguage(code)}
      >
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_LOCALES.map((l) => (
            <SelectItem key={l.code} value={l.code}>
              {l.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
