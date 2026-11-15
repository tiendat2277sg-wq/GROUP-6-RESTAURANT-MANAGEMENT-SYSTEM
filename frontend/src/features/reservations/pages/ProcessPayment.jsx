import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
import { useState, useCallback } from 'react';
import '../styles/ReservationPayment.css';

const DEPOSIT_AMOUNT = 200000; // VND — matches RESERVATION_DEPOSIT_AMOUNT in backend

export default function ProcessPayment({ reservationId, onCreatePaymentUrl }) {
  const { translateLabel } = useLanguage();
  const [status, setStatus] = useState('idle'); // idle | redirecting | error
  const [errorMsg, setErrorMsg] = useState('');

  const handlePay = useCallback(async () => {
    setStatus('redirecting');
    setErrorMsg('');
    try {
      const { paymentUrl } = await onCreatePaymentUrl(reservationId);
      sessionStorage.setItem('pending_reservation_id', String(reservationId));
      window.location.href = paymentUrl;
    } catch (err) {
      console.error('create_vnpay_url failed', err);
      setStatus('error');
      setErrorMsg('Could not connect to VNPAY, please try again.');
    }
  }, [reservationId, onCreatePaymentUrl]);

  return (
    <div className="rp-card">
      <p className="rp-eyebrow">{translateLabel("Secure your table")}</p>
      <h2 className="rp-title">{translateLabel("Pay deposit via VNPAY")}</h2>

      <div className="rp-amount-block">
        <span className="rp-amount">{DEPOSIT_AMOUNT.toLocaleString('vi-VN')} VND</span>
        <span className="rp-amount-label">{translateLabel("Deposit to hold your table")}</span>
      </div>

      {status === 'error' && <p className="rp-error-text">{errorMsg}</p>}

      <button className="rp-btn rp-btn-primary" onClick={handlePay} disabled={status === 'redirecting'}>
        {translateLabel(status === 'redirecting' ? 'Redirecting to VNPAY…' : 'Pay deposit via VNPAY')}
      </button>
    </div>
  );
}
