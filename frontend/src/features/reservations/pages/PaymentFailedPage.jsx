import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles/ReservationPayment.css';

export default function PaymentFailedPage() {
  const { translateLabel } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const isVerifying = params.get('reason') === 'verifying';
  
  const reservationId = location.state?.reservationId;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 1rem', background: '#f9f9f9', minHeight: '60vh' }}>
      <div className="rp-card rp-card-center">
        <i className="rp-failed-icon" aria-hidden="true">✕</i>
        <h2 className="rp-title rp-title-center">{translateLabel("Payment failed")}</h2>
        <p className="rp-subtitle rp-subtitle-center">
          {translateLabel(isVerifying
            ? 'We could not verify your payment in time. Please try again.'
            : 'Your table has not been reserved. No deposit was charged.')}
        </p>

        <button className="rp-btn rp-btn-primary" onClick={() => navigate("/reservations/process-payment", { state: { reservationId } })}>{translateLabel("Try payment again")}</button>
        <button className="rp-btn" onClick={() => navigate("/reservations")}>{translateLabel("Edit reservation details")}</button>
      </div>
    </div>
  );
}
