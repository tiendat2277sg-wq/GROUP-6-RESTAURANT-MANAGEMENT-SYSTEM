import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
import { useState, useEffect } from "react";
import PreorderDashboardModal from "./PreorderDashboardModal.jsx";
import { formatVND } from "@/core/utils/formatCurrency.js";
import { apiPost } from "@/core/api/httpClient";
function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(timeStr) {
  if (!timeStr) return "—";
  const [h, m] = timeStr.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function getAreaFromTable(tableLabel) {
  if (!tableLabel) return "—";
  const prefix = String(tableLabel).trim().charAt(0).toUpperCase();
  switch (prefix) {
    case 'W': return "Window";
    case 'B': return "Bar";
    case 'K': return "Kitchen View";
    case 'V': return "VIP Lounge";
    case 'P': return "Private Room";
    case 'T': return "Main Dining";
    case 'O': return "Outdoor";
    case 'S': return "Standard";
    default: return "Standard";
  }
}

function getTableAreaSurcharge(areaName, capacity) {
  const rates = {
    'Premium Area': { 2: 30000, 4: 50000, 6: 80000, 8: 120000 },
    'Private Room': { 2: 50000, 4: 100000, 6: 150000, 8: 200000 },
    'VIP Lounge': { 2: 50000, 4: 100000, 6: 150000, 8: 200000 },
  };
  const tier = Number(capacity) >= 8 ? 8 : Number(capacity) >= 6 ? 6 : Number(capacity) >= 4 ? 4 : 2;
  return rates[String(areaName || '').trim()]?.[tier] || 0;
}

/**
 * Final review of the booking before the guest confirms.
 */
function ReservationSummary({
  form,
  setField,
  selectedTables,
  tableAssignmentInfo,
  error,
  submitting,
  canSubmit,
  onSubmit,
  onEditDetails,
  preorderItems,
  setPreorderItems,
  preorderTotal,
  setPreorderTotal,
  promoCode,
  setPromoCode,
  promoDiscount,
  setPromoDiscount,
  currentUser,
}) {
  const { translateLabel } = useLanguage();
  const [showPreorder, setShowPreorder] = useState(false);
  const [voucherInput, setVoucherInput] = useState("");
  const [promoError, setPromoError] = useState("");

  // Clear promo code if preorderTotal becomes 0
  useEffect(() => {
    if (preorderTotal === 0 && promoCode) {
      setPromoCode("");
      setPromoDiscount(null);
    }
  }, [preorderTotal, promoCode, setPromoCode, setPromoDiscount]);

  // Automatically revalidate/update discount when preorder food total changes
  useEffect(() => {
    if (!promoCode || preorderTotal === 0) return;

    const reapplyVoucher = async () => {
      try {
        const res = await apiPost("/promotions/apply", {
          promo_code: promoCode,
          cart_total: preorderTotal
        });
        if (res?.success) {
          setPromoDiscount({
            discount_amount: res.discount_amount,
            promotion_name: res.promotion_name,
            description: `Discount applied to food preorder`
          });
          setPromoError("");
        }
      } catch (err) {
        // If no longer valid, clear it
        setPromoCode("");
        setPromoDiscount(null);
        setPromoError(err.response?.data?.message || err.message || "Promo code is no longer valid for this total.");
      }
    };

    reapplyVoucher();
  }, [preorderTotal, promoCode, setPromoCode, setPromoDiscount]);

  const applyVoucherByCode = async (code) => {
    if (!code || preorderTotal === 0) return;
    setPromoError("");
    try {
      const res = await apiPost("/promotions/apply", {
        promo_code: code,
        cart_total: preorderTotal
      });
      if (res?.success) {
        setPromoCode(code);
        setVoucherInput("");
        setPromoDiscount({
          discount_amount: res.discount_amount,
          promotion_name: res.promotion_name,
          description: `Discount applied to food preorder`
        });
        setPromoError("");
      }
    } catch (err) {
      setPromoError(err.response?.data?.message || err.message || "Invalid promo code");
      setPromoDiscount(null);
    }
  };

  const handleRemovePromo = () => {
    setPromoCode("");
    setPromoDiscount(null);
    setPromoError("");
  };

  const totalCapacity = selectedTables.reduce((sum, t) => sum + Number(t.capacity), 0);
  const totalAreaSurcharge = selectedTables.reduce((sum, table) => sum + getTableAreaSurcharge(table.area_name, table.capacity), 0);
  const tableLabels = selectedTables.length > 0
    ? selectedTables.map((t) => t.display_label || t.table_number).join(", ")
    : "Not selected";

  const areaLabels = selectedTables.length > 0
    ? Array.from(new Set(selectedTables.map((t) => t.area_name || getAreaFromTable(t.display_label || t.table_number)))).join(", ")
    : "—";
  const isPreferredAssignment =
    String(tableAssignmentInfo?.status || "").toLowerCase() === "preferred";

  // Omakase counters: fixed 2h30 seating, no custom duration.
  const omakaseSeating = selectedTables.length > 0 && selectedTables.every((t) => /omakase/i.test(String(t.area_name || "")));
  const omakaseEndLabel = (() => {
    if (!omakaseSeating || !form.time) return "";
    const [hh, mm] = String(form.time).split(":").map(Number);
    const total = hh * 60 + mm + 150;
    return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  })();

  let holdExpiresAt = "—";
  if (form.date && form.time) {
    const [y, m, d] = form.date.split("-").map(Number);
    const [hh, mm] = form.time.split(":").map(Number);
    const expireDate = new Date(y, m - 1, d, hh, mm + form.holdDurationMinutes);
    holdExpiresAt = formatTime(`${expireDate.getHours()}:${expireDate.getMinutes()}`);
  }

  const showVatWarning =
    form.holdDurationMinutes === 45 || form.holdDurationMinutes === 60;

  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth <= 768 : false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isAnyModalOpen = showPreorder;

  return (
    <div className={`rd-card ${isAnyModalOpen ? 'rd-card--blur' : ''}`}>
      {/* Back button */}
      <div style={{ marginBottom: "1.5rem", borderBottom: "1px solid rgba(255, 255, 255, 0.12)", paddingBottom: "1rem" }}>
        <button type="button" className="rzv-backlink" onClick={onEditDetails} style={{ color: "#fff", display: "flex", alignItems: "center", gap: "6px" }}>
          {translateLabel("← Back to details")}
        </button>
      </div>

      <div style={{ marginBottom: "1.5rem", borderBottom: "1px solid rgba(255, 255, 255, 0.12)", paddingBottom: "1rem" }}>
        <h2 className="rd-card-title" style={{ fontSize: "22px", fontWeight: 700 }}>{translateLabel("Reservation summary")}</h2>
        <p className="rd-card-subtitle" style={{ fontSize: "14px", margin: "4px 0 0" }}>{translateLabel("Review your details before confirming.")}</p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1px 1fr",
          gap: isMobile ? "1.5rem" : "3rem",
          alignItems: "stretch",
        }}
      >
        {/* LEFT COLUMN: Booking Details & Notes */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: "#ffffff", marginBottom: "0.5rem" }}>{translateLabel("Booking Details")}</h3>
            <div className="rzv-summary__grid" style={{ display: "flex", flexDirection: "column", gap: "0px" }}>
              <div className="rzv-summary__row">
                <span className="rzv-summary__label">{translateLabel("Date")}</span>
                <span className="rzv-summary__value">{formatDate(form.date)}</span>
              </div>
              <div className="rzv-summary__row">
                <span className="rzv-summary__label">{translateLabel("Time")}</span>
                <span className="rzv-summary__value">{formatTime(form.time)}</span>
              </div>
              {omakaseSeating && (
                <div className="rzv-summary__row">
                  <span className="rzv-summary__label">{translateLabel("Omakase seating")}</span>
                  <span className="rzv-summary__value">{translateLabel("2 hours 30 minutes per seating")} · {omakaseEndLabel}</span>
                </div>
              )}
              {omakaseSeating && (
                <p style={{ margin: "6px 0 10px", fontSize: "0.85rem", color: "#e8c98a" }}>
                  {translateLabel("Omakase seating is limited to 2 hours 30 minutes. Staying longer incurs a 20% overtime penalty on the whole bill.")}
                </p>
              )}
              <div className="rzv-summary__row">
                <span className="rzv-summary__label">{translateLabel("Guests")}</span>
                <span className="rzv-summary__value">{form.guestCount}</span>
              </div>
              <div className="rzv-summary__row">
                <span className="rzv-summary__label">{translateLabel("Dining Purpose")}</span>
                <span className="rzv-summary__value">{form.diningPurpose || "—"}</span>
              </div>
              <div className="rzv-summary__row">
                <span className="rzv-summary__label">{translateLabel("Hold Duration")}</span>
                <span className="rzv-summary__value">{form.holdDurationMinutes} {translateLabel("minutes")}</span>
              </div>
              <div className="rzv-summary__row">
                <span className="rzv-summary__label">{translateLabel("Hold expires at")}</span>
                <span className="rzv-summary__value">{holdExpiresAt}</span>
              </div>
              <div className="rzv-summary__row">
                <span className="rzv-summary__label">{translateLabel("Area")}</span>
                <span className="rzv-summary__value">{areaLabels}</span>
              </div>
              <div className="rzv-summary__row">
                <span className="rzv-summary__label">{translateLabel("Table")}</span>
                <span className="rzv-summary__value">
                  {tableLabels}
                  {selectedTables.length > 0 ? ` · ${totalCapacity} ${translateLabel("seats")}` : ""}
                </span>
              </div>
              {selectedTables.length > 0 ? (
                <div
                  style={{
                    marginTop: "10px",
                    padding: "10px 12px",
                    borderRadius: "0.75rem",
                    border: isPreferredAssignment
                      ? "1px solid rgba(250, 204, 21, 0.32)"
                      : "1px solid rgba(16, 185, 129, 0.28)",
                    background: isPreferredAssignment
                      ? "rgba(250, 204, 21, 0.09)"
                      : "rgba(16, 185, 129, 0.08)",
                    color: "rgba(255, 255, 255, 0.78)",
                    fontSize: "0.82rem",
                    lineHeight: 1.45,
                  }}
                >
                  <strong style={{ color: "#fff" }}>
                    {translateLabel(isPreferredAssignment ? "Preferred table" : "Confirmed table")}
                  </strong>
                  <span>
                    {" · "}
                    {translateLabel(isPreferredAssignment
                      ? `Your selected table is recorded as a preference. Staff confirms the final table within ${tableAssignmentInfo?.confirmedWindowHours || 3} hours of arrival.`
                      : "This table is inside the near-term booking window and is confirmed for your arrival.")}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Notes Section */}
          <div className="rd-field" style={{ margin: 0 }}>
            <label htmlFor="rzv-notes" style={{ fontWeight: 600, fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.5)", marginBottom: "6px", display: "block" }}>{translateLabel("SPECIAL REQUESTS / NOTES")}</label>
            <textarea
              id="rzv-notes"
              placeholder={translateLabel("Any allergies, special occasions, or other requests?")}
              rows={3}
              value={form.notes || ""}
              onChange={(e) => setField("notes", e.target.value)}
              className="rd-datepicker-input"
              style={{ width: "100%", padding: "0.85rem", borderRadius: "0.75rem", border: "1px solid rgba(255, 255, 255, 0.16)", background: "rgba(0, 0, 0, 0.2)", fontSize: "0.95rem", color: "#fff", resize: "none" }}
            />
          </div>
        </div>

        {/* DIVIDER LINE */}
        {!isMobile && <div style={{ width: "1px", backgroundColor: "rgba(255, 255, 255, 0.12)" }} />}

        {/* RIGHT COLUMN: Pre-order + Promo + Payment Details + Warnings + Action Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: "#ffffff", marginBottom: "0.75rem" }}>{translateLabel("Pre-orders & Promotions")}</h3>
            
            {/* Pre-order Section */}
            <div style={{ marginBottom: "0.75rem" }}>
              <button
                type="button"
                style={{ width: "100%", padding: "12px", background: "rgba(255, 255, 255, 0.08)", color: "#fff", border: "1px solid rgba(255, 255, 255, 0.16)", borderRadius: "0.75rem", cursor: "pointer", fontSize: "13px", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", transition: "all 0.2s" }}
                onClick={() => setShowPreorder(true)}
                onMouseOver={(e) => e.target.style.background = "rgba(255, 255, 255, 0.15)"}
                onMouseOut={(e) => e.target.style.background = "rgba(255, 255, 255, 0.08)"}
              >
                {Object.keys(preorderItems || {}).length > 0 ? "Edit Pre-order" : "ADD PRE-ORDER (OPTIONAL)"}
              </button>
              
              {/* Display selected preorder items */}
              {Object.keys(preorderItems || {}).length > 0 && (
                <div style={{ marginTop: "10px", background: "rgba(255, 255, 255, 0.04)", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <h4 style={{ margin: "0 0 6px 0", fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.5)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{translateLabel("Selected Items")}</h4>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {Object.values(preorderItems).map((item) => (
                      <li key={item.dish_id} style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "0.9rem" }}>
                        <span>{translateLabel(item.name)} <strong style={{ color: "var(--rzv-gold)" }}>x{item.quantity}</strong></span>
                        <span style={{ color: "rgba(255, 255, 255, 0.7)" }}>{formatVND(item.price * item.quantity)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <PreorderDashboardModal
                isOpen={showPreorder}
                onClose={() => setShowPreorder(false)}
                preorderItems={preorderItems}
                tables={selectedTables}
                allowOmakaseSet
                onSave={(newItems) => {
                  setPreorderItems(newItems);
                  const total = Object.values(newItems).reduce((sum, i) => sum + (i.price * i.quantity), 0);
                  setPreorderTotal(total);
                }}
                currentUser={currentUser}
              />
            </div>

            {/* Promo Section */}
            <div style={{ marginBottom: "0.5rem" }}>
              {preorderTotal === 0 ? (
                <div style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px dashed rgba(255, 255, 255, 0.2)", borderRadius: "0.75rem", padding: "1rem", textAlign: "center", color: "rgba(255, 255, 255, 0.5)", fontSize: "0.9rem" }}>
                  {translateLabel("Pre-order food items to unlock voucher promotions.")}
                </div>
              ) : (
                <div style={{ border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "0.75rem", overflow: "hidden" }}>
                  {!promoCode ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const code = voucherInput.trim().toUpperCase();
                        if (code) applyVoucherByCode(code);
                      }}
                      style={{ display: "flex", gap: "8px", padding: "12px 14px", background: "rgba(255, 255, 255, 0.05)" }}
                    >
                      <input
                        type="text"
                        value={voucherInput}
                        onChange={(e) => { setVoucherInput(e.target.value); if (promoError) setPromoError(""); }}
                        placeholder={translateLabel("Enter voucher code")}
                        aria-label={translateLabel("Enter voucher code")}
                        autoComplete="off"
                        spellCheck={false}
                        style={{ flex: 1, minWidth: 0, padding: "10px 12px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.2)", background: "rgba(0, 0, 0, 0.25)", color: "#fff", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.5px" }}
                      />
                      <button
                        type="submit"
                        disabled={!voucherInput.trim()}
                        style={{ padding: "10px 16px", borderRadius: "8px", border: "none", background: voucherInput.trim() ? "#ffd064" : "rgba(255, 255, 255, 0.15)", color: voucherInput.trim() ? "#1a1714" : "rgba(255, 255, 255, 0.5)", fontWeight: 700, fontSize: "0.85rem", cursor: voucherInput.trim() ? "pointer" : "not-allowed" }}
                      >
                        {translateLabel("Apply")}
                      </button>
                    </form>
                  ) : null}

                  {promoError && (
                    <div style={{ padding: "8px 14px", background: "rgba(239, 68, 68, 0.15)", borderTop: "1px solid rgba(239, 68, 68, 0.3)", color: "#ef4444", fontSize: "0.8rem" }}>
                      {promoError}
                    </div>
                  )}

                  {promoCode && (
                    <div style={{ padding: "10px 14px", background: "rgba(255, 255, 255, 0.02)", borderTop: "1px solid rgba(255, 255, 255, 0.12)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <strong style={{ color: "#10b981", fontSize: "0.85rem" }}>{promoCode} {translateLabel("Applied!")}</strong>
                        {promoDiscount && <div style={{ fontSize: "0.75rem", color: "#34d399" }}>{translateLabel(promoDiscount.promotion_name || promoDiscount.description)}</div>}
                      </div>
                      <button
                        type="button"
                        onClick={handleRemovePromo}
                        style={{ border: "none", background: "none", color: "#ef4444", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}
                      >
                        {translateLabel("Remove")}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Payment Section */}
          <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.12)", paddingTop: "1rem" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: "#ffffff", marginBottom: "0.75rem" }}>{translateLabel("Payment Details")}</h3>
            
            <div className="rzv-summary__row">
              <span className="rzv-summary__label">{translateLabel("Base Table Deposit (")}{selectedTables.length} {translateLabel("table")}{selectedTables.length !== 1 ? 's' : ''})</span>
              <span className="rzv-summary__value">{formatVND(20000 * selectedTables.length)}</span>
            </div>

            {preorderTotal > 0 && (
              <div className="rzv-summary__row">
                <span className="rzv-summary__label">{translateLabel("Pre-order Food Total")}</span>
                <span className="rzv-summary__value">{formatVND(preorderTotal)}</span>
              </div>
            )}

            {totalAreaSurcharge > 0 && (
              <div className="rzv-summary__row">
                <span className="rzv-summary__label">{translateLabel("Area surcharge (")}{selectedTables.length} {translateLabel("table")}{selectedTables.length !== 1 ? 's' : ''})</span>
                <span className="rzv-summary__value">{formatVND(totalAreaSurcharge)}</span>
              </div>
            )}

            {promoDiscount && (
              <div className="rzv-summary__row" style={{ color: "#10b981" }}>
                <span className="rzv-summary__label" style={{ color: "#10b981" }}>{translateLabel("Voucher Discount (")}{promoCode})</span>
                <span className="rzv-summary__value" style={{ fontWeight: 600 }}>-{formatVND(promoDiscount.discount_amount)}</span>
              </div>
            )}

            {(() => {
              const discountAmt = promoDiscount ? Number(promoDiscount.discount_amount) : 0;
              const foodTotal = Math.max(0, preorderTotal - discountAmt);
              const baseTableFee = 20000 * selectedTables.length;
              const netTotal = baseTableFee + totalAreaSurcharge + foodTotal;
              const depositRequired = Math.round(netTotal * 0.3);
              const remainingBalance = netTotal - depositRequired;

              return (
                <>
                  <div className="rzv-summary__row" style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.16)", padding: "8px 0", fontWeight: 600, fontSize: "1.05rem" }}>
                    <span className="rzv-summary__label" style={{ color: "#fff" }}>{translateLabel("Net Total")}</span>
                    <span className="rzv-summary__value" style={{ color: "#fff" }}>{formatVND(netTotal)}</span>
                  </div>

                  <div style={{ marginTop: "0.75rem", background: "rgba(255, 255, 255, 0.04)", padding: "1rem", borderRadius: "0.75rem", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <div className="rzv-summary__row" style={{ padding: "2px 0", fontWeight: 700, color: "var(--rzv-gold)" }}>
                      <span className="rzv-summary__label" style={{ fontSize: "0.95rem" }}>
                        {translateLabel("Required Deposit (30%)")}
                      </span>
                      <span className="rzv-summary__value" style={{ fontSize: "1.1rem" }}>{formatVND(depositRequired)}</span>
                    </div>
                    <div className="rzv-summary__row" style={{ padding: "2px 0", color: "rgba(255, 255, 255, 0.5)", fontSize: "0.9rem" }}>
                      <span className="rzv-summary__label">
                        {translateLabel("Remaining Balance (70%)")}
                      </span>
                      <span className="rzv-summary__value" style={{ fontWeight: 600 }}>{formatVND(remainingBalance)}</span>
                    </div>
                    <p style={{ margin: "6px 0 0 0", fontSize: "11px", color: "rgba(255, 255, 255, 0.4)", fontStyle: "italic", lineHeight: "1.4" }}>
                      {translateLabel("* The required deposit (30%) secures your table and pre-ordered items. The remaining balance (70%) is paid during checkout.")}
                    </p>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Error & Warnings */}
          {error ? <div className="rzv-error" style={{ margin: 0, padding: "10px", borderRadius: "8px", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#ef4444", fontSize: "0.85rem" }}>{error}</div> : null}

          {showVatWarning ? (
            <div className="rzv-alert rzv-alert--surcharge" role="status" style={{ margin: 0 }}>
              {translateLabel("Note: Reservations for 45 minutes to 2 hours are subject to an additional premium VAT/surcharge fee.")}
            </div>
          ) : null}

          {/* Action Buttons */}
          <div style={{ marginTop: "0.5rem", display: "flex", gap: "1rem" }}>
            <button
              type="button"
              className="rd-btn-outline"
              onClick={onEditDetails}
              style={{ flex: 1, margin: 0, padding: "12px", fontSize: "13px", fontWeight: 600, borderRadius: "0.75rem" }}
            >
              {translateLabel("EDIT DETAILS")}
            </button>
            <button
              type="button"
              className="rd-btn-primary"
              onClick={onSubmit}
              disabled={!canSubmit || submitting}
              style={{ flex: 2, margin: 0, padding: "12px", borderRadius: "0.75rem" }}
            >
              {translateLabel(submitting ? "PROCESSING..." : "CONFIRM RESERVATION")}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}

export default ReservationSummary;
