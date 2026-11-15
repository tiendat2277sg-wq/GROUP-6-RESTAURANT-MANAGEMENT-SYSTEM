import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiGet, apiPatch, authHeaders, API_BASE_URL } from '@/core/api/httpClient';
import { dateRangeQuery, toApiDate } from '@/core/utils/apiDate.js';
import PortalIcon from '@/components/portal/PortalIcon.jsx';
import '../styles/AdminDashboardPage.css';
import '../../manager-dashboard/styles/manager-dashboard.css';
import {
  SkeletonPresence,
  Skeleton,
  KpiSkeleton,
  fadeScaleVariants,
  listContainerVariants,
  listItemVariants,
} from '@/components/ui/Skeleton';
import AdminReviewsTable from '../components/AdminReviewsTable.jsx';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';

const COLORS = ['#9f8655', '#5a8bb0', '#2f7d4f', '#b7791f', '#7c5cbf', '#b42318', '#3a6ea5', '#e3d6b8'];

/* ── Skeleton for chart panel ─────────────────────────────────── */
function ChartSkeleton() {
  return (
    <motion.div
      key="chart-skeleton"
      variants={fadeScaleVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      aria-busy="true"
      style={{
        background: '#fff',
        borderRadius: 16,
        border: '1px solid rgba(31,26,23,0.07)',
        boxShadow: '0 1px 2px rgba(31,26,23,0.04), 0 8px 24px rgba(31,26,23,0.06)',
        padding: '20px 24px',
      }}
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Skeleton className="w-40 h-5" />
        <Skeleton className="w-24 h-5" style={{ marginLeft: 'auto' }} />
      </div>
      <Skeleton className="w-full" style={{ height: 280, borderRadius: 10 }} />
    </motion.div>
  );
}

/* ── Analytics meta per type ──────────────────────────────────── */
const ANALYTICS_META = {
  revenue: {
    icon: 'chart',
    label: 'Revenue Trend',
    color: 'green',
    kpiKeys: [],
  },
  reservations: {
    icon: 'calendar',
    label: 'Reservation Analytics',
    color: 'blue',
    kpiKeys: [],
  },
  orders: {
    icon: 'orders',
    label: 'Order Analytics',
    color: 'amber',
    kpiKeys: [],
  },
  reviews: {
    icon: 'star',
    label: 'Customer Reviews',
    color: 'gold',
    kpiKeys: [],
  },
  'staff-performance': {
    icon: 'staff',
    label: 'Staff Performance',
    color: 'purple',
    kpiKeys: [],
  },
};

import DashboardDateRangePicker from '../../manager-dashboard/components/shared/DashboardDateRangePicker.jsx';
import { useCountUp } from '@/hooks/useCountUp.js';
import { getDefaultDateRange, formatDateRangeLabel } from '@/shared/constants.js';

/* ── KPI summary row ──────────────────────────────────────────── */
function AnimatedKpiValue({ value, formatFn = (v) => Math.round(v) }) {
  const isNumeric = typeof value === 'number' && !isNaN(value);
  const display = useCountUp(isNumeric ? value : 0, 0.8, formatFn);
  return <>{isNumeric ? display : value}</>;
}

function KpiRow({ data, type }) {
  const { translateLabel } = useLanguage();
  const cards = deriveKpis(data, type);
  if (!cards.length) return null;
  return (
    <motion.div
      className="adp-analytic-kpis"
      variants={listContainerVariants}
      initial="hidden"
      animate="visible"
    >
      {cards.map((c, i) => (
        <motion.div key={i} className={`sfx-kpi sfx-kpi--${c.color || 'blue'}`} variants={listItemVariants}>
          <div className="sfx-kpi__top">
            <button
              type="button"
              className="sfx-kpi__icon sfx-kpi__icon--trigger"
              title={translateLabel(c.label)}
              aria-label={translateLabel(c.label)}
              tabIndex={-1}
              style={{ pointerEvents: 'none' }}
            >
              <PortalIcon name={c.icon} size={16} />
            </button>
          </div>
          <div className="sfx-kpi__value">
            <AnimatedKpiValue value={c.value} formatFn={c.formatFn} />
            {c.suffix ? <span className="sfx-kpi__suffix">{c.suffix}</span> : null}
          </div>
          <p className="sfx-kpi__label">{translateLabel(c.label)}</p>
        </motion.div>
      ))}
    </motion.div>
  );
}

/** Chuẩn hoá ngày API (ISO bị lệch múi giờ) về YYYY-MM-DD theo giờ địa phương và điền 0 cho ngày không có doanh thu. */
function normalizeRevenue(rows, range) {
  const byDay = new Map();
  (rows || []).forEach(r => {
    const day = toApiDate(new Date(r.date)) || String(r.date).slice(0, 10);
    byDay.set(day, (byDay.get(day) || 0) + (Number(r.daily_revenue) || 0));
  });
  if (!byDay.size) return [];
  const days = [...byDay.keys()].sort();
  const from = toApiDate(range?.startDate) || days[0];
  const to = toApiDate(range?.endDate) || days[days.length - 1];
  const out = [];
  for (let d = new Date(`${from}T00:00:00`); toApiDate(d) <= to && out.length < 1100; d.setDate(d.getDate() + 1)) {
    const key = toApiDate(d);
    out.push({ date: key, daily_revenue: byDay.get(key) || 0 });
  }
  return out;
}

function fmtDay2(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '—';
}

function fmtDay(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v));
  return m ? `${m[3]}/${m[2]}` : v;
}

