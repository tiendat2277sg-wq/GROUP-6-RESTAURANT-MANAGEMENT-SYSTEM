import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { homeIcons } from "@/features/home";

const exploreLinks = [
  { label: "Home", to: "/" },
  { label: "About Us", to: "/#about" },
  { label: "Our Menu", to: "/menus" },
  { label: "Reservations", to: "/reservations" },
];

const serviceLinks = [
  { label: "Private Dining", to: "/private-events" },
  { label: "Catering", to: "/catering" },
  { label: "Event Hosting", to: "/events" },
  { label: "Gift Cards", to: "/gift-cards" },
  { label: "Loyalty Program", to: "/membership" },
];

const legalLinks = [
  { label: "MENU", to: "/menus" },
  { label: "ABOUT", to: "/#about" },
  { label: "CONTRACT", to: "/contact-hours" },
  { label: "PRIVACY POLICY", to: "/privacy" },
  { label: "TERMS OF SERVICE", to: "/terms" },
];

function Footer() {
  const { translateLabel } = useLanguage();
  const [settings, setSettings] = useState({
    restaurant_name: "FUKU",
    restaurant_address: "",
    restaurant_phone: "0966 783 333",
    restaurant_email: "tiendat1177sg@gmail.com",
    hours_mon_thu: "7:00 AM — 12:00 AM",
    hours_fri_sat: "7:00 AM — 12:00 AM",
    hours_sunday: "7:00 PM — 10:00 PM",
    hours_happy: "4:00 PM — 7:00 PM Daily",
    closed_days: ""
  });

  const format12hTimeRange = (openTime, closeTime) => {
    if (!openTime || !closeTime || !openTime.includes(":") || !closeTime.includes(":")) return null;
    const to12h = (tStr) => {
      let [h, m] = tStr.split(":").map(Number);
      const ampm = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
      return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
    };
    return `${to12h(openTime)} — ${to12h(closeTime)}`;
  };

  const loadFooterSettings = async () => {
    try {
      const res = await fetch('/api/reservations/settings');
      const data = await res.json();
      if (data?.success && data?.settings) {
        const s = data.settings;
        const autoRange = format12hTimeRange(s.open_time, s.close_time);

        setSettings({
          restaurant_name: s.restaurant_name || "FUKU",
          restaurant_address: s.restaurant_address || "",
          restaurant_phone: s.restaurant_phone || "0966 783 333",
          restaurant_email: s.restaurant_email || "tiendat1177sg@gmail.com",
          open_time: s.open_time,
          close_time: s.close_time,
          hours_mon_thu: s.hours_mon_thu || autoRange || "10:00 AM — 10:00 PM",
          hours_fri_sat: s.hours_fri_sat || autoRange || "7:00 AM — 12:00 AM",
          hours_sunday: s.hours_sunday || "7:00 PM — 10:00 PM",
          hours_happy: s.hours_happy || "4:00 PM — 7:00 PM Daily",
          closed_days: s.closed_days || ""
        });
      }
    } catch {
      // Fallback to default state
    }
  };

  useEffect(() => {
    loadFooterSettings();
    const handleUpdate = () => loadFooterSettings();
    window.addEventListener("phurai_settings_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("phurai_settings_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const isClosed = (dayName) => {
    if (!settings.closed_days) return false;
    return settings.closed_days.toLowerCase().includes(dayName.toLowerCase());
  };

  return (
    <footer className="phurai-footer">
      <p className="phurai-footer__watermark" aria-hidden="true">
        {settings.restaurant_name}
      </p>

      <div className="phurai-footer__grid">
        <div className="phurai-footer__brand">
          <p className="phurai-footer__logo">{settings.restaurant_name === 'FUKU' ? 'Fuku' : settings.restaurant_name}</p>
          <p>
            {translateLabel("Omakase theo mùa tại FUKU. Biểu diễn nghệ thuật truyền thống Nhật Bản mỗi tối thứ Sáu, thứ Bảy và Chủ nhật.")}
          </p>
          <div className="phurai-footer__social">
            <Link to="/" aria-label={translateLabel("Trang chủ")} title={translateLabel("Trang chủ")} className="social-link">
              <img src={homeIcons.socialInstagram} alt="" className="social-icon" />
            </Link>

            <Link to="/events" aria-label={translateLabel("Tổ chức sự kiện")} title={translateLabel("Tổ chức sự kiện")} className="social-link">
              <img src={"data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2024%2024%22%20fill=%22none%22%20stroke=%22%23342716%22%20stroke-width=%221.6%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22%3E%3Crect%20x=%223.5%22%20y=%225%22%20width=%2217%22%20height=%2215%22%20rx=%222%22/%3E%3Cpath%20d=%22M3.5%2010h17M8%203v4M16%203v4%22/%3E%3Cpath%20d=%22M12%2012.8l.9%201.8%202%20.3-1.45%201.4.35%202-1.8-.95-1.8.95.35-2L9.1%2014.9l2-.3z%22/%3E%3C/svg%3E"} alt="" className="social-icon" />
            </Link>

            <Link to="/membership" aria-label={translateLabel("Chương trình thành viên")} title={translateLabel("Chương trình thành viên")} className="social-link">
              <img src={"data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%2024%2024%22%20fill=%22none%22%20stroke=%22%23342716%22%20stroke-width=%221.6%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22%3E%3Cpath%20d=%22M12%203l2.6%205.3%205.9.85-4.25%204.15%201%205.85L12%2016.4l-5.25%202.75%201-5.85L3.5%209.15l5.9-.85z%22/%3E%3C/svg%3E"} alt="" className="social-icon" />
            </Link>
          </div>
        </div>

        <div>
          <h3>{translateLabel("EXPLORE")}</h3>
          <ul>
            {exploreLinks.map((link) => (
              <li key={link.label}>
                <Link to={link.to}>{translateLabel(link.label)}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3>{translateLabel("SERVICES")}</h3>
          <ul>
            {serviceLinks.map((link) => (
              <li key={link.label}>
                <Link to={link.to}>{translateLabel(link.label)}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3>{translateLabel("OPENING HOURS")}</h3>
          <dl className="phurai-footer__hours">
            <div>
              <dt>{translateLabel("Mỗi ngày")}</dt>
              <dd>{translateLabel("Trưa")} 10:00 — 15:00</dd>
            </div>
            <div>
              <dt>&nbsp;</dt>
              <dd>{translateLabel("Tối")} 17:00 — 22:00</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="phurai-footer__contact-bar">
        {settings.restaurant_address && (
          <p>
            <img src={homeIcons.location} alt="" className="contact-icon" />
            {settings.restaurant_address}
          </p>
        )}
        {settings.restaurant_phone && (
          <p>
            <img src={homeIcons.phone} alt="" className="contact-icon" />
            <a href={`tel:${settings.restaurant_phone.replace(/\s/g, "")}`}>{settings.restaurant_phone}</a>
          </p>
        )}
        {settings.restaurant_email && (
          <p>
            <img src={homeIcons.email} alt="" className="contact-icon" />
            <a href={`mailto:${settings.restaurant_email}`}>{settings.restaurant_email}</a>
          </p>
        )}
      </div>

      <nav className="phurai-footer__legal" aria-label={translateLabel("Legal")}>
        {legalLinks.map((link) => (
          <Link key={link.label} to={link.to}>
            {translateLabel(link.label)}
          </Link>
        ))}
      </nav>

      <p className="phurai-footer__copyright">{translateLabel("© 2026 FUKU. ALL RIGHTS RESERVED.")}</p>
    </footer>
  );
}

export default Footer;

// touch 1794469034

// touch2 1794469287
// touch11 1794469744
// touch12
// touch13
// touch14 1794469998
// touch15
// touch16 1794470085
// touch22
