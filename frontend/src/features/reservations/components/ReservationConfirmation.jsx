import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ReservationConfirmation({ reservation, onBackHome, onViewReservations, onBookAnother }) {
  const { translateLabel } = useLanguage();
  if (!reservation) return null;

  const tables = reservation.tables || [];
  const isPending = reservation.reservation_status === "Pending";

  return (
    <div className="rzv-confirm">
      <div className="rzv-confirm__seal">✓</div>
      <h1 className="rzv-confirm__title rzv-serif">
        {translateLabel(isPending ? "Reservation Received" : "Table Reserved")}
      </h1>
      <p className="rzv-confirm__msg">
        {translateLabel(isPending
          ? "Your reservation request has been received. Our team will confirm it shortly — you will be notified once it is approved."
          : "Your table has been reserved. We look forward to welcoming you to FUKU.")}
      </p>

      <div className="rzv-confirm__card">
        <div className="rzv-summary__row">
          <span className="rzv-summary__label">{translateLabel("Reservation ID")}</span>
          <span className="rzv-summary__value">#{reservation.reservation_id}</span>
        </div>
        <div className="rzv-summary__row">
          <span className="rzv-summary__label">{translateLabel("Status")}</span>
          <span className="rzv-summary__value">
            <span className="rzv-status-pill">{reservation.reservation_status}</span>
          </span>
        </div>
        <div className="rzv-summary__row">
          <span className="rzv-summary__label">{translateLabel("Start")}</span>
          <span className="rzv-summary__value">
            {formatDateTime(reservation.reservation_start_at)}
          </span>
        </div>
        <div className="rzv-summary__row">
          <span className="rzv-summary__label">{translateLabel("End")}</span>
          <span className="rzv-summary__value">
            {formatDateTime(reservation.reservation_end_at)}
          </span>
        </div>
        <div className="rzv-summary__row">
          <span className="rzv-summary__label">{translateLabel("Guests")}</span>
          <span className="rzv-summary__value">{reservation.guest_count}</span>
        </div>
        <div className="rzv-summary__row">
          <span className="rzv-summary__label">{translateLabel("Table(s)")}</span>
          <span className="rzv-summary__value">
            {tables.length > 0
              ? tables.map((t) => `${t.display_label} (${t.capacity})`).join(", ")
              : "—"}
          </span>
        </div>
        {reservation.special_request ? (
          <div className="rzv-summary__row">
            <span className="rzv-summary__label">{translateLabel("Notes")}</span>
            <span className="rzv-summary__value" style={{ maxWidth: 280, whiteSpace: "pre-wrap" }}>
              {reservation.special_request}
            </span>
          </div>
        ) : null}
      </div>

      <div className="rzv-confirm__actions">
        <button type="button" className="rzv-btn rzv-btn--ghost" onClick={onBackHome}>
          {translateLabel("Back to Home")}
        </button>
        <button type="button" className="rzv-btn rzv-btn--ghost" onClick={onBookAnother}>
          {translateLabel("Book Another Table")}
        </button>
        {onViewReservations ? (
          <button type="button" className="rzv-btn rzv-btn--solid" onClick={onViewReservations}>
            {translateLabel("View My Reservations")}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default ReservationConfirmation;
