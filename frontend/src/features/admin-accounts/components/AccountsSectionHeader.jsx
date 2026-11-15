import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
import React from 'react';

export default function AccountsSectionHeader({ title, subtitle, count }) {
  const { translateLabel } = useLanguage();
  return (
    <header className="sfx-card__head sfx-card__head--dashboard">
      <div>
        <h3 className="sfx-card__title sfx-card__title--dashboard">{translateLabel(title)}</h3>
        {subtitle && <p className="sfx-muted sfx-card__subtitle--dashboard">{translateLabel(subtitle)}</p>}
      </div>
      {count != null && (
        <span className="sfx-muted sfx-card__counter--dashboard">{count}</span>
      )}
    </header>
  );
}
