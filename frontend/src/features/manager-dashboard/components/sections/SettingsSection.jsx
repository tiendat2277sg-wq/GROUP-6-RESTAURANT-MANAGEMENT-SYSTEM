import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
import { SectionHead, Card, Button, NotConnectedNote } from "../ManagerUI.jsx";

const ROLE_LABEL = { manager: "Manager", staff: "Staff", admin: "Admin" };

function SettingsSection({ user, role, onSignOut, toast }) {
  const { translateLabel } = useLanguage();
  return (
    <div className="sfx-stack">
      <SectionHead title={translateLabel("Settings")} subtitle={translateLabel("Portal and restaurant configuration")} />

      <div className="sfx-grid sfx-grid--2">
        <Card title={translateLabel("Your account")}>
          <div className="sfx-detail">
            <div className="sfx-detail__row">
              <span>{translateLabel("Name")}</span>
              <strong>{user?.fullName || user?.username || "FUKU Manager"}</strong>
            </div>
            <div className="sfx-detail__row">
              <span>{translateLabel("Email")}</span>
              <strong>{user?.email || "—"}</strong>
            </div>
            <div className="sfx-detail__row">
              <span>{translateLabel("Role")}</span>
              <strong>{user?.roleName || ROLE_LABEL[role]}</strong>
            </div>
          </div>
          <div className="sfx-settings-acts">
            <Button variant="danger" icon="logout" onClick={onSignOut}>
              {translateLabel("Logout")}
            </Button>
          </div>
        </Card>

        <Card title={translateLabel("Restaurant settings")}>
          <div className="sfx-detail">
            <div className="sfx-detail__row">
              <span>{translateLabel("Service hours")}</span>
              <strong>11:00 — 23:00</strong>
            </div>
            <div className="sfx-detail__row">
              <span>{translateLabel("Default slot length")}</span>
              <strong>{translateLabel("120 minutes")}</strong>
            </div>
            <div className="sfx-detail__row">
              <span>{translateLabel("Floors")}</span>
              <strong>2</strong>
            </div>
            <div className="sfx-detail__row">
              <span>{translateLabel("Areas")}</span>
              <strong>8</strong>
            </div>
          </div>
          <div className="sfx-settings-acts">
            <Button variant="soft" icon="settings" onClick={() => toast("Settings API not connected yet", "info")}>
              {translateLabel("Edit settings")}
            </Button>
          </div>
          <NotConnectedNote>{translateLabel("Restaurant settings are read-only here until the settings API is wired.")}</NotConnectedNote>
        </Card>
      </div>
    </div>
  );
}

export default SettingsSection;
