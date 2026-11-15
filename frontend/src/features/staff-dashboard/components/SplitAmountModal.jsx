import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
import { useState, useEffect } from "react";
import { Button } from "./StaffUI.jsx";
import { splitBillByAmountApi, payBillSplitApi } from "../services/staffApi.js";
import "../styles/staff-order-tab.css";

const fmt = (n) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(n) || 0);

function evenSplit(total, count) {
  const base = Math.floor(total / count);
  const arr = Array.from({ length: count }, () => base);
  arr[count - 1] += total - base * count;
  return arr;
}

export function SplitAmountModal({ isOpen, onClose, bill, userId, toast, onSplitSuccess }) {
  const { translateLabel } = useLanguage();
  const total = Math.round(Number(bill?.total_amount) || 0);
  const [count, setCount] = useState(2);
  const [amounts, setAmounts] = useState([]);
  const [created, setCreated] = useState(null); // splits returned by the API
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCreated(null);
      setCount(2);
      setAmounts(evenSplit(total, 2));
    }
  }, [isOpen, total]);

  if (!isOpen || !bill) return null;

  const changeCount = (n) => {
    const c = Math.min(10, Math.max(2, n));
    setCount(c);
    setAmounts(evenSplit(total, c));
  };
  const sum = amounts.reduce((s, a) => s + (Number(a) || 0), 0);
  const diff = total - sum;

  const handleCreate = async () => {
    setBusy(true);
    try {
      const res = await splitBillByAmountApi(
        bill.order_id,
        userId,
        amounts.map((a, i) => ({ name: `${translateLabel("Guest")} ${i + 1}`, amount: Number(a) }))
      );
      setCreated(res?.data?.splits || []);
      toast(translateLabel("Bill split created. Collect each share below."), "success");
    } catch (e) {
      toast(e.message || "Failed to split bill.", "error");
    } finally {
      setBusy(false);
    }
  };

  const handlePay = async (split) => {
    setBusy(true);
    try {
      await payBillSplitApi(split.split_id, userId);
      setCreated((prev) => prev.map((s) => (s.split_id === split.split_id ? { ...s, payment_status: "Paid" } : s)));
      onSplitSuccess?.();
    } catch (e) {
      toast(e.message || "Failed to record payment.", "error");
    } finally {
      setBusy(false);
    }
  };

  const allPaid = created && created.length > 0 && created.every((s) => s.payment_status === "Paid");

  return (
    <div className="staff-order-modal" role="dialog" aria-modal="true">
      <div className="staff-order-modal__backdrop" onClick={onClose} aria-hidden="true" />
      <div className="staff-order-modal__panel" style={{ maxWidth: "500px" }}>
        <header className="staff-order-modal__head">
          <h2>{translateLabel("Split by Amount")}</h2>
          <button type="button" className="staff-order-modal__close" onClick={onClose} aria-label={translateLabel("Close")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </header>
        <div className="staff-order-modal__body">
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, marginBottom: "1rem" }}>
            <span>{translateLabel("Total Amount")}</span><span>{fmt(total)}</span>
          </div>

          {!created ? (
            <>
              <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                <span>{translateLabel("Number of guests")}</span>
                <Button variant="ghost" onClick={() => changeCount(count - 1)} disabled={count <= 2}>-</Button>
                <strong>{count}</strong>
                <Button variant="ghost" onClick={() => changeCount(count + 1)} disabled={count >= 10}>+</Button>
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "260px", overflowY: "auto" }}>
                {amounts.map((a, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span style={{ width: "5rem" }}>{translateLabel("Guest")} {i + 1}</span>
                    <input
                      type="number" min="1" step="1" value={a}
                      onChange={(e) => setAmounts((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
                      style={{ flex: 1, padding: "0.4rem 0.6rem", border: "1px solid #d4d4d8", borderRadius: "6px" }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: "1rem", color: diff === 0 ? "#2f7d4f" : "#b3261e", fontWeight: 600 }}>
                {diff === 0 ? translateLabel("Shares add up to the total.") : `${translateLabel("Difference")}: ${fmt(diff)}`}
              </div>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {created.map((s) => (
                <div key={s.split_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem", background: "#f5f5f5", borderRadius: "6px" }}>
                  <span>{s.split_name} — <strong>{fmt(s.split_amount)}</strong></span>
                  {s.payment_status === "Paid"
                    ? <span style={{ color: "#2f7d4f", fontWeight: 600 }}>{translateLabel("Paid")}</span>
                    : <Button variant="primary" onClick={() => handlePay(s)} disabled={busy}>{translateLabel("Mark as paid")}</Button>}
                </div>
              ))}
              {allPaid ? <p style={{ color: "#2f7d4f", marginTop: "0.75rem" }}>{translateLabel("All shares collected. Close this window and confirm payment to release the table.")}</p> : null}
            </div>
          )}
        </div>
        <footer className="staff-order-modal__foot">
          <Button variant="ghost" onClick={onClose} disabled={busy}>{translateLabel(created ? "Close" : "Cancel")}</Button>
          {!created ? (
            <Button variant="primary" onClick={handleCreate} disabled={busy || diff !== 0 || amounts.some((a) => !(Number(a) > 0))}>
              {translateLabel("Create split")}
            </Button>
          ) : null}
        </footer>
      </div>
    </div>
  );
}