function deriveKpis(data, type) {
  if (!data || !data.length) return [];
  switch (type) {
    case 'revenue': {
      const total = data.reduce((sum, item) => sum + (item.daily_revenue || 0), 0);
      const avg = data.length ? total / data.length : 0;
      return [
        { icon: 'chart', label: 'Total Revenue', color: 'green', value: total, formatFn: fmtVnd, suffix: ' VND' },
        { icon: 'chart', label: 'Daily Average', color: 'blue', value: avg, formatFn: fmtVnd, suffix: ' VND' },
        { icon: 'orders', label: 'Days with Revenue', color: 'amber', value: data.filter(d => d.daily_revenue > 0).length, formatFn: v => Math.round(v) },
      ];
    }
    case 'reservations': {
      const total = data.reduce((s, d) => s + (Number(d.count) || 0), 0);
      const countOf = (...names) => data.filter(d => names.includes(String(d.reservation_status))).reduce((s, d) => s + (Number(d.count) || 0), 0);
      const completed = countOf('Completed');
      const pending = countOf('Pending', 'Await Check-in', 'Confirmed');
      const cancelled = countOf('Cancelled', 'Canceled');
      return [
        { icon: 'calendar', label: 'Total Reservations', color: 'blue', value: total, formatFn: v => Math.round(v) },
        { icon: 'check', label: 'Completed', color: 'green', value: completed, formatFn: v => Math.round(v) },
        { icon: 'clock', label: 'Pending', color: 'amber', value: pending, formatFn: v => Math.round(v) },
        { icon: 'close', label: 'Cancelled', color: 'purple', value: cancelled, formatFn: v => Math.round(v) },
      ];
    }
    case 'orders': {
      const total = data.reduce((s, d) => s + (Number(d.count) || 0), 0);
      const avgVal = total ? data.reduce((s, d) => s + (Number(d.avg_value) || 0) * (Number(d.count) || 0), 0) / total : 0;
      return [
        { icon: 'orders', label: 'Total Orders', color: 'amber', value: total, formatFn: v => Math.round(v) },
        { icon: 'chart', label: 'Avg Order Value', color: 'green', value: avgVal, formatFn: fmtVnd, suffix: ' VND' },
        { icon: 'tag', label: 'Statuses', color: 'blue', value: data.length, formatFn: v => Math.round(v) },
      ];
    }
    case 'reviews': {
      const total = data.reduce((s, d) => s + (Number(d.count) || 0), 0);
      const weighted = data.reduce((s, d) => s + (Number(d.overall_rating) * Number(d.count)), 0);
      const avg = total ? (weighted / total) : 0;
      return [
        { icon: 'star', label: 'Total Reviews', color: 'amber', value: total, formatFn: v => Math.round(v) },
        { icon: 'star', label: 'Avg Rating', color: 'green', value: avg, formatFn: v => total === 0 ? '—' : v.toFixed(1), suffix: '★' },
        { icon: 'chart', label: 'Rating Levels', color: 'blue', value: data.length, formatFn: v => Math.round(v) },
      ];
    }
    case 'staff-performance': {
      const totalShifts = data.reduce((s, d) => s + (Number(d.total_shifts) || 0), 0);
      const top = data.reduce((best, d) => (Number(d.total_shifts) > Number(best.total_shifts) ? d : best), data[0] || {});
      return [
        { icon: 'staff', label: 'Staff Members', color: 'purple', value: data.length, formatFn: v => Math.round(v) },
        { icon: 'orders', label: 'Total Shifts', color: 'blue', value: totalShifts, formatFn: v => Math.round(v) },
        { icon: 'star', label: 'Top Performer', color: 'green', value: top?.staff_code || '—' },
      ];
    }
    default: return [];
  }
}

