import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { listContainerVariants, listItemVariants } from "@/components/ui/Skeleton";
import { format, parseISO } from "date-fns";
import { SectionHead, ContentPanel, Toolbar, SearchField, Button, EmptyState } from "../ManagerUI.jsx";
import { ManagerModal } from "../ManagerOverlay.jsx";
import Icon from "../ManagerIcons.jsx";
import { fetchPromotions, createPromotion, updatePromotion, togglePromotionStatus, deletePromotion } from "../../services/promotionsApi.js";
import { Copy, Edit2, Trash2, Play, Pause, Star, ShoppingBag, CalendarCheck, Tag, Percent, Gift, Clock, Users } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Apple-style animation variants                                           */
/* ═══════════════════════════════════════════════════════════════════════════ */
const APPLE = [0.16, 1, 0.3, 1];

const cardVariants = {
  hidden:  { opacity: 0, y: 24, scale: 0.97 },
  visible: (i) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { ease: APPLE, duration: 0.55, delay: i * 0.06 },
  }),
  exit: { opacity: 0, y: -12, scale: 0.97, transition: { ease: APPLE, duration: 0.25 } },
};

const kpiCardVariants = {
  hidden:  { opacity: 0, y: 20, scale: 0.95 },
  visible: (i) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { ease: APPLE, duration: 0.5, delay: i * 0.08 },
  }),
};

const pulseVariants = {
  active:   { scale: [1, 1.15, 1], transition: { duration: 2, repeat: Infinity, ease: "easeInOut" } },
  inactive: { scale: 1 },
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Scope badge + helpers                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */
const SCOPE_COLORS = {
  Both:        { bg: 'linear-gradient(135deg, #EDE9FE, #F3E8FF)', color: '#7C3AED', border: '#DDD6FE' },
  Order:       { bg: 'linear-gradient(135deg, #D1FAE5, #ECFDF5)', color: '#065F46', border: '#A7F3D0' },
  Reservation: { bg: 'linear-gradient(135deg, #DBEAFE, #EFF6FF)', color: '#1E40AF', border: '#BFDBFE' },
};

function ScopeBadge({ scope }) {
  const s = SCOPE_COLORS[scope] || { bg: '#F3F4F6', color: '#374151', border: '#E5E7EB' };
  const BadgeIcon = scope === 'Order' ? ShoppingBag : scope === 'Reservation' ? CalendarCheck : Tag;
  return (
    <span style={{
      background: s.bg, color: s.color, fontSize: '0.72rem', fontWeight: 700,
      padding: '3px 10px', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 5,
      border: `1px solid ${s.border}`, letterSpacing: '0.01em',
    }}>
      <BadgeIcon size={11} /> {scope || 'Both'}
    </span>
  );
}

function StatusPill({ isActive }) {
  const { translateLabel } = useLanguage();
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 12px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700,
      background: isActive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)',
      color: isActive ? '#16a34a' : '#dc2626',
      border: `1px solid ${isActive ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.15)'}`,
    }}>
      <motion.span
        variants={pulseVariants}
        animate={isActive ? "active" : "inactive"}
        style={{
          width: 7, height: 7, borderRadius: '50%',
          background: isActive ? '#22c55e' : '#ef4444',
        }}
      />
      {translateLabel(isActive ? 'Active' : 'Paused')}
    </span>
  );
}

const safeFmt = (d) => {
  if (!d) return '—';
  try { return format(typeof d === 'string' ? parseISO(d) : new Date(d), 'dd/MM/yyyy HH:mm'); }
  catch { return '—'; }
};

