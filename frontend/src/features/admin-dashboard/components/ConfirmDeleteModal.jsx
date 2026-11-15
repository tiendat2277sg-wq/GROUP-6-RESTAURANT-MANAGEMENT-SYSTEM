import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
export default function ConfirmDeleteModal({ accountName, onCancel, onConfirm }) {
  const { translateLabel } = useLanguage();
  return (
    <div className="afm-overlay">
      <div className="afm-modal" style={{ width: 360 }}>
        <p className="afm-title">{translateLabel("Delete account")}</p>
        <p style={{ fontSize: 13, color: '#666', marginBottom: 20 }}>
          {translateLabel("Are you sure you want to delete the account")} <strong>{accountName}</strong>{translateLabel("? This action cannot be undone.")}
        </p>
        <div className="afm-actions">
          <button className="afm-btn-outline" onClick={onCancel}>{translateLabel("Cancel")}</button>
          <button className="afm-btn-primary" style={{ background: '#a32d2d' }} onClick={onConfirm}>
            {translateLabel("Delete")}
          </button>
        </div>
      </div>
    </div>
  );
}
