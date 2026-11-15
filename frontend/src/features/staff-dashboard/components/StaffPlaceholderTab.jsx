import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
import { SectionHead, EmptyState } from "./StaffUI.jsx";

function StaffPlaceholderTab({ title, subtitle, phaseLabel = "Phase 3+" }) {
  const { translateLabel } = useLanguage();
  return (
    <div className="sfx-stack">
      <SectionHead title={title} subtitle={subtitle} />
      <EmptyState
        icon="spark"
        title={translateLabel("Coming soon")}
        hint={`${phaseLabel} — this module will be wired to live operations data.`}
      />
    </div>
  );
}

export default StaffPlaceholderTab;
