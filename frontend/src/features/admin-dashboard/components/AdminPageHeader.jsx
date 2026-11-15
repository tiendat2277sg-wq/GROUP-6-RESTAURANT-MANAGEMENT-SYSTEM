import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
import React from 'react';

/**
 * AdminPageHeader — page-level header for Admin subpages.
 * Primary action button uses sfx-btn--gold to match the system design.
 *
 * Props:
 * - title: Title text.
 * - description: Subtext description (optional).
 * - primaryAction: Optional object for action button: { label: 'Button text', onClick: () => {} }
 */
export default function AdminPageHeader({ title, description, primaryAction }) {
  const { translateLabel } = useLanguage();
  return (
    <div className="adp-toolbar" style={{ marginBottom: 20 }}>
      <div>
        <h1 className="adp-page-title">{translateLabel(title)}</h1>
        {description && <p className="adp-subtitle">{translateLabel(description)}</p>}
      </div>
      {primaryAction && (
        <button
          type="button"
          onClick={primaryAction.onClick}
          className="sfx-btn sfx-btn--gold sfx-btn--md"
        >
          {translateLabel(primaryAction.label)}
        </button>
      )}
    </div>
  );
}
