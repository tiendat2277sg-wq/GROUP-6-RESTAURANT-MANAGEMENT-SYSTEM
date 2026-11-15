import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
function SectionHeader({ title, className = '' }) {
  const { translateLabel } = useLanguage();
  return (
    <div className={`phurai-section-header ${className}`.trim()}>
      <h2>{translateLabel(title)}</h2>
      <span className="phurai-section-header__divider" aria-hidden="true" />
    </div>
  );
}

export default SectionHeader;
