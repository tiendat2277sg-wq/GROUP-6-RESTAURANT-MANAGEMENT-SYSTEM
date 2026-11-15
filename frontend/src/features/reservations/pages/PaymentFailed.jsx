import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
import '../styles/ReservationPayment.css';

export default function PaymentFailed({ onRetry, onEditDetails }) {
  const { translateLabel } = useLanguage();
  const params = new URLSearchParams(window.location.search);
  const isVerifying = params.get('reason') === 'verifying';

  return (
    <div className="rp-card rp-card-center">
      <i className="rp-failed-icon" aria-hidden="true">✕</i>
      <h2 className="rp-title rp-title-center">{translateLabel("Payment failed")}</h2>
      <p className="rp-subtitle rp-subtitle-center">
        {translateLabel(isVerifying
          ? 'We could not verify your payment in time. Please try again.'
          : 'Your table has not been reserved. No deposit was charged.')}
      </p>

      <button className="rp-btn rp-btn-primary" onClick={onRetry}>{translateLabel("Try payment again")}</button>
      <button className="rp-btn" onClick={onEditDetails}>{translateLabel("Edit reservation details")}</button>
    </div>
  );
}
