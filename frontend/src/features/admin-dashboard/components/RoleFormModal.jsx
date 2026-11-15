import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
import { useState, useEffect } from 'react';
import '../styles/AccountFormModal.css';

const EMPTY_FORM = { roleName: '', description: '' };

export default function RoleFormModal({ role, onClose, onSave }) {
  const { translateLabel } = useLanguage();
  const [form, setForm] = useState(() => (
    role
      ? { roleName: role.role_name || '', description: role.description || '' }
      : EMPTY_FORM
  ));
  const isEdit = !!role;
  const isSystemRole = isEdit && role.role_id <= 4;

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        setForm(
          role
            ? { roleName: role.role_name || '', description: role.description || '' }
            : EMPTY_FORM
        );
      }
    });
    return () => { active = false; };
  }, [role]);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const isValid = form.roleName.trim().length >= 2;

  const handleSave = () => {
    if (!isValid) return;
    onSave({
      role_name: form.roleName.trim(),
      description: form.description.trim() || null,
    });
  };

  return (
    <div className="afm-overlay">
      <div className="afm-modal">
        <p className="afm-title">{translateLabel(isEdit ? 'Edit Role' : 'Create Role')}</p>

        <div className="afm-field">
          <label>{translateLabel("Role Name")}</label>
          <input
            type="text"
            value={form.roleName}
            disabled={isSystemRole}
            onChange={(e) => update('roleName', e.target.value)}
            placeholder="e.g. Intern"
            maxLength={50}
          />
          {isSystemRole && (
            <p className="afm-note" style={{ color: '#d97706', marginTop: '4px', marginBottom: 0 }}>
              {translateLabel("System default role name cannot be modified.")}
            </p>
          )}
        </div>

        <div className="afm-field">
          <label>{translateLabel("Description")}</label>
          <textarea
            value={form.description}
            onChange={(e) => update('description', e.target.value)}
            placeholder={translateLabel("Describe role responsibilities and privileges...")}
            maxLength={255}
            rows={3}
            style={{
              padding: '8px 10px',
              borderRadius: '8px',
              border: '1px solid #ddd',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'none',
            }}
          />
        </div>

        <div className="afm-actions" style={{ marginTop: '20px' }}>
          <button className="afm-btn-outline" onClick={onClose}>{translateLabel("Cancel")}</button>
          <button
            className="afm-btn-primary"
            disabled={!isValid}
            onClick={handleSave}
          >
            {translateLabel(isEdit ? 'Save Changes' : 'Create Role')}
          </button>
        </div>
      </div>
    </div>
  );
}
