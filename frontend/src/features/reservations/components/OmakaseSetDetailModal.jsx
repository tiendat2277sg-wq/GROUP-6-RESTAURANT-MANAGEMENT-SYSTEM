import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "@/core/i18n/LanguageProvider.jsx";
import { formatVND } from "@/core/utils/formatCurrency.js";
import { courseDetails, courseImage, setMenus } from "@/features/menu/data/omakaseMenus.js";

function safeCourseImage(name) {
  try {
    return courseDetails[name] ? courseImage(name) : null;
  } catch {
    return null;
  }
}

/** Course-by-course view of an Omakase / Chef's set: picture + description for every course. */
export default function OmakaseSetDetailModal({ dish, quantity = 0, onAdd, onClose }) {
  const { translateLabel } = useLanguage();
  const courses = (dish && setMenus[dish.setId]) || [];
  const isHighlights = dish?.setKind === "chefs-set-menu";
  const isAvailable = dish?.is_available !== false;

  useEffect(() => {
    if (!dish) return undefined;
    const onKey = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dish, onClose]);

  if (!dish || courses.length === 0) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={dish.dish_name}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 100000000, background: "rgba(6,5,4,0.82)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
    >
      <div style={{ width: "760px", maxWidth: "100%", maxHeight: "92vh", display: "flex", flexDirection: "column", borderRadius: "24px", border: "1px solid rgba(255,255,255,0.16)", background: "rgba(26,23,20,0.97)", boxShadow: "0 24px 70px rgba(0,0,0,0.6)", overflow: "hidden", color: "#fff" }}>
        <header style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.12)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 700 }}>{translateLabel(dish.dish_name)}</h2>
            <p style={{ margin: "6px 0 0", color: "var(--rzv-gold, #ffd064)", fontWeight: 700 }}>
              {formatVND(dish.price)}
              <span style={{ marginLeft: "10px", color: "rgba(255,255,255,0.55)", fontWeight: 400, fontSize: "0.9rem" }}>
                · {courses.length} {translateLabel(isHighlights ? "highlights" : "courses")}
              </span>
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label={translateLabel("Close")} style={{ color: "#fff", fontSize: "26px", lineHeight: 1, border: "none", background: "none", cursor: "pointer" }}>×</button>
        </header>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 24px" }}>
          {courses.map((name, index) => {
            const detail = courseDetails[name];
            const src = safeCourseImage(name);
            return (
              <div key={`${name}-${index}`} style={{ display: "flex", gap: "16px", padding: "16px 0", borderBottom: index === courses.length - 1 ? "none" : "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ width: "132px", height: "132px", flex: "0 0 132px", borderRadius: "14px", overflow: "hidden", background: "rgba(0,0,0,0.3)" }}>
                  {src && <img src={src} alt={translateLabel(name)} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <small style={{ color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    {translateLabel(isHighlights ? "Highlight" : "Course")} {index + 1}
                  </small>
                  <h3 style={{ margin: "4px 0 6px", fontSize: "1.1rem", fontWeight: 600 }}>{translateLabel(name)}</h3>
                  {detail?.description && (
                    <p style={{ margin: 0, color: "rgba(255,255,255,0.72)", lineHeight: 1.55, fontSize: "0.92rem" }}>{translateLabel(detail.description)}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <footer style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.12)", display: "flex", justifyContent: "flex-end", gap: "12px", alignItems: "center" }}>
          {quantity > 0 && (
            <span style={{ marginRight: "auto", color: "rgba(255,255,255,0.6)", fontSize: "0.9rem" }}>{translateLabel("Selected")}: <strong style={{ color: "#fff" }}>{quantity}</strong></span>
          )}
          <button type="button" onClick={onClose} className="rd-btn-outline" style={{ padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: 600, margin: 0 }}>{translateLabel("Close")}</button>
          <button
            type="button"
            disabled={!isAvailable}
            onClick={() => { onAdd(dish); onClose(); }}
            style={{ padding: "10px 22px", borderRadius: "8px", border: "none", fontWeight: 600, margin: 0, background: isAvailable ? "#fff" : "rgba(255,255,255,0.1)", color: isAvailable ? "#16120f" : "rgba(255,255,255,0.4)", cursor: isAvailable ? "pointer" : "not-allowed" }}
          >
            {translateLabel(isAvailable ? "Add this set to pre-order" : "Sold Out")}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
