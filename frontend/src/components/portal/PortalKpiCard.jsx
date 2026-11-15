import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
/**
 * PortalKpiCard — Shared KPI card component used by Manager, Staff, and Admin portals.
 * Accepts an accent color variant via `card.accent` prop: "blue" | "green" | "amber" | "red" | "purple"
 *
 * Moved from: features/manager-dashboard/components/KpiCard.jsx
 * Usage: import PortalKpiCard from '@/components/portal/PortalKpiCard';
 */
import { useEffect, useRef, useState } from "react";
import PortalIcon from "./PortalIcon.jsx";
import { formatVND } from "@/core/utils/formatCurrency.js";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function useCountUp(target, active) {
  const [val, setVal] = useState(active ? 0 : target);
  const raf = useRef(0);
  useEffect(() => {
    if (!active || typeof target !== "number") {
      setVal(target);
      return undefined;
    }
    if (prefersReducedMotion()) {
      setVal(target);
      return undefined;
    }
    const start = performance.now();
    const dur = 900;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(target * eased);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, active]);
  return val;
}

/**
 * card shape:
 * {
 *   label:   string,                            // card title
 *   value:   number | string,                  // raw value
 *   format:  "currency" | "number" | "text",   // display format
 *   suffix:  string?,                           // appended after value
 *   icon:    string,                            // PortalIcon name
 *   accent:  "blue" | "green" | "amber" | "red" | "purple", // top border colour
 *   trend:   { dir: "up"|"down"|"flat", text: string }?,
 * }
 */
// Translate KPI hints coming from the API, including ones with numbers inside:
// "12% vs yesterday" is looked up as "{n}% vs yesterday" and the number is put back.
function translateHint(text, translateLabel) {
  if (typeof text !== "string") return text;
  const direct = translateLabel(text);
  if (direct !== text) return direct;
  const nums = [];
  const template = text.replace(/[+-]?\d[\d.,]*/g, (m) => { nums.push(m); return "{n}"; });
  if (!nums.length) return text;
  const translated = translateLabel(template);
  if (translated === template) return text;
  let i = 0;
  return translated.replace(/\{n\}/g, () => nums[i++] ?? "");
}

function PortalKpiCard({ card, index = 0 }) {
  const { translateLabel } = useLanguage();
  const isNumeric = card.format === "currency" || card.format === "number";
  const animated = useCountUp(isNumeric ? card.value : card.value, isNumeric);

  let display;
  if (card.format === "currency") display = formatVND(Math.round(animated));
  else if (card.format === "number") display = Math.round(animated).toLocaleString("en-US");
  else display = card.value;

  return (
    <article
      className={`sfx-kpi sfx-kpi--${card.accent || "blue"}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="sfx-kpi__top">
        <span className="sfx-kpi__icon">
          <PortalIcon name={card.icon} size={18} />
        </span>
        {card.trend ? (
          <span className={`sfx-kpi__trend sfx-kpi__trend--${card.trend.dir}`}>
            {card.trend.dir !== "flat" ? (
              <PortalIcon name={card.trend.dir === "up" ? "arrowUp" : "arrowDown"} size={13} />
            ) : null}
            {translateHint(card.trend.text, translateLabel)}
          </span>
        ) : null}
      </div>
      <p className="sfx-kpi__value">
        {display}
        {card.suffix ? <span className="sfx-kpi__suffix">{card.suffix}</span> : null}
      </p>
      <p className="sfx-kpi__label">{translateLabel(card.label)}</p>
    </article>
  );
}

export default PortalKpiCard;