function fmtVnd(n) {
  if (!n && n !== 0) return '—';
  const num = Math.round(Number(n));
  return new Intl.NumberFormat('vi-VN').format(num);
}

function fmtVndShort(n) {
  if (!n && n !== 0) return '—';
  const num = Math.round(Number(n));
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace('.', ',') + ' tr';
  if (num >= 1_000) return (num / 1_000).toFixed(0) + 'k';
  return num.toString();
}

/* ── Chart renderers ──────────────────────────────────────────── */
function renderChart(type, data, translateLabel = (v) => v) {
  const chartCard = {
    background: '#fff',
    borderRadius: 16,
    border: '1px solid rgba(31,26,23,0.07)',
    boxShadow: '0 1px 2px rgba(31,26,23,0.04), 0 8px 24px rgba(31,26,23,0.06)',
    padding: '20px 24px',
  };

  switch (type) {
    case 'revenue':
      return (
        <motion.div style={{ ...chartCard, height: 360 }} variants={fadeScaleVariants} initial="hidden" animate="visible">
          <h3 className="adp-chart-title">{translateLabel("Daily Revenue (VND)")}</h3>
          <ResponsiveContainer width="100%" height={290} minWidth={1} minHeight={290}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9f8655" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#9f8655" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickMargin={8} stroke="#c9c0b2" tickFormatter={fmtDay} minTickGap={24} />
              <YAxis tickFormatter={v => fmtVndShort(v)} tick={{ fontSize: 11 }} stroke="#c9c0b2" />
              <Tooltip formatter={v => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v)} />
              <Area type="monotone" dataKey="daily_revenue" name="Revenue" stroke="#9f8655" strokeWidth={2.5} fill="url(#revGrad)" activeDot={{ r: 6 }} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      );

    case 'reservations':
      return (
        <motion.div style={{ ...chartCard, height: 360 }} variants={fadeScaleVariants} initial="hidden" animate="visible">
          <h3 className="adp-chart-title">{translateLabel("Reservations by Status")}</h3>
          <ResponsiveContainer width="100%" height={290} minWidth={1} minHeight={290}>
            <BarChart data={data} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="reservation_status" tick={{ fontSize: 12 }} stroke="#c9c0b2" tickFormatter={v => translateLabel(String(v))} />
              <YAxis tick={{ fontSize: 12 }} stroke="#c9c0b2" />
              <Tooltip />
              <Bar dataKey="count" name="Total" fill="#5a8bb0" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      );

    case 'orders':
      return (
        <motion.div
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}
          variants={fadeScaleVariants} initial="hidden" animate="visible"
        >
          <div style={{ ...chartCard, height: 360 }}>
            <h3 className="adp-chart-title">{translateLabel("Orders by Status")}</h3>
            <ResponsiveContainer width="100%" height={280} minWidth={1} minHeight={280}>
              <PieChart>
                <Pie data={data} dataKey="count" nameKey="order_status" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${translateLabel(name)} ${(percent * 100).toFixed(0)}%`}>
                  {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ ...chartCard, height: 360 }}>
            <h3 className="adp-chart-title">{translateLabel("Avg Order Value by Status (VND)")}</h3>
            <ResponsiveContainer width="100%" height={280} minWidth={1} minHeight={280}>
              <BarChart data={data} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="order_status" tick={{ fontSize: 11 }} stroke="#c9c0b2" tickFormatter={v => translateLabel(String(v))} />
                <YAxis tickFormatter={v => fmtVndShort(v)} tick={{ fontSize: 11 }} stroke="#c9c0b2" />
                <Tooltip formatter={v => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v)} />
                <Bar dataKey="avg_value" name="Avg Value" fill="#b8a379" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      );

    case 'reviews':
      return (
        <motion.div style={{ ...chartCard, height: 360 }} variants={fadeScaleVariants} initial="hidden" animate="visible">
          <h3 className="adp-chart-title">{translateLabel("Reviews by Rating")}</h3>
          <ResponsiveContainer width="100%" height={290} minWidth={1} minHeight={290}>
            <BarChart data={data} layout="vertical" barSize={28}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="#c9c0b2" />
              <YAxis dataKey="overall_rating" type="category" tick={{ fontSize: 12 }} stroke="#c9c0b2" tickFormatter={v => `${v} ★`} width={48} />
              <Tooltip />
              <Bar dataKey="count" name="Reviews" fill="#f6c453" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      );

    case 'staff-performance':
      return (
        <motion.div style={{ ...chartCard, height: 360 }} variants={fadeScaleVariants} initial="hidden" animate="visible">
          <h3 className="adp-chart-title">{translateLabel("Shifts Handled per Staff")}</h3>
          <ResponsiveContainer width="100%" height={290} minWidth={1} minHeight={290}>
            <BarChart data={data} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="staff_code" tick={{ fontSize: 11 }} stroke="#c9c0b2" />
              <YAxis tick={{ fontSize: 12 }} stroke="#c9c0b2" />
              <Tooltip />
              <Bar dataKey="total_shifts" name="Shifts" fill="#7c5cbf" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      );

    default:
      return <div style={{ textAlign: 'center', padding: 48, color: '#8a8175' }}>Unsupported chart type.</div>;
  }
}

import { useSocket } from '@/core/socket/SocketContext.jsx';

/* ── Main component ───────────────────────────────────────────── */
export default function Analytics({ type, title, description }) {
  const { translateLabel } = useLanguage();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { socket } = useSocket();

  const today = React.useMemo(() => new Date(), []);
  const [dateRange, setDateRange] = useState(() => {
    if (type === 'reviews') {
      return { startDate: null, endDate: null, key: "selection" };
    }
    return getDefaultDateRange(today);
  });
  const [draftRange, setDraftRange] = useState(() => {
    if (type === 'reviews') {
      return { startDate: null, endDate: null, key: "selection" };
    }
    return getDefaultDateRange(today);
  });
  const [activePresetId, setActivePresetId] = useState(type === 'reviews' ? "allDates" : "last30");
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerAnchorRef = React.useRef(null);
  const dateRangeLabel = React.useMemo(() => formatDateRangeLabel(dateRange), [dateRange]);

  const [fetchTrigger, setFetchTrigger] = useState(0);
  const [localRefreshing, setLocalRefreshing] = useState(false);

  // Listen for global Refresh Data button from AdminLayout
  useEffect(() => {
    const handler = () => setFetchTrigger(t => t + 1);
    window.addEventListener('phurai_admin_refresh', handler);
    return () => window.removeEventListener('phurai_admin_refresh', handler);
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handleNewReview = () => {
      setFetchTrigger(t => t + 1);
    };
    socket.on('review:created', handleNewReview);
    return () => {
      socket.off('review:created', handleNewReview);
    };
  }, [socket]);

  useEffect(() => {
    let alive = true;
    async function fetchAnalytics() {
      try {
        setLoading(true);
        setError(null);
        const queryParams = new URLSearchParams();
        Object.entries(dateRangeQuery(dateRange.startDate, dateRange.endDate)).forEach(([k, v]) => queryParams.append(k, v));
        const qs = queryParams.toString() ? `?${queryParams.toString()}` : '';
        const res = await apiGet(`/admin/analytics/${type}${qs}`);
        if (!alive) return;
        if (res.success && res.data) {
          setData(type === 'revenue' ? normalizeRevenue(res.data, dateRange) : res.data);
        } else {
          setError('Failed to load analytics data.');
        }
      } catch (err) {
        if (!alive) return;
        setError(err.message || 'An error occurred while fetching analytics.');
      } finally {
        if (alive) setLoading(false);
      }
    }
    fetchAnalytics();
    return () => { alive = false; };
  }, [type, dateRange, fetchTrigger]);

  const handleLocalRefresh = useCallback(() => {
    if (localRefreshing) return;
    setLocalRefreshing(true);
    setFetchTrigger(t => t + 1);
    setTimeout(() => setLocalRefreshing(false), 1500);
  }, [localRefreshing]);

  const meta = ANALYTICS_META[type] || {};

  return (
    <div className="adp-analytic-root">
      {/* Page header */}
      <div className="adp-analytic-header">
        <div className="adp-analytic-header__text">
          <h2 className="adp-page-title">{title || meta.label || 'Analytics'}</h2>
          <p className="adp-subtitle">{description || 'Data insights for operational decisions'}</p>
        </div>
      </div>

      {/* Filter bar replacement */}
      <div className="adp-filter-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', overflow: 'visible' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="adp-filter-bar__label" style={{ margin: 0 }}>{translateLabel("Period:")} <span style={{ fontWeight: 500, color: '#1f1a17', marginLeft: 4 }}>{translateLabel(dateRangeLabel)}</span></span>
          <div
            className={`sfx-chart__picker-anchor${pickerOpen ? " is-open" : ""}`}
            ref={pickerAnchorRef}
            style={{ position: "relative" }}
          >
            <button
              type="button"
              className="sfx-kpi__icon sfx-kpi__icon--trigger"
              style={{ position: "relative", zIndex: 20, background: "#f8f5ef", border: "1px solid #e2dcd0", borderRadius: 8, width: 34, height: 34, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#b09460", cursor: "pointer" }}
              onClick={() => (pickerOpen ? setPickerOpen(false) : setPickerOpen(true))}
              aria-label={translateLabel("Choose date range")}
              aria-expanded={pickerOpen}
            >
              <PortalIcon name="calendar" size={18} />
            </button>
            {pickerOpen && (
              <div style={{
                position: "absolute",
                left: 0,
                top: "calc(100% + 8px)",
                zIndex: 1000,
              }}>
                <DashboardDateRangePicker
                  inline={true}
                  draftRange={draftRange}
                  activePresetId={activePresetId}
                  onDraftChange={(selection) => {
                    setDraftRange(selection);
                    setActivePresetId("custom");
                  }}
                  onPresetSelect={(preset) => {
                    setActivePresetId(preset.id);
                    setDraftRange(preset.range);
                  }}
                  onApply={(selection) => {
                    setDateRange(selection);
                    setPickerOpen(false);
                    setFetchTrigger(t => t + 1);
                  }}
                  onCancel={() => {
                    setPickerOpen(false);
                    setDraftRange(dateRange);
                  }}
                />
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          className="adp-filter-bar__refresh"
          onClick={handleLocalRefresh}
          disabled={localRefreshing || loading}
          title={translateLabel("Refresh chart data")}
        >
          <PortalIcon name="refresh" size={14} />
          <span>{translateLabel(localRefreshing || loading ? 'Refreshing…' : 'Refresh')}</span>
        </button>
      </div>

      {/* KPI summary */}
      <AnimatePresence mode="wait">
        {loading ? (
          <KpiSkeleton key="kpi-sk" count={3} className="adp-analytic-kpis" />
        ) : (
          <KpiRow key="kpi-row" data={data} type={type} />
        )}
      </AnimatePresence>

      {/* Chart */}
      <AnimatePresence mode="wait">
        {error ? (
          <motion.div
            key="err"
            variants={fadeScaleVariants} initial="hidden" animate="visible"
            style={{ background: '#fff1f0', border: '1px solid #fecaca', borderRadius: 12, padding: '20px 24px', color: '#b42318' }}
          >
            {error}
          </motion.div>
        ) : loading ? (
          <ChartSkeleton key="chart-sk" />
        ) : !data.length ? (
          <motion.div
            key="empty"
            variants={fadeScaleVariants} initial="hidden" animate="visible"
            style={{ background: '#f9fafb', border: '1px solid rgba(31,26,23,0.07)', borderRadius: 12, padding: '48px 24px', textAlign: 'center', color: '#8a8175' }}
          >
            {translateLabel("No data available for this metric.")}
          </motion.div>
        ) : (
          <motion.div key="chart" variants={fadeScaleVariants} initial="hidden" animate="visible">
            {renderChart(type, data, translateLabel)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Render Reviews Table if type is 'reviews' */}
      {type === 'reviews' && (
        <AdminReviewsTable startDate={dateRange.startDate} endDate={dateRange.endDate} />
      )}

      {/* Render Incoming Reports Table if type is 'revenue' */}
      {type === 'revenue' && (
        <AdminIncomingReportsTable />
      )}
    </div>
  );
}

function AdminIncomingReportsTable() {
  const { translateLabel } = useLanguage();
  const [submissions, setSubmissions] = useState([]);
  const [unreviewedCount, setUnreviewedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  const fetchSubmissions = useCallback(async () => {
    try {
      const res = await apiGet('/admin/reports/submissions');
      if (res?.success) {
        setSubmissions(res.data || []);
        setUnreviewedCount(res.unreviewed_count || 0);
      }
      setNotice(null);
    } catch (err) {
      console.error(err);
      setNotice({ type: 'error', text: translateLabel('Could not load submitted reports. Please try again.') });
    }
  }, [translateLabel]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // These calls go through the shared auth helpers: the session token may live in
  // sessionStorage (no "Remember me"), and a plain window.open() link cannot send
  // the Authorization header, so both used to fail with 401.
  const handleMarkReviewed = async (id) => {
    try {
      await apiPatch(`/admin/reports/submissions/${id}/review`);
      fetchSubmissions();
    } catch (e) {
      console.error(e);
      setNotice({ type: 'error', text: translateLabel('Could not mark the report as reviewed.') });
    }
  };

  const fetchReportFile = async (id, kind) => {
    const response = await fetch(`${API_BASE_URL}/admin/reports/submissions/${id}/${kind}`, { headers: authHeaders() });
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
    const name = /filename="?([^";]+)"?/i.exec(response.headers.get('content-disposition') || '')?.[1];
    return { blob: await response.blob(), name };
  };

  const handleDownload = async (id) => {
    try {
      const { blob, name } = await fetchReportFile(id, 'download');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name || `report-${id}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      console.error(e);
      setNotice({ type: 'error', text: translateLabel('Could not download the report file.') });
    }
  };

  const [preview, setPreview] = useState(null);
  const closePreview = useCallback(() => {
    setPreview(prev => { if (prev?.url) URL.revokeObjectURL(prev.url); return null; });
  }, []);

  // Xem ngay trong trang (modal) — không phụ thuộc popup/tab mới nên không bị trình duyệt chặn.
  const handleView = async (item) => {
    try {
      const { blob } = await fetchReportFile(item.submission_id, 'view');
      const url = URL.createObjectURL(blob);
      setPreview({ url, type: blob.type, id: item.submission_id, title: `${item.manager_name || ''} — ${String(item.report_type || '').replace(/_/g, ' ')}` });
    } catch (e) {
      console.error(e);
      setNotice({ type: 'error', text: translateLabel('Could not open the report file.') });
    }
  };

  return (
    <div style={{ marginTop: 24, background: '#fff', borderRadius: 16, border: '1px solid rgba(31,26,23,0.07)', padding: '20px 24px', boxShadow: '0 1px 2px rgba(31,26,23,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h3 className="adp-chart-title" style={{ margin: 0 }}>{translateLabel("Incoming Reports (Manager Submissions)")}</h3>
          {unreviewedCount > 0 && (
            <span style={{ background: '#e06c6c', color: '#fff', fontSize: '11px', fontWeight: 'bold', borderRadius: '12px', padding: '2px 8px' }}>
              {unreviewedCount} {translateLabel("New")}
            </span>
          )}
        </div>
        <button type="button" onClick={fetchSubmissions} style={{ background: 'none', border: '1px solid #e2dcd0', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: '12px' }}>
          {translateLabel("Refresh")}
        </button>
      </div>

      {preview && (
        <div role="dialog" aria-modal="true" onClick={closePreview} style={{ position: 'fixed', inset: 0, background: 'rgba(31,26,23,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: 'min(960px, 100%)', height: 'min(86vh, 800px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #eee' }}>
              <strong style={{ fontSize: 14 }}>{preview.title}</strong>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => handleDownload(preview.id)} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>{translateLabel('Download')}</button>
                <button type="button" onClick={closePreview} style={{ background: 'none', border: '1px solid #e2dcd0', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>{translateLabel('Close')}</button>
              </div>
            </div>
            <iframe title="report-preview" src={preview.url} style={{ flex: 1, border: 'none', width: '100%' }} />
          </div>
        </div>
      )}
      {notice && (
        <div role="alert" style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 8, background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c', fontSize: 13 }}>
          {notice.text}
        </div>
      )}
      {loading ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#888' }}>{translateLabel("Loading submitted reports...")}</div>
      ) : submissions.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#888' }}>{translateLabel("No submissions received from Managers yet.")}</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#faf8f5', textAlign: 'left', borderBottom: '1px solid #eee' }}>
                <th style={{ padding: '10px 12px' }}>{translateLabel("Manager")}</th>
                <th style={{ padding: '10px 12px' }}>{translateLabel("Report Type")}</th>
                <th style={{ padding: '10px 12px' }}>{translateLabel("Date Range")}</th>
                <th style={{ padding: '10px 12px' }}>{translateLabel("Submitted At")}</th>
                <th style={{ padding: '10px 12px' }}>{translateLabel("Status")}</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>{translateLabel("Actions")}</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((item, idx) => {
                let dateRangeStr = "—";
                if (item.date_range_from) {
                  dateRangeStr = `${fmtDay2(item.date_range_from)} – ${fmtDay2(item.date_range_to)}`;
                } else if (item.intent_json) {
                  try {
                    const parsed = typeof item.intent_json === "string" ? JSON.parse(item.intent_json) : item.intent_json;
                    if (parsed.date_range?.from) {
                      dateRangeStr = `${fmtDay2(parsed.date_range.from)} – ${fmtDay2(parsed.date_range.to)}`;
                    }
                  } catch {
                    // Ignore JSON parse error fallback
                  }
                }

                return (
                  <tr key={item.submission_id || idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{item.manager_name}</td>
                    <td style={{ padding: '10px 12px' }}>{translateLabel(String(item.report_type || '').replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()))}</td>
                    <td style={{ padding: '10px 12px' }}>{dateRangeStr}</td>
                    <td style={{ padding: '10px 12px' }}>{new Date(item.submitted_at).toLocaleString('vi-VN')}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 10, fontSize: '11px', fontWeight: 600,
                        background: item.status === 'Submitted' ? '#fef3c7' : '#d1fae5',
                        color: item.status === 'Submitted' ? '#92400e' : '#065f46'
                      }}>
                        {translateLabel(item.status)}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => handleView(item)}
                          style={{ background: '#8b5cf6', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: '12px', fontWeight: 500 }}
                        >
                          {translateLabel("View Direct")}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(item.submission_id)}
                          style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: '12px' }}
                        >
                          {translateLabel("Download")}
                        </button>
                        {item.status === 'Submitted' && (
                          <button
                            type="button"
                            onClick={() => handleMarkReviewed(item.submission_id)}
                            style={{ background: '#10b981', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: '12px' }}
                          >
                            {translateLabel("Mark Reviewed")}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
