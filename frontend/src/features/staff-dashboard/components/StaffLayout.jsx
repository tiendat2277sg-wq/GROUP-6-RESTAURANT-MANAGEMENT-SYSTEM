import '../styles/staff-dashboard.css';
import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
import { useState } from "react";
import StaffSidebar from "./StaffSidebar.jsx";
import StaffHeader from "./StaffHeader.jsx";
import { useStaffStore } from "../store/staffStore.js";

function StaffLayout({
  role,
  user,
  title,
  subtitle,
  search,
  onSearch,
  onRefresh,
  refreshing,
  refreshLabel,
  onSignOut,
  onSaveProfile,
  children,
}) {
  const { translateLabel } = useLanguage();
  // Keep task names visible on desktop.
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);
  const loading = useStaffStore(state => state.loading);

  return (
    <div className={`sfx-shell sfx-shell--staff ${expanded ? "sfx-shell--expanded" : "sfx-shell--collapsed"}`}>
      <StaffSidebar
        role={role}
        collapsed={!expanded}
        mobileOpen={mobileOpen}
        onCloseMobile={closeMobile}
        onSignOut={onSignOut}
      />

      <div className="sfx-main">
        <StaffHeader
          title={title}
          subtitle={subtitle}
          role={role}
          user={user}
          search={search}
          onSearch={onSearch}
          onToggleSidebar={() => setExpanded((e) => !e)}
          onMobileMenu={() => setMobileOpen(true)}
          onRefresh={onRefresh}
          refreshing={refreshing}
          refreshLabel={refreshLabel}
          onSignOut={onSignOut}
          onSaveProfile={onSaveProfile}
        />
        <main className="sfx-canvas">
          {loading && (
            <div className="sfx-loading-overlay" style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <span className="text-sm font-medium">{translateLabel("Loading data...")}</span>
            </div>
          )}
          <div style={loading ? { opacity: 0.5, pointerEvents: 'none' } : {}}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default StaffLayout;
