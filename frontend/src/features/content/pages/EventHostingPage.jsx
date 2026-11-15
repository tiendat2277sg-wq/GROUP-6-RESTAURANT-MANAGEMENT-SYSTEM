import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/core/i18n/LanguageProvider.jsx";
import heroImg from "@/assets/images/private-events/candle-room.jpg";
import tableImg from "@/assets/images/private-events/sake-table.jpg";
import "../styles/eventHosting.css";

const EVENT_TYPES = [
  {
    vi: ["Sinh nhật & kỷ niệm", "Một buổi omakase riêng tư cho những dịp đáng nhớ: sinh nhật, kỷ niệm ngày cưới, cầu hôn."],
    en: ["Birthdays & anniversaries", "A private omakase evening for the moments that matter: birthdays, anniversaries, proposals."],
  },
  {
    vi: ["Tiệc công ty & đối tác", "Đãi khách hàng, tri ân đối tác hoặc gắn kết đội ngũ trong không gian ấm cúng, kín đáo."],
    en: ["Corporate & client dinners", "Host clients, thank partners or bring your team together in a warm, discreet setting."],
  },
  {
    vi: ["Tiệc gia đình & họp mặt", "Bữa tối đoàn viên cho gia đình và bạn bè, thực đơn được chuẩn bị theo số lượng khách."],
    en: ["Family gatherings", "A reunion dinner for family and friends, with a menu prepared for your party size."],
  },
  {
    vi: ["Tiệc cuối năm & dịp lễ", "Không gian đón mùa lễ hội với thực đơn theo mùa của đầu bếp."],
    en: ["Year-end & holiday parties", "Celebrate the festive season with the chef's seasonal menu."],
  },
];

const WHAT_WE_ARRANGE = [
  { vi: "Thực đơn omakase hoặc combo thiết kế riêng theo ngân sách và khẩu vị", en: "An omakase or combo menu tailored to your budget and tastes" },
  { vi: "Bố trí không gian và chỗ ngồi theo quy mô nhóm", en: "Space and seating arranged for the size of your group" },
  { vi: "Tư vấn đồ uống: sake, rượu vang, đồ uống không cồn", en: "Beverage pairing: sake, wine and non-alcoholic options" },
  { vi: "Hỗ trợ yêu cầu đặc biệt: dị ứng thực phẩm, bánh kem, trang trí nhỏ", en: "Support for special requests: allergies, cake, light decoration" },
];

// Hotline mặc định; nếu Admin cập nhật số điện thoại trong Cài đặt hệ thống thì ưu tiên số đó.
const DEFAULT_HOTLINE = "0966 783 333";

function EventHostingPage() {
  const { language } = useLanguage();
  const vi = language === "vi";
  const [phone, setPhone] = useState(DEFAULT_HOTLINE);

  useEffect(() => {
    let active = true;
    fetch("/api/reservations/settings")
      .then((r) => r.json())
      .then((data) => {
        if (active && data?.success) setPhone(String(data.settings?.restaurant_phone || "").trim() || DEFAULT_HOTLINE);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  return (
    <main className="event-page">
      <section className="event-hero">
        <img className="event-hero__img" src={heroImg} alt="" />
        <div className="event-hero__shade" />
        <div className="event-hero__inner">
          <h1>{vi ? "Tổ chức sự kiện" : "Event Hosting"}</h1>
          <p className="event-lead">
            {vi
              ? "Những buổi tiệc riêng được chăm chút từng chi tiết, từ thực đơn đến không gian, để dịp của bạn trọn vẹn."
              : "Private gatherings tended to in every detail, from the menu to the room, so your occasion feels complete."}
          </p>
          <a className="event-hero__call" href={`tel:${phone.replace(/\s/g, "")}`}>
            {vi ? "Gọi hotline " : "Call "}
            <strong>{phone}</strong>
          </a>
        </div>
      </section>

      <section className="event-section event-types">
        <h2>{vi ? "Loại hình sự kiện" : "Types of events"}</h2>
        <ul className="event-rows">
          {EVENT_TYPES.map((item) => {
            const [title, desc] = vi ? item.vi : item.en;
            return (
              <li key={item.en[0]}>
                <h3>{title}</h3>
                <p>{desc}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="event-split">
        <img src={tableImg} alt="" loading="lazy" />
        <div className="event-split__text">
          <h2>{vi ? "Chúng tôi chuẩn bị cho bạn" : "What we arrange"}</h2>
          <ul>
            {WHAT_WE_ARRANGE.map((item) => (
              <li key={item.en}>{vi ? item.vi : item.en}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="event-call" aria-labelledby="event-call-title">
        <h2 id="event-call-title">{vi ? "Đặt bàn sự kiện qua hotline" : "Book your event by phone"}</h2>
        <p className="event-call__text">
          {vi
            ? "Sự kiện không đặt trực tuyến. Vui lòng gọi hotline để được tư vấn và đặt bàn."
            : "Events cannot be booked online. Please call our hotline for advice and to reserve."}
        </p>
        {phone ? (
          <a className="event-call__phone" href={`tel:${phone.replace(/\s/g, "")}`}>{phone}</a>
        ) : (
          <p className="event-call__text">
            {vi ? "Số hotline hiện chưa được cập nhật. Vui lòng xem " : "The hotline number is not available yet. Please see "}
            <Link to="/contact-hours">{vi ? "trang Liên hệ & giờ mở cửa" : "our Contact & Hours page"}</Link>.
          </p>
        )}
        <p className="event-call__hint">
          {vi
            ? "Nên gọi trước ít nhất 3 đến 5 ngày để chúng tôi sắp xếp chu đáo."
            : "We recommend calling at least 3 to 5 days ahead so we can prepare properly."}
        </p>
      </section>

      <nav className="event-more" aria-label={vi ? "Xem thêm" : "More"}>
        <span>{vi ? "Xem thêm" : "You may also like"}</span>
        <Link to="/private-events">{vi ? "Phòng ăn riêng" : "Private Dining"}</Link>
        <Link to="/catering">{vi ? "Dịch vụ tiệc" : "Catering"}</Link>
        <Link to="/gift-cards">{vi ? "Thẻ quà tặng" : "Gift Cards"}</Link>
      </nav>
    </main>
  );
}

export default EventHostingPage;
// touch10 1794469591
