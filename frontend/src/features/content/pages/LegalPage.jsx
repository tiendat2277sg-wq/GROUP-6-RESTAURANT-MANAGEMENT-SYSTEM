import { Link } from "react-router-dom";
import { useLanguage } from "@/core/i18n/LanguageProvider.jsx";
import "../styles/legal.css";

const EMAIL = "tiendat1177sg@gmail.com";

const CONTENT = {
  privacy: {
    title: ["Chính sách quyền riêng tư", "Privacy Policy"],
    intro: [
      "FUKU tôn trọng quyền riêng tư của bạn. Trang này giải thích chúng tôi thu thập, sử dụng và bảo vệ thông tin của bạn như thế nào.",
      "FUKU respects your privacy. This page explains how we collect, use and protect your information.",
    ],
    sections: [
      [["Thông tin chúng tôi thu thập", "Information we collect"], ["Họ tên, số điện thoại, email và thông tin đặt bàn (ngày, giờ, số khách, ghi chú) mà bạn cung cấp khi đăng ký tài khoản hoặc đặt bàn. Nếu bạn tạo tài khoản, chúng tôi cũng lưu các món yêu thích và lịch sử đặt bàn.", "Your name, phone number, email and reservation details (date, time, party size, notes) that you provide when you sign up or book a table. If you create an account, we also store your favorite dishes and booking history."]],
      [["Cách chúng tôi sử dụng", "How we use it"], ["Xác nhận và quản lý lượt đặt bàn, gửi thông báo liên quan đến đặt bàn, hỗ trợ khách hàng và cải thiện dịch vụ. Chúng tôi không bán thông tin cá nhân của bạn.", "To confirm and manage your reservations, send booking-related notifications, support you and improve our service. We do not sell your personal information."]],
      [["Chia sẻ thông tin", "Sharing"], ["Thông tin chỉ được chia sẻ với nhân viên FUKU có nhiệm vụ liên quan hoặc khi pháp luật yêu cầu.", "Your information is shared only with FUKU staff who need it for their work, or when required by law."]],
      [["Bảo mật và lưu trữ", "Security and retention"], ["Chúng tôi áp dụng các biện pháp hợp lý để bảo vệ dữ liệu và chỉ lưu trong thời gian cần thiết cho mục đích nêu trên.", "We take reasonable measures to protect your data and keep it only as long as needed for the purposes above."]],
      [["Quyền của bạn", "Your rights"], ["Bạn có thể yêu cầu xem, chỉnh sửa hoặc xóa thông tin cá nhân bằng cách liên hệ với chúng tôi.", "You may ask to view, correct or delete your personal information by contacting us."]],
    ],
  },
  terms: {
    title: ["Điều khoản sử dụng", "Terms of Service"],
    intro: [
      "Khi sử dụng website và dịch vụ đặt bàn của FUKU, bạn đồng ý với các điều khoản dưới đây.",
      "By using the FUKU website and reservation service, you agree to the terms below.",
    ],
    sections: [
      [["Đặt bàn", "Reservations"], ["Vui lòng cung cấp thông tin chính xác. Nếu không thể đến, hãy hủy hoặc đổi lịch sớm để chúng tôi sắp xếp cho khách khác. Bàn được giữ tối đa 15 phút kể từ giờ đã đặt.", "Please provide accurate details. If you cannot come, cancel or reschedule early so we can seat other guests. Tables are held for up to 15 minutes after the booked time."]],
      [["Sự kiện và tiệc lớn", "Events and large parties"], ["Sự kiện không đặt trực tuyến. Vui lòng gọi hotline 0966 783 333 để được tư vấn và đặt bàn.", "Events cannot be booked online. Please call our hotline at 0966 783 333 for advice and to reserve."]],
      [["Tài khoản", "Your account"], ["Bạn chịu trách nhiệm giữ bí mật thông tin đăng nhập và các hoạt động trên tài khoản của mình.", "You are responsible for keeping your login details confidential and for activity on your account."]],
      [["Thực đơn và giá", "Menu and prices"], ["Thực đơn, giá và chương trình ưu đãi có thể thay đổi theo mùa hoặc nguồn nguyên liệu mà không cần báo trước.", "Menu, prices and offers may change with the season or ingredient supply without notice."]],
      [["Thay đổi điều khoản", "Changes"], ["Chúng tôi có thể cập nhật các điều khoản này. Việc tiếp tục sử dụng dịch vụ nghĩa là bạn chấp nhận bản cập nhật.", "We may update these terms. Continuing to use the service means you accept the update."]],
    ],
  },
};

function LegalPage({ kind = "privacy" }) {
  const { language } = useLanguage();
  const i = language === "vi" ? 0 : 1;
  const page = CONTENT[kind] || CONTENT.privacy;
  const other = kind === "privacy" ? ["/terms", CONTENT.terms.title[i]] : ["/privacy", CONTENT.privacy.title[i]];

  const sections = [...page.sections.map(([h, b], n) => ({ id: `s${n + 1}`, head: h[i], body: b[i] })),
    { id: "contact", head: i === 0 ? "Liên hệ" : "Contact", contact: true }];

  return (
    <main className="legal-page">
      <header className="legal-hero">
        <div className="legal-hero__inner">
          <h1>{page.title[i]}</h1>
          <p>{page.intro[i]}</p>
          <span className="legal-hero__meta">{i === 0 ? "Cập nhật lần cuối: tháng 11/2026" : "Last updated: November 2026"}</span>
        </div>
      </header>

      <div className="legal-body">
        <nav className="legal-toc" aria-label={i === 0 ? "Mục lục" : "Contents"}>
          <ol>
            {sections.map((sec) => (
              <li key={sec.id}><a href={`#${sec.id}`}>{sec.head}</a></li>
            ))}
          </ol>
          <Link className="legal-toc__other" to={other[0]}>{other[1]}</Link>
        </nav>

        <article className="legal-doc">
          {sections.map((sec) => (
            <section id={sec.id} key={sec.id}>
              <h2>{sec.head}</h2>
              {sec.contact ? (
                <p>
                  {i === 0 ? "Mọi câu hỏi, vui lòng liên hệ " : "For any questions, contact us at "}
                  <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
                  {i === 0 ? " hoặc hotline 0966 783 333." : " or call 0966 783 333."}
                </p>
              ) : (
                <p>{sec.body}</p>
              )}
            </section>
          ))}
        </article>
      </div>
    </main>
  );
}

export default LegalPage;
// touch23 1794470668
// touch24 1794470687
// touch25
