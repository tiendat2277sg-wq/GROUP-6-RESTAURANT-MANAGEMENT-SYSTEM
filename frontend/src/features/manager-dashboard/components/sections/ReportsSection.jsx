import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { isSameDay, endOfMonth, differenceInCalendarDays, addDays, subDays, subYears, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from "date-fns";
import DashboardDateRangePicker from "../shared/DashboardDateRangePicker.jsx";
import { useSearchParams } from "react-router-dom";
import RevenueChart from "../RevenueChart.jsx";
import KpiCard from "../KpiCard.jsx";
import Icon from "../ManagerIcons.jsx";
import {
  SectionHead,
  ContentPanel,
  Card,
} from "../ManagerUI.jsx";
import {
  deriveKpisForRange,
  filterDailyRevenue,
  formatDateRangeLabel,
  getDefaultDateRange,
  getDateRangePresets,
  prepareChartSeries,
} from "@/shared/constants.js";
import { asArray } from "@/core/utils/asArray.js";
import { formatVND } from "@/core/utils/formatCurrency.js";
import { getReportsTabFromSearch, REPORT_TAB_IDS } from "../../config/managerRoutes.js";
import { fetchBestSellers, exportReport, uploadReviewedReport } from "../../services/managerApi.js";

const TABS = [
  { id: "revenue", label: "Revenue Dashboard" },
  { id: "stats", label: "Reservation Statistics" },
  { id: "top-dishes", label: "Top Dishes" },
  { id: "export", label: "Export & View" },
];

function ReportsSection({
  kpis,
  reservations,
  bestSellers,
  stats,
  utilization,
  revenue,
  toast,
}) {
  const { translateLabel, language } = useLanguage();
  const L = (vi, en) => (language === "en" ? en : vi);
  const utilizationList = asArray(utilization);
  const statsByArea = asArray(stats?.byArea);
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = useMemo(
    () => getReportsTabFromSearch(`?${searchParams.toString()}`),
    [searchParams]
  );

  const today = useMemo(() => new Date(), []);
  const [dateRange, setDateRange] = useState(() => getDefaultDateRange(today));
  const [draftRange, setDraftRange] = useState(() => getDefaultDateRange(today));
  const [activePresetId, setActivePresetId] = useState("last30");
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerAnchorRef = useRef(null);
  // Use real API revenue series — no mock generation
  const dailyRevenueSeries = useMemo(
    () => asArray(revenue?.series ?? revenue ?? []),
    [revenue]
  );
  const [compareMode, setCompareMode] = useState("prev");
  const [periodView, setPeriodView] = useState("month");
  const [periodSel, setPeriodSel] = useState(null);

  // Kỳ so sánh: ngay trước kỳ đang chọn (cùng số ngày) hoặc cùng kỳ năm trước
  const compareRange = useMemo(() => {
    if (compareMode === "none") return null;
    if (!dateRange.startDate || !dateRange.endDate) return null;
    if (compareMode === "yoy") {
      return { startDate: subYears(dateRange.startDate, 1), endDate: subYears(dateRange.endDate, 1) };
    }
    const days = differenceInCalendarDays(dateRange.endDate, dateRange.startDate) + 1;
    const end = subDays(dateRange.startDate, 1);
    return { startDate: subDays(end, days - 1), endDate: end };
  }, [compareMode, dateRange]);
  const compareLabelText = compareMode === "yoy" ? L("Cùng kỳ năm trước", "Same period last year") : L("Kỳ trước", "Previous period");
  const compareFiltered = useMemo(
    () => (compareRange ? filterDailyRevenue(dailyRevenueSeries, compareRange) : []),
    [compareRange, dailyRevenueSeries]
  );
  const compareTotals = useMemo(
    () => ({
      revenue: compareFiltered.reduce((sum, i) => sum + (i.revenue || 0), 0),
      reservations: compareFiltered.reduce((sum, i) => sum + (i.reservations || 0), 0),
    }),
    [compareFiltered]
  );
  // Dữ liệu API có tới đâu: kỳ so sánh nằm ngoài đó thì không có số để so
  const dataStart = useMemo(
    () => (dailyRevenueSeries.length ? dailyRevenueSeries[0].dateObj : null),
    [dailyRevenueSeries]
  );
  const compareHasData = Boolean(compareRange && dataStart && compareRange.startDate >= dataStart && compareFiltered.length);

  const chartSeries = useMemo(() => {
    const filtered = filterDailyRevenue(dailyRevenueSeries, dateRange);
    const base = prepareChartSeries(filtered);
    if (!compareHasData) return base;
    return base.map((point, i) => ({
      ...point,
      compare: compareFiltered[i] ? compareFiltered[i].revenue : null,
      compareLabel: compareFiltered[i] ? `${compareLabelText} (${compareFiltered[i].dateObj.toLocaleDateString("vi-VN")})` : "",
    }));
  }, [dailyRevenueSeries, dateRange, compareHasData, compareFiltered, compareLabelText]);
  const dateRangeLabel = useMemo(() => formatDateRangeLabel(dateRange), [dateRange]);
  const rangeKpis = useMemo(
    () => deriveKpisForRange(kpis, dailyRevenueSeries, dateRange, reservations),
    [kpis, dailyRevenueSeries, dateRange, reservations]
  );

  const chartTotal = useMemo(
    () => asArray(chartSeries).reduce((sum, point) => sum + (point.revenue ?? 0), 0),
    [chartSeries]
  );

  const openPicker = useCallback(() => {
    setDraftRange({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      key: "selection",
    });
    setPickerOpen(true);
  }, [dateRange]);

  const closePicker = useCallback(() => {
    setPickerOpen(false);
  }, []);

  const handleApply = useCallback(({ startDate, endDate }) => {
    const next = { startDate, endDate, key: "selection" };
    setDateRange(next);

    const presets = getDateRangePresets(today);
    const matched = presets.find((preset) => {
      if (!preset.range.startDate && !next.startDate) return true;
      if (!preset.range.startDate || !next.startDate) return false;
      return isSameDay(preset.range.startDate, next.startDate) && isSameDay(preset.range.endDate, next.endDate);
    });
    setActivePresetId(matched?.id ?? "custom");
    setPickerOpen(false);
  }, [today]);

  const handlePresetSelect = useCallback((preset) => {
    const range = preset.range || { startDate: preset.startDate, endDate: preset.endDate, key: "selection" };
    setDraftRange(range);
    setActivePresetId(preset.id);
    setDateRange(range);
    setPickerOpen(false);
  }, []);

  const [topDishesFilter, setTopDishesFilter] = useState("month");
  const [topDishes, setTopDishes] = useState([]);
  const [loadingTopDishes, setLoadingTopDishes] = useState(false);

  // --- AI Report State ---
  const [currentIntent, setCurrentIntent] = useState(null);
  // Mặc định: báo cáo doanh thu theo kỳ đang chọn, để nút Excel/PDF luôn dùng được mà không cần chatbot.
  const defaultIntent = useMemo(() => {
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const end = dateRange.endDate || new Date();
    const start = dateRange.startDate || new Date(end.getFullYear(), end.getMonth(), end.getDate() - 29);
    return { report_type: "revenue_summary", date_range: { from: fmt(start), to: fmt(end) }, filters: {} };
  }, [dateRange]);
  const activeIntent = currentIntent || defaultIntent;
  const [reportData, setReportData] = useState(null);
  const [grandTotalRow, setGrandTotalRow] = useState(null);

  // Confirm-Before-Run Step State
  const [pendingFormat, setPendingFormat] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleExport = useCallback(async (format, intent = activeIntent) => {
    if (!intent) {
      toast("Please enter a report request first (e.g., Revenue report for this month)", "warning");
      return;
    }
    toast(`Exporting ${format.toUpperCase()} (Draft for review)...`, "info");
    try {
      await exportReport(intent, format);
      toast(`Draft ${format.toUpperCase()} report downloaded successfully!`, "success");
      setShowConfirm(false);
    } catch (err) {
      toast(err.message || `Export error ${format.toUpperCase()}`, "error");
    }
  }, [activeIntent, toast, setShowConfirm]);

  const requestExportWithConfirm = useCallback((format, intent = activeIntent) => {
    if (!intent) {
      toast("Please enter a report request first (e.g., Revenue report for this month)", "warning");
      return;
    }
    setPendingFormat(format);
    setShowConfirm(true);
  }, [activeIntent, toast, setShowConfirm]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    toast("Uploading report to Admin...", "info");
    try {
      const res = await uploadReviewedReport(file, activeIntent);
      if (res?.success) {
        toast("✅ Reviewed report submitted to Admin successfully!", "success");
      }
    } catch (err) {
      toast(err.message || "Failed to submit report to Admin", "error");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    const handleReportUpdate = (e) => {
      if (e.detail) {
        setCurrentIntent(e.detail.intent);
        setReportData(e.detail.data);
        setGrandTotalRow(e.detail.grandTotalRow);
      }
    };
    window.addEventListener("phurai_report_updated", handleReportUpdate);
    return () => window.removeEventListener("phurai_report_updated", handleReportUpdate);
  }, []);

  useEffect(() => {
    let alive = true;
    setLoadingTopDishes(true);
    fetchBestSellers(topDishesFilter)
      .then(res => {
        if (alive) setTopDishes(res.data || []);
      })
      .catch(console.error)
      .finally(() => {
        if (alive) setLoadingTopDishes(false);
      });
    return () => { alive = false; };
  }, [topDishesFilter]);

  const selectTab = (nextTab) => {
    if (!REPORT_TAB_IDS.includes(nextTab)) return;
    if (nextTab === "revenue") {
      setSearchParams({}, { replace: true });
      return;
    }
    setSearchParams({ tab: nextTab }, { replace: true });
  };

  const pctDelta = (now, before) => (before > 0 ? ((now - before) / before) * 100 : null);
  const withDelta = (card, now, before) => {
    if (!compareHasData) return card;
    const pct = pctDelta(now, before);
    if (pct == null) return { ...card, trend: { dir: "flat", text: `${compareLabelText}: ${L("chưa có dữ liệu", "no data yet")}` } };
    const sign = pct > 0 ? "+" : "";
    return { ...card, trend: { dir: pct > 0 ? "up" : pct < 0 ? "down" : "flat", text: `${sign}${pct.toFixed(1)}% ${L("so với", "vs")} ${compareLabelText.toLowerCase()}` } };
  };
  const revenueKpis = asArray(rangeKpis)
    .filter((k) => ["revenue", "reservations", "promos", "rating"].includes(k.id))
    .map((k) => {
      if (k.id === "revenue") return withDelta(k, chartTotal, compareTotals.revenue);
      if (k.id === "reservations") return withDelta(k, k.value, compareTotals.reservations);
      return k;
    });

  // So sánh theo quý và theo năm (tính từ toàn bộ chuỗi doanh thu API)
  const periodStats = (() => {
    const sumRange = (a, b) => {
      let revenue = 0;
      dailyRevenueSeries.forEach((i) => { if (i.dateObj >= a && i.dateObj <= b) revenue += i.revenue || 0; });
      return revenue;
    };
    const covered = (a) => Boolean(dataStart && a >= dataStart);
    const year = today.getFullYear();
    const months = Array.from({ length: 12 }, (_, m) => {
      const start = new Date(year, m, 1);
      const end = endOfMonth(start);
      const pStart = new Date(year - 1, m, 1);
      const pEnd = endOfMonth(pStart);
      const hasNow = start <= today;
      const now = hasNow ? sumRange(start, end) : null;
      const prev = covered(pStart) ? sumRange(pStart, pEnd) : null;
      return { label: L(`Tháng ${m + 1}`, `Month ${m + 1}`), now, prev, ongoing: hasNow && end >= today, hasNow, start, end, name: L(`tháng ${m + 1}/${year}`, `month ${m + 1}/${year}`) };
    });
    const quarters = [0, 1, 2, 3].map((q) => {
      const start = new Date(year, q * 3, 1);
      const end = endOfQuarter(start);
      const pStart = new Date(year - 1, q * 3, 1);
      const pEnd = endOfQuarter(pStart);
      const hasNow = start <= today;
      const now = hasNow ? sumRange(start, end) : null;
      const prev = covered(pStart) ? sumRange(pStart, pEnd) : null;
      return { label: L(`Quý ${q + 1}`, `Q${q + 1}`), now, prev, ongoing: hasNow && end >= today, hasNow, start, end, name: L(`quý ${q + 1}/${year}`, `Q${q + 1}/${year}`) };
    });
    const years = [2, 1, 0].filter((back) => !dataStart || year - back >= dataStart.getFullYear()).map((back) => {
      const y = year - back;
      const start = new Date(y, 0, 1);
      const end = endOfYear(start);
      const cur = covered(start) || (dataStart && dataStart.getFullYear() === y) ? sumRange(start, end) : null;
      return { label: L(`Năm ${y}`, `Year ${y}`), y, now: cur, ongoing: y === year, partial: Boolean(dataStart && dataStart > start), start, end, name: L(`năm ${y}`, `year ${y}`) };
    }).map((row, i, arr) => ({ ...row, prev: i > 0 ? arr[i - 1].now : null }));
    return { months, quarters, years, year };
  })();
  const periodRows = periodView === "month" ? periodStats.months : periodView === "quarter" ? periodStats.quarters : periodStats.years;
  const selectedRow = (periodSel != null && periodRows[periodSel]) || periodRows.find((r) => r.ongoing) || periodRows[periodRows.length - 1];

  // Doanh thu trung bình theo thứ: tính trong tháng / quý / năm đang chọn ở bảng so sánh
  const weekdayStats = (() => {
    const names = language === "en" ? ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] : ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
    const order = [1, 2, 3, 4, 5, 6, 0];
    const buckets = names.map((name) => ({ name, revenue: 0, days: 0 }));
    if (selectedRow) {
      filterDailyRevenue(dailyRevenueSeries, { startDate: selectedRow.start, endDate: selectedRow.end }).forEach((item) => {
        const b = buckets[item.dateObj.getDay()];
        b.revenue += item.revenue || 0;
        b.days += 1;
      });
    }
    const rows = order.map((i) => ({ ...buckets[i], avg: buckets[i].days ? buckets[i].revenue / buckets[i].days : 0 }));
    const max = Math.max(...rows.map((r) => r.avg), 0);
    const best = rows.reduce((a, r) => (r.avg > (a?.avg ?? -1) ? r : a), null);
    return { rows, max, best, name: selectedRow?.name || "" };
  })();
  const fmtPct = (now, prev) => {
    const p = pctDelta(now, prev);
    if (p == null) return { text: "—", tone: "flat" };
    return { text: `${p > 0 ? "+" : ""}${p.toFixed(1)}%`, tone: p > 0 ? "up" : p < 0 ? "down" : "flat" };
  };

  return (
    <div className="sfx-stack">
      <SectionHead title={translateLabel("Reports")} subtitle={translateLabel("Revenue, statistics and exports")} />

      <ContentPanel compact className="sfx-card--overflow-visible">
      <div className="sfx-tabs" role="tablist" aria-label={translateLabel("Report sections")} style={{ marginBottom: '24px' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`sfx-tab ${tab === t.id ? "is-active" : ""}`}
            onClick={() => selectTab(t.id)}
          >
            {translateLabel(t.label)}
          </button>
        ))}
      </div>

      {tab === "revenue" ? (
        <div className="sfx-stack">
          <div className="sfx-kpis">
            {revenueKpis.map((c, i) => (
              <KpiCard key={c.id} card={c} index={i} />
            ))}
          </div>
          <Card className="sfx-card--overflow-visible">
            <div className="sfx-chart-anchor">
              <div className="sfx-chart__head">
                <div>
                  <h3 className="sfx-card__title">{translateLabel("Revenue Overview")}</h3>
                  <p className="sfx-chart__sub">
                    {dateRangeLabel} · {formatVND(chartTotal)} {translateLabel("total")}
                  </p>
                  {compareRange ? (
                    <p className="sfx-chart__sub sfx-chart__sub--compare">
                      {compareLabelText} ({formatDateRangeLabel(compareRange)}):{" "}
                      {compareHasData ? formatVND(compareTotals.revenue) : L("chưa có dữ liệu trong khoảng này", "no data in this range")}
                    </p>
                  ) : null}
                </div>
                <div className="sfx-chart__actions">
                  <select
                    className="sfx-select sfx-compare-select"
                    value={compareMode}
                    onChange={(e) => setCompareMode(e.target.value)}
                    aria-label={L("So sánh doanh thu", "Compare revenue")}
                  >
                    <option value="prev">{L("So với kỳ trước", "Vs previous period")}</option>
                    <option value="yoy">{L("So với năm trước", "Vs last year")}</option>
                    <option value="none">{L("Không so sánh", "No comparison")}</option>
                  </select>
                  <div
                    className={`sfx-chart__picker-anchor${pickerOpen ? " is-open" : ""}`}
                    ref={pickerAnchorRef}
                    style={{ position: "relative" }}
                  >
                    <button
                      type="button"
                      className="sfx-kpi__icon sfx-kpi__icon--trigger"
                      onClick={() => (pickerOpen ? closePicker() : openPicker())}
                      aria-label={translateLabel("Choose date range")}
                      aria-expanded={pickerOpen}
                    >
                      <Icon name="calendar" size={18} />
                    </button>
                    {pickerOpen && (
                      <div style={{
                        position: "absolute",
                        right: 0,
                        top: "100%",
                        marginTop: "8px",
                        zIndex: 100
                      }}>
                        <DashboardDateRangePicker
                          inline={true}
                          draftRange={draftRange}
                          activePresetId={activePresetId}
                          onDraftChange={(selection) => {
                            setDraftRange(selection);
                            setActivePresetId("custom");
                          }}
                          onPresetSelect={handlePresetSelect}
                          onApply={() => handleApply(draftRange)}
                          onCancel={closePicker}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: "24px" }}>
                <RevenueChart
                  data={chartSeries}
                  dateRange={dateRange}
                  rangeLabel={dateRangeLabel}
                  showHeader={false}
                />
              </div>
            </div>
          </Card>
          <Card>
            <div className="sfx-period__head">
              <div>
                <h3 className="sfx-card__title">{language === "en" ? `Revenue comparison by ${periodView}` : `So sánh doanh thu theo ${periodView === "month" ? "tháng" : periodView === "quarter" ? "quý" : "năm"}`}</h3>
                <p className="sfx-chart__sub">
                  {periodView !== "year"
                    ? L(`Năm ${periodStats.year} so với năm ${periodStats.year - 1}`, `${periodStats.year} vs ${periodStats.year - 1}`)
                    : L(`Tổng doanh thu từng năm, so với năm liền trước`, `Total revenue per year, vs the year before`)}
                </p>
              </div>
              <div className="sfx-period__tabs" role="tablist">
                {[["month", L("Theo tháng", "By month")], ["quarter", L("Theo quý", "By quarter")], ["year", L("Theo năm", "By year")]].map(([id, text]) => (
                  <button key={id} type="button" role="tab" aria-selected={periodView === id}
                    className={periodView === id ? "is-active" : ""} onClick={() => { setPeriodView(id); setPeriodSel(null); }}>{text}</button>
                ))}
              </div>
            </div>
            <div className="sfx-period__table">
              <div className="sfx-period__row sfx-period__row--head">
                <span>{L("Kỳ", "Period")}</span>
                <span>{periodView !== "year" ? L(`Năm ${periodStats.year}`, `${periodStats.year}`) : L("Doanh thu", "Revenue")}</span>
                <span>{periodView !== "year" ? L(`Năm ${periodStats.year - 1}`, `${periodStats.year - 1}`) : L("Năm trước", "Previous year")}</span>
                <span>{L("Thay đổi", "Change")}</span>
              </div>
              {periodRows.map((row, rowIdx) => {
                const d = row.now != null && row.prev != null ? fmtPct(row.now, row.prev) : { text: "—", tone: "flat" };
                return (
                  <div
                    className={`sfx-period__row is-clickable${selectedRow === row ? " is-selected" : ""}`}
                    key={row.label}
                    role="button"
                    tabIndex={0}
                    aria-pressed={selectedRow === row}
                    onClick={() => setPeriodSel(rowIdx)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPeriodSel(rowIdx); } }}
                  >
                    <span>
                      {row.label}
                      {row.ongoing ? <em> {L("đang diễn ra", "in progress")}</em> : null}
                      {row.partial ? <em> {L("dữ liệu chưa đủ năm", "partial year data")}</em> : null}
                    </span>
                    <span>{row.now == null ? "—" : formatVND(row.now)}</span>
                    <span>{row.prev == null ? L("chưa có dữ liệu", "no data yet") : formatVND(row.prev)}</span>
                    <span className={`sfx-period__delta is-${d.tone}`}>{d.text}</span>
                  </div>
                );
              })}
            </div>
          </Card>
          <Card>
            <h3 className="sfx-card__title">{L(`Doanh thu trung bình theo thứ trong ${weekdayStats.name || "kỳ đã chọn"}`, `Average revenue by weekday in ${weekdayStats.name || "the selected period"}`)}</h3>
            <p className="sfx-chart__sub">
              {weekdayStats.best && weekdayStats.max > 0
                ? L(`Mạnh nhất: ${weekdayStats.best.name} · ${formatVND(Math.round(weekdayStats.best.avg))} mỗi ngày`, `Best: ${weekdayStats.best.name} · ${formatVND(Math.round(weekdayStats.best.avg))} per day`)
                : L("Chưa có doanh thu trong khoảng đã chọn", "No revenue in the selected range")}
            </p>
            <ul className="sfx-weekday">
              {weekdayStats.rows.map((r) => (
                <li key={r.name} className={weekdayStats.best?.name === r.name && weekdayStats.max > 0 ? "is-best" : ""}>
                  <span className="sfx-weekday__name">{r.name}</span>
                  <span className="sfx-weekday__bar"><i style={{ width: weekdayStats.max ? `${Math.round((r.avg / weekdayStats.max) * 100)}%` : "0%" }} /></span>
                  <span className="sfx-weekday__val">{formatVND(Math.round(r.avg))}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      ) : null}

      {tab === "top-dishes" ? (
        <Card
          title={translateLabel("Top dishes by revenue")}
          action={
            <select
              className="sfx-select sfx-select--sm"
              value={topDishesFilter}
              onChange={(e) => setTopDishesFilter(e.target.value)}
            >
              <option value="today">{translateLabel("Today")}</option>
              <option value="week">{translateLabel("This Week")}</option>
              <option value="month">{translateLabel("This Month")}</option>
            </select>
          }
        >
          {loadingTopDishes ? (
            <p className="sfx-muted" style={{ padding: 16 }}>{translateLabel("Loading...")}</p>
          ) : topDishes.length === 0 ? (
            <p className="sfx-muted" style={{ padding: 16 }}>{translateLabel("No data")}</p>
          ) : (
            <ul className="sfx-rank">
              {topDishes.map((d) => (
                <li key={d.rank} className="sfx-rank__row">
                  <span className="sfx-rank__no">{d.rank}</span>
                  <span className="sfx-rank__main">
                    <strong>{d.dish_name}</strong>
                    <small>{d.qty_sold} {translateLabel("sold")}</small>
                  </span>
                  <span className="sfx-rank__rev">{formatVND(d.revenue)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}

      {tab === "stats" ? (
        <div className="sfx-stack">
          <div className="sfx-statgrid">
            <div className="sfx-statcard">
              <span className="sfx-statcard__val">{stats.totalThisMonth}</span>
              <span className="sfx-statcard__lbl">{translateLabel("Reservations this month")}</span>
            </div>
            <div className="sfx-statcard">
              <span className="sfx-statcard__val">{stats.completionRate}%</span>
              <span className="sfx-statcard__lbl">{translateLabel("Completion rate")}</span>
            </div>
            <div className="sfx-statcard">
              <span className="sfx-statcard__val">{stats.noShowRate}%</span>
              <span className="sfx-statcard__lbl">{translateLabel("No-show rate")}</span>
            </div>
            <div className="sfx-statcard">
              <span className="sfx-statcard__val">{stats.avgPartySize}</span>
              <span className="sfx-statcard__lbl">{translateLabel("Avg party size")}</span>
            </div>
          </div>

          <div className="sfx-grid sfx-grid--2">
            <Card title={translateLabel("Reservations by area")}>
              <ul className="sfx-barlist">
                {statsByArea.map((a) => {
                  const max = Math.max(...statsByArea.map((x) => x.count));
                  return (
                    <li key={a.area}>
                      <span className="sfx-barlist__label">{a.area}</span>
                      <span className="sfx-bar">
                        <span className="sfx-bar__fill" style={{ width: `${(a.count / max) * 100}%` }} />
                      </span>
                      <span className="sfx-barlist__val">{a.count}</span>
                    </li>
                  );
                })}
              </ul>
            </Card>
            <Card title={translateLabel("Table utilization")}>
              <ul className="sfx-barlist">
                {utilizationList.map((u) => (
                  <li key={u.area}>
                    <span className="sfx-barlist__label">{u.area}</span>
                    <span className="sfx-bar">
                      <span className="sfx-bar__fill sfx-bar__fill--green" style={{ width: `${u.utilization}%` }} />
                    </span>
                    <span className="sfx-barlist__val">{u.utilization}%</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      ) : null}

      {tab === "export" ? (
        <Card title={translateLabel("Export & View Reports")}>
          {/* Hidden File Input for Upload */}
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            accept=".xlsx,.pdf"
            onChange={handleFileUpload}
          />

          {/* Confirm-before-run Step Banner (only when active) */}
          {showConfirm && activeIntent && (
            <div style={{ marginBottom: "24px", padding: "16px", background: "#fefce8", borderRadius: "8px", border: "1px solid #fef08a" }}>
              <h5 style={{ margin: "0 0 8px 0", color: "#854d0e", fontSize: "14px" }}>{translateLabel("⚠️ Confirm details before generating")} {pendingFormat?.toUpperCase()} {translateLabel("file")}</h5>
              <p style={{ margin: "0 0 12px 0", fontSize: "13px", color: "#713f12" }}>
                {translateLabel("Exporting")} <strong>{pendingFormat?.toUpperCase()}</strong>{translateLabel(": Report type")} <strong>{activeIntent.report_type}</strong>{translateLabel(", From")} <strong>{activeIntent.date_range?.from}</strong> {translateLabel("to")} <strong>{activeIntent.date_range?.to}</strong>{translateLabel(", Area:")} <strong>{activeIntent.filters?.area_name || "All"}</strong>{translateLabel(", Customer:")} <strong>{activeIntent.filters?.customer_type || activeIntent.customer_type_filter || "All"}</strong>.
              </p>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="sfx-btn sfx-btn--gold sfx-btn--sm"
                  onClick={() => handleExport(pendingFormat || "excel")}
                >
                  {translateLabel("Confirm & Download Draft")}
                </button>
                <button
                  type="button"
                  style={{ padding: "6px 12px", borderRadius: "4px", border: "1px solid #d1d5db", background: "white", cursor: "pointer", fontSize: "13px" }}
                  onClick={() => setShowConfirm(false)}
                >
                  {translateLabel("Cancel / Rephrase")}
                </button>
              </div>
            </div>
          )}

          {/* Action Grid: Download Draft & Upload Reviewed File */}
          <div className="sfx-exportgrid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            <button type="button" className="sfx-export" onClick={() => requestExportWithConfirm("excel")}>
              <Icon name="download" size={20} />
              <strong>{translateLabel("Download Excel (Draft)")}</strong>
              <small>{translateLabel("Download Excel file for offline review & editing")}</small>
            </button>
            <button type="button" className="sfx-export" onClick={() => requestExportWithConfirm("pdf")}>
              <Icon name="report" size={20} />
              <strong>{translateLabel("Download PDF (Draft)")}</strong>
              <small>{translateLabel("Download pre-formatted PDF file")}</small>
            </button>
            <button 
              type="button" 
              className="sfx-export" 
              style={{ borderColor: "#10b981", background: "rgba(16, 185, 129, 0.05)" }}
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Icon name="eye" size={20} />
              <strong style={{ color: "#059669" }}>{translateLabel("Upload Reviewed Report")}</strong>
              <small>{translateLabel("Submit edited .xlsx / .pdf file to Admin")}</small>
            </button>
          </div>

          {/* Data Grid View */}
          {reportData && reportData.length > 0 && (
            <div id="report-data-view" style={{ marginTop: "32px", overflowX: "auto" }}>
              <h4 style={{ marginBottom: "16px" }}>{translateLabel("Preview Data (")}{reportData.length} {translateLabel("rows)")}</h4>
              <table className="sfx-table">
                <thead>
                  <tr>
                    {Object.keys(reportData[0]).map(key => (
                      <th key={key}>{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((row, idx) => (
                    <tr key={idx}>
                      {Object.keys(reportData[0]).map((colKey, colIdx) => {
                        const val = row[colKey];
                        let displayVal = (val !== null && val !== undefined) ? String(val) : "";
                        if (typeof val === 'number' && colKey === 'total_amount') {
                          displayVal = formatVND(val);
                        } else if (typeof val === 'number') {
                          displayVal = val.toLocaleString("vi-VN");
                        }
                        return <td key={colIdx}>{displayVal}</td>;
                      })}
                    </tr>
                  ))}
                  {grandTotalRow && (
                    <tr style={{ fontWeight: "bold", background: "#fef9c3", color: "#854d0e" }}>
                      {Object.keys(reportData[0]).map((key, idx) => {
                        let val = grandTotalRow[key];
                        if (idx === 0 && (val === undefined || val === null || val === "")) val = L("TỔNG CỘNG", "GRAND TOTAL");
                        let displayVal = (val !== null && val !== undefined) ? String(val) : "";
                        if (typeof val === 'number' && key === 'total_amount') {
                          displayVal = formatVND(val);
                        } else if (typeof val === 'number') {
                          displayVal = val.toLocaleString("vi-VN");
                        }
                        return <td key={key}>{displayVal}</td>;
                      })}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}
      </ContentPanel>
    </div>
  );
}

export default ReportsSection;

// touch30
// touch31 1794471634
// touch11 1794555835
// touch12 1794556298
// touch13 1794556345
// touch14 1794556390
// touch15 1794556439
// touch16 1794556583
// touch17 1794556943
// touch18 1794556964
// touch19 1794557141
