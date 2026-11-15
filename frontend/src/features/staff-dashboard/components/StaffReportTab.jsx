import MonthlyPayroll from "@/components/MonthlyPayroll.jsx";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Clock3, LayoutGrid, Moon, RefreshCw, Sun, Wallet } from "lucide-react";
import { apiGet, apiPost } from "@/core/api/httpClient.js";
import { useLanguage } from "@/core/i18n/LanguageProvider.jsx";

const hours = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", hourCycle: "h23" });

export default function StaffReportTab() {
  const { language } = useLanguage();
  const vi = language === "vi";
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => new Date());
  const hour = Number(hours.format(now));
  const currentSlot = hour >= 10 && hour < 15 ? 10 : hour >= 17 && hour < 22 ? 17 : null;
  const today = now.toLocaleDateString("sv-SE", {timeZone:"Asia/Ho_Chi_Minh"});
  const open = report?.period_id && !report.ended_at && report.shift_date === today && report.shift_hour === currentSlot;
  const locale = vi ? "vi-VN" : "en-GB";
  const hasShift = Boolean(report?.period_id);

  useEffect(() => {
    let active = true;
    apiGet("/staff/reports/summary").then(r => { if (active) setReport(r.data); })
      .catch(e => { if (active) setError(e.message); });
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => { active = false; clearInterval(timer); };
  }, []);

  async function update(changeShift) {
    setBusy(true);
    setError("");
    try {
      if (changeShift) await apiPost(open ? "/staff/shifts/check-out" : "/staff/shifts/check-in", {});
      const response = await apiGet("/staff/reports/summary");
      setReport(response.data);
      setNow(new Date());
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  return <div className="crew-workspace">
    <div className="crew-overview">
      <section className="crew-revenue">
        <div className="crew-heading"><h2><Wallet size={20}/> {vi ? "Doanh thu ca" : "Shift revenue"}</h2>
          <button type="button" className="crew-icon" onClick={() => update(false)} disabled={busy} aria-label={vi ? "Làm mới doanh thu" : "Refresh revenue"}><RefreshCw size={17}/></button>
        </div>
        <strong className="crew-amount">{hasShift ? new Intl.NumberFormat(locale, {style:"currency",currency:"VND"}).format(report.total_revenue) : "—"}</strong>
        <p>{hasShift ? [(report.shift_hour === 10 ? (vi ? "Ca sáng" : "Morning shift") : (vi ? "Ca tối" : "Evening shift")), new Date(report.shift_date+"T12:00:00+07:00").toLocaleDateString(locale,{timeZone:"Asia/Ho_Chi_Minh"})].join(" · ") : report ? (vi ? "Bắt đầu ca để xem doanh thu." : "Start a shift to see revenue.") : (vi ? "Đang tải doanh thu…" : "Loading revenue…")}</p>
        <dl className="crew-counts">{[[vi ? "Hóa đơn đã thu" : "Paid orders",report?.paid_orders_count],[vi ? "Bàn đã phục vụ" : "Tables served",report?.tables_served_count]].map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{hasShift ? value : "—"}</dd></div>)}</dl>
      </section>
      <section className="crew-schedule">
        <div className="crew-heading"><h2><Clock3 size={20}/> {vi ? "Chấm công" : "Attendance"}</h2><span>GMT+7</span></div>
        {[[10,Sun,vi?"Ca sáng":"Morning", "10:00 – 15:00"],[17,Moon,vi?"Ca tối":"Evening","17:00 – 22:00"]].map(([slot,Icon,label,time]) => <div className={"crew-slot"+(slot===currentSlot?" in-hours":"")} key={slot}><Icon size={18}/><strong>{label}</strong><span>{time}</span></div>)}
        <p aria-live="polite">{open ? (vi ? "Bạn đang trong ca." : "You are clocked in.") : currentSlot ? (vi ? "Bạn chưa chấm công vào ca hiện tại." : "You are clocked out.") : (vi ? "Hiện ngoài giờ chấm công." : "Outside shift hours.")}</p>
        <button className="crew-primary" disabled={!report || busy || !currentSlot} onClick={()=>update(true)}>{open ? (vi ? "Kết thúc ca" : "End shift") : (vi ? "Bắt đầu ca" : "Start shift")}<ArrowRight size={16}/></button>
      </section>
    </div>
    {error && <p className="crew-error" role="alert">{error}</p>}
    <MonthlyPayroll attendance={report} />
    <section className="crew-shortcuts"><h2>{vi ? "Thao tác nhanh" : "Quick actions"}</h2>
      <div>{[["reservations",CalendarDays,vi?"Đặt bàn":"Reservations"],["tables",LayoutGrid,vi?"Sơ đồ bàn":"Floor plan"],["payments",Wallet,vi?"Thanh toán":"Payments"]].map(([path,Icon,label]) => <Link key={path} to={"/staff/"+path}><Icon size={19}/><strong>{label}</strong><ArrowRight size={16}/></Link>)}</div>
    </section>
  </div>;
}
