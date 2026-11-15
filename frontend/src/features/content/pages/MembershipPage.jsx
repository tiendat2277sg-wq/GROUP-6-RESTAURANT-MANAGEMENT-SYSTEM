import { Link } from "react-router-dom";
import { useLanguage } from "@/core/i18n/LanguageProvider.jsx";
import "../styles/membership.css";

const TIERS = [
  { key: "silver", vi: "Bạc", en: "Silver", spend: 50, discount: 5 },
  { key: "gold", vi: "Vàng", en: "Gold", spend: 150, discount: 10 },
  { key: "diamond", vi: "Kim Cương", en: "Diamond", spend: 500, discount: 20 },
];

const formatMillion = (n, vi) => (vi ? `${n} triệu đồng` : `${n} million VND`);

const BENEFITS = [
  {
    vi: ["Đặt bàn nhanh hơn", "Thông tin liên hệ được lưu sẵn, bạn chỉ cần chọn ngày, giờ và bàn."],
    en: ["Faster booking", "Your contact details are saved, so you only choose the date, time and table."],
  },
  {
    vi: ["Quản lý lượt đặt", "Xem, theo dõi và quản lý các lượt đặt bàn của bạn ở một nơi."],
    en: ["Manage reservations", "View, track and manage all your bookings in one place."],
    to: "/my-reservations",
    cta: { vi: "Lượt đặt của tôi", en: "My reservations" },
  },
  {
    vi: ["Món yêu thích", "Lưu lại những món bạn thích để gọi lại nhanh ở lần sau."],
    en: ["Favorite dishes", "Save the dishes you love so you can order them again quickly."],
    to: "/profile/favorites",
    cta: { vi: "Món yêu thích", en: "Favorites" },
  },
  {
    vi: ["Giảm giá theo hạng", "Giảm 5%, 10% hoặc 20% trên tổng hóa đơn tùy hạng Bạc, Vàng hoặc Kim Cương."],
    en: ["Tier discounts", "Enjoy 5%, 10% or 20% off your total bill depending on your Silver, Gold or Diamond tier."],
  },
  {
    vi: ["Thông báo trực tiếp", "Nhận thông báo về trạng thái đặt bàn và hoạt động của bạn."],
    en: ["Live notifications", "Get notified about your reservation status and activity."],
  },
  {
    vi: ["Thẻ quà tặng", "Mua và gửi thẻ quà tặng FUKU cho người thân."],
    en: ["Gift cards", "Buy and send FUKU gift cards to someone special."],
    to: "/gift-cards",
    cta: { vi: "Xem thẻ quà tặng", en: "View gift cards" },
  },
];

const STEPS = [
  { vi: ["Đăng ký miễn phí", "Tạo tài khoản bằng email, mất chưa đến một phút."], en: ["Sign up for free", "Create an account with your email in under a minute."] },
  { vi: ["Xác minh email", "Nhập mã xác minh được gửi về hộp thư của bạn."], en: ["Verify your email", "Enter the verification code sent to your inbox."] },
  { vi: ["Đặt bàn và tận hưởng", "Đăng nhập, đặt bàn và nhận ưu đãi dành cho thành viên."], en: ["Book and enjoy", "Sign in, reserve a table and enjoy member offers."] },
];

function MembershipPage({ isAuthenticated = false, onRequireAuth }) {
  const { language } = useLanguage();
  const vi = language === "vi";

  return (
    <main className="member-page">
      <section className="member-hero">
        <div className="member-hero__inner">
          <h1>{vi ? "Chương trình thành viên" : "Membership Program"}</h1>
          <p className="member-lead">
            {vi
              ? "Càng đồng hành lâu với FUKU, ưu đãi càng lớn. Ba hạng thành viên, giảm đến 20% trên tổng hóa đơn."
              : "The longer you dine with FUKU, the more it gives back. Three tiers, up to 20% off your total bill."}
          </p>
          <div className="member-hero__actions">
            {isAuthenticated ? (
              <Link className="member-btn" to="/profile">{vi ? "Xem hồ sơ của tôi" : "View my profile"}</Link>
            ) : (
              <button type="button" className="member-btn" onClick={() => onRequireAuth?.()}>
                {vi ? "Đăng ký miễn phí" : "Join for free"}
              </button>
            )}
            <Link className="member-btn member-btn--ghost" to="/reservations">{vi ? "Đặt bàn" : "Reserve a table"}</Link>
          </div>
        </div>
      </section>

      <section className="member-section member-ladder-wrap">
        <h2>{vi ? "Hạng thành viên" : "Membership tiers"}</h2>
        <p className="member-note">
          {vi
            ? "Hạng được xét theo tổng mức chi tiêu tích lũy tại FUKU."
            : "Your tier is based on your cumulative spending at FUKU."}
        </p>
        <ol className="member-ladder">
          {TIERS.map((tier) => (
            <li className={`member-tier member-tier--${tier.key}`} key={tier.key}>
              <h3>{vi ? tier.vi : tier.en}</h3>
              <p className="member-tier__discount">
                <span>{vi ? "Giảm" : "Save"}</span> {tier.discount}%
              </p>
              <p className="member-tier__text">{vi ? "trên tổng hóa đơn" : "on your total bill"}</p>
              <p className="member-tier__spend">
                {vi ? "Từ " : "From "}
                <strong>{formatMillion(tier.spend, vi)}</strong>
                {vi ? " chi tiêu" : " spent"}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="member-section member-benefits">
        <h2>{vi ? "Quyền lợi thành viên" : "Member benefits"}</h2>
        <ul className="member-list">
          {BENEFITS.map((item) => {
            const [title, desc] = vi ? item.vi : item.en;
            return (
              <li key={item.en[0]}>
                <h3>{title}</h3>
                <p>{desc}</p>
                {item.to && isAuthenticated ? (
                  <Link to={item.to}>{vi ? item.cta.vi : item.cta.en}</Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="member-steps-wrap">
        <div className="member-section">
          <h2>{vi ? "Cách tham gia" : "How to join"}</h2>
          <ol className="member-steps">
            {STEPS.map((step, index) => {
              const [title, desc] = vi ? step.vi : step.en;
              return (
                <li key={step.en[0]}>
                  <span className="member-steps__num">{index + 1}</span>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {!isAuthenticated && (
        <section className="member-cta">
          <h2>{vi ? "Sẵn sàng tham gia?" : "Ready to join?"}</h2>
          <button type="button" className="member-btn" onClick={() => onRequireAuth?.()}>
            {vi ? "Đăng ký ngay" : "Sign up now"}
          </button>
        </section>
      )}
    </main>
  );
}

export default MembershipPage;
// touch10 1794469591
