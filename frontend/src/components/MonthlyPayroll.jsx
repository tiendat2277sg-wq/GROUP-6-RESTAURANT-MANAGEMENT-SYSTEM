import { useEffect, useState } from "react";
import { apiGet } from "@/core/api/httpClient.js";
import { useLanguage } from "@/core/i18n/LanguageProvider.jsx";
import "./MonthlyPayroll.css";

export default function MonthlyPayroll({ team = false, attendance }) {
  const { language } = useLanguage();
  const vi = language === "vi";
  const [month, setMonth] = useState(() => new Date().toLocaleDateString("sv-SE", {timeZone:"Asia/Ho_Chi_Minh"}).slice(0,7));
  const [version, setVersion] = useState(0);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setRows(null);
    setError("");
    if (month) apiGet(`/staff/payroll/${team ? "team" : "me"}?month=${encodeURIComponent(month)}`)
      .then(r => { if (active) setRows(r.data); })
      .catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [month,team,version,attendance]);

  const locale = vi ? "vi-VN" : "en-GB";
  const money = new Intl.NumberFormat(locale, {style:"currency",currency:"VND"});
  const labels = vi ? ["Công", "Giờ làm", "Lương giờ", "Ca đủ phụ cấp", "Phụ cấp", "Thưởng", "Tổng lương"] :
    ["Shifts", "Hours worked", "Hourly earnings", "Eligible shifts", "Allowances", "Bonus", "Total pay"];
  function values(row) {
    return [row.shift_count,(row.worked_seconds/3600).toLocaleString(locale,{maximumFractionDigits:3}),
      money.format(row.hourly_pay), row.allowance_shifts, ...[row.allowance,row.bonus,row.total].map(value=>money.format(value))];
  }
  return <section className="fuku-payroll">
    <div className="fuku-payroll__header">
      <h2>{team ? (vi ? "Bảng lương tháng" : "Monthly payroll") : (vi ? "Lương tháng của tôi" : "My monthly pay")}</h2>
      <div><input type="month" value={month} aria-label={vi?"Tháng tính lương":"Payroll month"} onChange={e=>setMonth(e.target.value)}/>
        <button type="button" onClick={()=>setVersion(v=>v+1)}>{vi?"Làm mới":"Refresh"}</button></div>
    </div>
    {error ? <p role="alert">{error}</p> : !month ? <p>{vi?"Chọn tháng để xem lương.":"Select a month."}</p> : !rows ? <p aria-live="polite">{vi?"Đang tải…":"Loading…"}</p> : !rows.length ? <p>{vi?"Chưa có dữ liệu.":"No records."}</p> : team ?
      <div className="fuku-payroll__scroll"><table><thead><tr>{[vi?"Nhân viên":"Employee",...labels].map(label=><th key={label}>{label}</th>)}</tr></thead>
      <tbody>{rows.map(row=><tr key={row.user_id}><th scope="row">{row.full_name}</th>{values(row).map((value,i)=><td key={labels[i]}>{value}</td>)}</tr>)}</tbody></table></div> :
      <dl>{values(rows[0]).map((value,i)=><div key={labels[i]}><dt>{labels[i]}</dt><dd>{value}</dd></div>)}</dl>}
  </section>;
}
// touch 1794423077