const fmtDiscount = (type, value) => {
  if (!value) return '—';
  if (type === 'PERCENT' || type === 'Percent') return `${value}%`;
  return `${Number(value).toLocaleString('vi-VN')}₫`;
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Default form state                                                       */
/* ═══════════════════════════════════════════════════════════════════════════ */
const EMPTY_FORM = {
  promotion_name: "", description: "", promo_code: "",
  discount_type: "PERCENT", discount_value: "",
  max_discount_amount: "", min_order_value: "0",
  valid_from: "", valid_until: "", from_time: "00:00", until_time: "23:59", usage_limit: "",
  applicable_to: "Both", points_required: "0",
  total_quantity: "", validity_duration_hours: "24",
};

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Main Component                                                           */
/* ═══════════════════════════════════════════════════════════════════════════ */
export default function PromotionsSection({ promotions, setPromotions, toast }) {
  const { translateLabel, language } = useLanguage();
  const [search, setSearch]             = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [editingPromoId, setEditingPromoId] = useState(null);
  const [formData, setFormData]         = useState({ ...EMPTY_FORM });

  /* ── Load promotions ──────────────────────────────────────────────────── */
  const loadData = useCallback(async () => {
    try {
      const res = await fetchPromotions();
      if (res.success) {
        setPromotions(res.data || []);
      } else {
        toast(res.error || res.message || "Failed to load promotions", "error");
      }
    } catch (err) {
      toast(err.data?.error || err.data?.message || err.message || "Failed to refresh promotions", "error");
    }
  }, [setPromotions, toast]);

  useEffect(() => {
    if (!promotions || promotions.length === 0) {
      loadData();
    }
  }, []);

  /* ── Toggle status ──────────────────────────────────────────────────── */
  const handleToggleStatus = async (id) => {
    try {
      const res = await togglePromotionStatus(id);
      if (res.success) {
        setPromotions(prev => prev.map(p => p.promotion_id === id ? { ...p, is_active: res.is_active } : p));
        toast("Status updated", "success");
      }
    } catch (err) {
      toast("Failed to update status", "error");
    }
  };

  /* ── Delete ─────────────────────────────────────────────────────────── */
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this promotion?")) return;
    try {
      const res = await deletePromotion(id);
      if (res.success) {
        setPromotions(prev => prev.filter(p => p.promotion_id !== id));
        toast("Promotion deleted", "success");
      }
    } catch (err) {
      const errorMessage = err.data?.message || err.message || "Failed to delete promotion";
      toast(errorMessage, "error");
    }
  };

  /* ── Edit ────────────────────────────────────────────────────────────── */
  const handleEdit = (promo) => {
    setEditingPromoId(promo.promo_code_id);
    const fmtDate = (d) => {
      if (!d) return '';
      try {
        const dt = typeof d === 'string' ? parseISO(d) : new Date(d);
        return format(dt, "yyyy-MM-dd'T'HH:mm");
      } catch { return ''; }
    };
    setFormData({
      promotion_name:       promo.promotion_name || "",
      description:          promo.description || "",
      promo_code:           promo.promo_code || "",
      discount_type:        promo.discount_type || "PERCENT",
      discount_value:       promo.discount_value?.toString() || "",
      max_discount_amount:  promo.max_discount_amount?.toString() || "",
      min_order_value:      promo.min_order_value?.toString() || "0",
      valid_from:           fmtDate(promo.valid_from).slice(0,10),
      from_time: fmtDate(promo.valid_from).slice(11) || "00:00",
      valid_until:          fmtDate(promo.valid_until).slice(0,10),
      until_time: fmtDate(promo.valid_until).slice(11) || "23:59",
      usage_limit:          promo.usage_limit?.toString() || "",
      applicable_to:        promo.applicable_to || "Both",
      points_required:      promo.points_required?.toString() || "0",
      total_quantity:       promo.total_quantity?.toString() || "",
      validity_duration_hours: promo.validity_duration_hours?.toString() || "24",
    });
    setShowAddModal(true);
  };

  /* ── Reset ──────────────────────────────────────────────────────────── */
  const resetForm = () => {
    setFormData({ ...EMPTY_FORM });
    setEditingPromoId(null);
    setShowAddModal(false);
  };

  /* ── Submit ─────────────────────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const { from_time, until_time, ...fields } = formData;
    const start = fields.valid_from + "T" + from_time;
    const end = fields.valid_until + "T" + until_time;
    if (end <= start) {
      toast(language === "vi" ? "Thời điểm kết thúc phải sau thời điểm bắt đầu." : "End time must be after start time.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...fields, valid_from: start, valid_until: end,
        discount_value:       parseFloat(formData.discount_value) || 0,
        max_discount_amount:  parseFloat(formData.max_discount_amount) || null,
        min_order_value:      parseFloat(formData.min_order_value) || 0,
        usage_limit:          formData.usage_limit ? parseInt(formData.usage_limit) : null,
        points_required:      parseInt(formData.points_required) || 0,
        total_quantity:       formData.total_quantity ? parseInt(formData.total_quantity) : null,
        validity_duration_hours: parseInt(formData.validity_duration_hours) || 24,
      };

      let res;
      if (editingPromoId) {
        res = await updatePromotion(editingPromoId, payload);
      } else {
        res = await createPromotion(payload);
      }

      if (res.success) {
        toast(editingPromoId ? "Promotion updated" : "Promotion created", "success");
        resetForm();
        await loadData();
      } else {
        toast(res.error || res.message || "Save failed", "error");
      }
    } catch (err) {
      toast(err.data?.message || err.message || "Failed to save", "error");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Client-side search ────────────────────────────────────────────── */
  const filtered = useMemo(() => {
    if (!search.trim()) return promotions || [];
    const q = search.toLowerCase();
    return (promotions || []).filter(p =>
      (p.promotion_name || '').toLowerCase().includes(q) ||
      (p.promo_code || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
    );
  }, [promotions, search]);

  /* ── KPI stats ─────────────────────────────────────────────────────── */
  const promoKpis = useMemo(() => {
    const all = promotions || [];
    const active = all.filter(p => p.is_active);
    const totalUsed = all.reduce((s, p) => s + (p.times_used || 0), 0);
    return [
      { label: "Total Promotions", value: all.length,    color: "blue",   icon: Tag,     gradient: "linear-gradient(135deg, #3B82F6, #6366F1)" },
      { label: "Active Now",       value: active.length, color: "green",  icon: Play,    gradient: "linear-gradient(135deg, #22C55E, #16A34A)" },
      { label: "Paused",           value: all.length - active.length, color: "amber", icon: Pause, gradient: "linear-gradient(135deg, #F59E0B, #D97706)" },
      { label: "Total Redeemed",   value: totalUsed,     color: "purple", icon: Gift,    gradient: "linear-gradient(135deg, #8B5CF6, #7C3AED)" },
    ];
  }, [promotions]);

  /* ── Copy promo code ───────────────────────────────────────────────── */
  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast(`Copied: ${code}`, "success");
  };

  /* ═══════════════════════════════════════════════════════════════════════ */
  /*  RENDER                                                                */
  /* ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="sfx-stack">
      {/* ── Section Header ───────────────────────────────────────────────── */}
      <SectionHead
        title={translateLabel("Promotions & Promo Codes")}
        subtitle={translateLabel("Create, manage and track promotional campaigns")}
      >
        <Button variant="primary" onClick={() => { resetForm(); setShowAddModal(true); }}>
          {translateLabel("+ New Promotion")}
        </Button>
      </SectionHead>

      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      <div className="sfx-promotions__kpis-grid">
        {promoKpis.map((kpi, i) => (
          <motion.article
            key={kpi.label}
            custom={i}
            variants={kpiCardVariants}
            initial="hidden"
            animate="visible"
            whileHover={{ y: -4, boxShadow: '0 16px 48px rgba(31,26,23,0.10)' }}
            className="sfx-promotions__kpi-card"
          >
            <div className="sfx-promotions__kpi-bg" style={{ background: kpi.gradient }} />
            <div className="sfx-promotions__kpi-icon-container" style={{ background: kpi.gradient }}>
              <kpi.icon size={18} color="#fff" />
            </div>
            <p className="sfx-promotions__kpi-val">
              {kpi.value}
            </p>
            <p className="sfx-promotions__kpi-lbl">
              {translateLabel(kpi.label)}
            </p>
          </motion.article>
        ))}
      </div>

      {/* ── Table Card ───────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ease: APPLE, duration: 0.5, duration: 0.5, delay: 0.3 }}
        className="sfx-card sfx-card--featured-dashboard"
      >
        <header className="sfx-card__head sfx-card__head--dashboard">
          <div>
            <h3 className="sfx-card__title sfx-card__title--dashboard">
              {translateLabel("All Promotions")}
            </h3>
            <p className="sfx-muted sfx-card__subtitle--dashboard">
              {filtered.length} {translateLabel("promotion")}{filtered.length !== 1 ? 's' : ''}
            </p>
          </div>
          <SearchField value={search} onChange={setSearch} placeholder={translateLabel("Search promotions…")} />
        </header>

        {filtered.length === 0 ? (
          <EmptyState
            icon="search"
            title={translateLabel("No promotions found")}
            hint={search ? "Try different search terms" : "Click + New Promotion to create one"}
          />
        ) : (
          <div className="sfx-table-wrap">
            <table className="sfx-table sfx-table--hover sfx-promotions__table-bg">
              <thead>
                <tr className="sfx-promotions__tr-head-bg">
                  <th className="sfx-promotions__th">
                    {translateLabel("Promotion")}
                  </th>
                  <th className="sfx-promotions__th">
                    {translateLabel("Code")}
                  </th>
                  <th className="sfx-promotions__th">
                    {translateLabel("Discount")}
                  </th>
                  <th className="sfx-promotions__th">
                    {translateLabel("Scope")}
                  </th>
                  <th className="sfx-promotions__th">
                    {translateLabel("Validity")}
                  </th>
                  <th className="sfx-promotions__th">
                    {translateLabel("Status")}
                  </th>
                  <th className="sfx-promotions__th sfx-promotions__th--right">
                    {translateLabel("Actions")}
                  </th>
                </tr>
              </thead>
              <AnimatePresence mode="popLayout">
                <motion.tbody variants={listContainerVariants} initial="hidden" animate="visible">
                  {filtered.map((p, idx) => (
                    <motion.tr
                      // One promotion can have several codes (e.g. NEWMEM50 + WELCOME50),
                      // so the API returns one row per code with the same promotion_id.
                      key={`${p.promotion_id}-${p.promo_code ?? p.code ?? idx}`}
                      custom={idx}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      layout
                      className="sfx-promotions__tr"
                    >
                      {/* Name + Description */}
                      <td className="sfx-promotions__td">
                        <div className="sfx-promotions__td-title">
                          {translateLabel(p.promotion_name)}
                        </div>
                        {p.description && (
                          <div className="sfx-promotions__td-sub">
                            {translateLabel(p.description)}
                          </div>
                        )}
                      </td>

                      {/* Promo Code */}
                      <td className="sfx-promotions__td">
                        <button
                          onClick={() => copyCode(p.promo_code)}
                          className="sfx-promotions__code-btn"
                          title={translateLabel("Click to copy")}
                        >
                          <Copy size={12} /> {p.promo_code}
                        </button>
                      </td>

                      {/* Discount */}
                      <td className="sfx-promotions__td">
                        <span className="sfx-promotions__td-price">
                          {fmtDiscount(p.discount_type, p.discount_value)}
                        </span>
                        {p.max_discount_amount > 0 && (
                          <div className="sfx-promotions__td-price-sub">
                            {translateLabel("Max:")} {Number(p.max_discount_amount).toLocaleString('vi-VN')}₫
                          </div>
                        )}
                      </td>

                      {/* Scope */}
                      <td style={{ padding: '16px' }}>
                        <ScopeBadge scope={p.applicable_to} />
                      </td>

                      {/* Validity */}
                      <td className="sfx-promotions__td">
                        <div className="sfx-promotions__td-flex-gap">
                          <Clock size={12} color="#999" />
                          <span>{safeFmt(p.valid_from)}</span>
                        </div>
                        <div className="sfx-promotions__td-sub-info">
                          → {safeFmt(p.valid_until)}
                        </div>
                        {p.usage_limit && (
                          <div className="sfx-promotions__td-sub-extra">
                            <Users size={10} /> {p.times_used || 0}/{p.usage_limit} {translateLabel("used")}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="sfx-promotions__td">
                        <motion.button
                           onClick={() => handleToggleStatus(p.promotion_id)}
                           className="sfx-promotions__btn-plain"
                           whileTap={{ scale: 0.92 }}
                           title={translateLabel(p.is_active ? 'Click to pause' : 'Click to activate')}
                        >
                          <StatusPill isActive={p.is_active} />
                        </motion.button>
                      </td>

                      {/* Actions */}
                      <td className="sfx-promotions__td sfx-promotions__th--right">
                        <div className="sfx-promotions__actions-flex">
                          {[
                            { icon: Edit2, tip: 'Edit', color: '#6366F1', onClick: () => handleEdit(p) },
                            { icon: Trash2, tip: 'Delete', color: '#EF4444', onClick: () => handleDelete(p.promotion_id) },
                          ].map(({ icon: BtnIcon, tip, color, onClick }, ai) => (
                            <motion.button
                              key={ai}
                              onClick={onClick}
                              disabled={tip === "Edit" && !p.promo_code_id}
                              whileHover={{ scale: 1.12, backgroundColor: `${color}10` }}
                              whileTap={{ scale: 0.9 }}
                              title={translateLabel(tip)}
                              style={{ color }}
                              className="sfx-promotions__action-btn"
                            >
                              <BtnIcon size={15} />
                            </motion.button>
                          ))}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </AnimatePresence>
            </table>
          </div>
        )}
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/*  Create / Edit Modal                                              */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {showAddModal && (
        <ManagerModal
          onClose={resetForm}
          footer={null}
          title={editingPromoId ? "Edit Promotion" : "Create Promotion"}
        >
          <form id="addPromoForm" onSubmit={handleSubmit} className="space-y-4 p-1">
            <div>
              <label className="block text-sm font-semibold text-[var(--sfx-text)] mb-1.5">{translateLabel("Promotion Name *")}</label>
              <input
                type="text"
                required
                className="sfx-input"
                value={formData.promotion_name}
                onChange={e => setFormData({ ...formData, promotion_name: e.target.value })}
                placeholder={translateLabel("e.g. Summer Sale 2026")}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--sfx-text)] mb-1.5">{translateLabel("Description")}</label>
              <textarea
                className="sfx-input min-h-[80px]"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder={translateLabel("Brief description of the promotion")}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--sfx-text)] mb-1.5">{translateLabel("Promo Code")} <span style={{ color: "#ef4444" }}>*</span></label>
              <input
                type="text"
                required
                className="sfx-input"
                value={formData.promo_code}
                onChange={e => setFormData({ ...formData, promo_code: e.target.value.toUpperCase() })}
                placeholder={translateLabel("e.g. SUMMER20")}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[var(--sfx-text)] mb-1.5">{translateLabel("Type *")}</label>
                <select
                  className="sfx-select w-full"
                  value={formData.discount_type}
                  onChange={e => setFormData({ ...formData, discount_type: e.target.value })}
                >
                  <option value="PERCENT">{translateLabel("Percentage (%)")}</option>
                  <option value="FIXED">{translateLabel("Fixed Amount (₫)")}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--sfx-text)] mb-1.5">{translateLabel("Value *")}</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  className="sfx-input"
                  value={formData.discount_value}
                  onChange={e => setFormData({ ...formData, discount_value: e.target.value })}
                  placeholder={translateLabel(formData.discount_type === 'PERCENT' ? "e.g. 15" : "e.g. 50000")}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {formData.discount_type === 'PERCENT' && (
                <div>
                  <label className="block text-sm font-semibold text-[var(--sfx-text)] mb-1.5">{translateLabel("Max Discount (₫)")}</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="sfx-input"
                    value={formData.max_discount_amount}
                    onChange={e => setFormData({ ...formData, max_discount_amount: e.target.value })}
                    placeholder={translateLabel("e.g. 100000")}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-[var(--sfx-text)] mb-1.5">{translateLabel("Min Order Value (₫)")}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="sfx-input"
                  value={formData.min_order_value}
                  onChange={e => setFormData({ ...formData, min_order_value: e.target.value })}
                  placeholder={translateLabel("e.g. 200000")}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                ["valid_from", "from_time", "Valid From *"],
                ["valid_until", "until_time", "Valid Until *"],
              ].map(([dateKey, timeKey, label]) => (
                <fieldset key={dateKey} className="min-w-0">
                  <legend className="block text-sm font-semibold mb-1.5">{translateLabel(label)}</legend>
                  <input type="date" required className="sfx-input" aria-label={translateLabel(label)}
                    value={formData[dateKey]} min={dateKey === "valid_until" ? formData.valid_from : undefined}
                    onChange={e => setFormData({ ...formData, [dateKey]: e.target.value })} />
                  <input type="time" required className="sfx-input mt-2"
                    aria-label={language === "vi" ? (timeKey === "from_time" ? "Giờ bắt đầu" : "Giờ kết thúc") : (timeKey === "from_time" ? "Start time" : "End time")}
                    value={formData[timeKey]} onChange={e => setFormData({ ...formData, [timeKey]: e.target.value })} />
                </fieldset>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[var(--sfx-text)] mb-1.5">{translateLabel("Usage Limit (Total uses)")}</label>
                <input
                  type="number"
                  min="1"
                  className="sfx-input"
                  value={formData.usage_limit}
                  onChange={e => setFormData({ ...formData, usage_limit: e.target.value })}
                  placeholder={translateLabel("Empty = unlimited")}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[var(--sfx-text)] mb-1.5">{translateLabel("Applicable To *")}</label>
                <select
                  className="sfx-select w-full"
                  value={formData.applicable_to}
                  onChange={e => setFormData({ ...formData, applicable_to: e.target.value })}
                >
                  <option value="Both">{translateLabel("Both (Reservation & Order)")}</option>
                  <option value="Reservation">{translateLabel("Reservation Only")}</option>
                  <option value="Order">{translateLabel("Order Only")}</option>
                </select>
              </div>
            </div>

            {/* Loyalty Exchange Panel */}
            <div className="sfx-promotions__loyalty-panel">
              <div className="sfx-promotions__loyalty-title">
                <Star size={14} fill="#D97706" color="#D97706" /> {translateLabel("Loyalty Exchange Settings")}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-[var(--sfx-text)] mb-1.5">{translateLabel("Points Required")}</label>
                  <input type="number" min="0" step="1" className="sfx-input" style={{ width: "100%" }}
                    value={formData.points_required}
                    onChange={e => setFormData({ ...formData, points_required: e.target.value })}
                    placeholder={translateLabel("0 = free gift")} />
                  <p className="sfx-promotions__loyalty-desc">{translateLabel("0 = auto-granted (welcome gift)")}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[var(--sfx-text)] mb-1.5">{translateLabel("Total Quantity")}</label>
                  <input type="number" min="1" step="1" className="sfx-input" style={{ width: "100%" }}
                    value={formData.total_quantity}
                    onChange={e => setFormData({ ...formData, total_quantity: e.target.value })}
                    placeholder={translateLabel("Empty = unlimited")} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[var(--sfx-text)] mb-1.5">{translateLabel("Promo Code Valid (hours)")}</label>
                  <input type="number" min="1" step="1" className="sfx-input" style={{ width: "100%" }}
                    value={formData.validity_duration_hours}
                    onChange={e => setFormData({ ...formData, validity_duration_hours: e.target.value })}
                    placeholder="24" />
                  <p className="sfx-promotions__loyalty-desc">{translateLabel("After customer redeems")}</p>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <Button variant="ghost" onClick={resetForm} disabled={submitting}>{translateLabel("Cancel")}</Button>
              <Button variant="primary" type="submit" disabled={submitting}>
                {translateLabel(submitting ? "Saving..." : editingPromoId ? "Update Promotion" : "Create Promotion")}
              </Button>
            </div>
          </form>
        </ManagerModal>
      )}
    </div>
  );
}

// touch30
// touch31 1794471634
// touch37
// touch38 1794472166
