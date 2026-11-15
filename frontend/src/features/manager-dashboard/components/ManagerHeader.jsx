import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
/**
 * ManagerHeader — thin wrapper around shared PortalHeader.
 * Preserves original props API so ManagerLayout needs no changes.
 *
 * Changed: primary action is now "Refresh Data" (replaces "New Reservation").
 */
import PortalHeader from "@/components/portal/PortalHeader.jsx";
import PortalIcon from "@/components/portal/PortalIcon.jsx";

function ManagerHeader({
  title,
  subtitle,
  role,
  user,
  search,
  onSearch,
  onToggleSidebar,
  onMobileMenu,
  onRefresh,
  refreshing,
  onSignOut,
  onSaveProfile,
}) {
  const { translateLabel } = useLanguage();
  const refreshBtn = (
    <button
      type="button"
      className="sfx-btn sfx-btn--ghost sfx-btn--md"
      onClick={onRefresh}
      disabled={refreshing}
      aria-label={translateLabel("Refresh all data")}
    >
      <PortalIcon name="refresh" size={16} />
      <span>{translateLabel(refreshing ? "Refreshing…" : "Refresh Data")}</span>
    </button>
  );

  return (
    <PortalHeader
      title={title}
      subtitle={subtitle}
      role={role}
      user={user}
      search={search}
      onSearch={onSearch}
      searchPlaceholder="Search reservations, tables, dishes…"
      onToggleSidebar={onToggleSidebar}
      onMobileMenu={onMobileMenu}
      extraAction={onRefresh ? refreshBtn : undefined}
      onSignOut={onSignOut}
      onSaveProfile={onSaveProfile}
    />
  );
}

export default ManagerHeader;
