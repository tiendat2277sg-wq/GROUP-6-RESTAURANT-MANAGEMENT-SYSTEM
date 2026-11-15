import { paymentQrUrl, receivingBank } from '../../../../../../shared/bankTransfer.js';
import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
import React, { createContext, useContext, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, CheckCircle2 } from 'lucide-react';
import './PaymentQRPanel.css';
import { usePaymentPolling } from '../../hooks/usePaymentPolling';

const PaymentContext = createContext(null);

export function PaymentQRPanel({ orderId, amount, transferContent, onSuccess }) {
  const { phase, secondsLeft, resetPayment } = usePaymentPolling(orderId, onSuccess);

  const value = { phase, secondsLeft, amount, transferContent, resetPayment };

  return (
    <PaymentContext.Provider value={value}>
      <div className="payment-qr-container">
        <AnimatePresence mode="wait">
          {phase === 'success' ? (
            <PaymentQRPanel.SuccessScreen key="success" />
          ) : (
            <motion.div
              key="panel"
              className="payment-qr-layout"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <PaymentQRPanel.LeftColumn />
              <PaymentQRPanel.RightColumn />

              {phase === 'expired' && <PaymentQRPanel.ExpiredOverlay />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PaymentContext.Provider>
  );
}

// -----------------------------------------------------------------------------
// COMPOUND COMPONENTS
// -----------------------------------------------------------------------------

PaymentQRPanel.LeftColumn = function LeftColumn() {
  const { translateLabel } = useLanguage();
  const { amount, transferContent, phase } = useContext(PaymentContext);
  const qrUrl = paymentQrUrl(amount, transferContent);
  const isExpired = phase === 'expired';

  return (
    <div className="payment-left-col">
      <div className={`qr-wrapper ${isExpired ? 'qr-blurred' : ''}`}>
        <img src={qrUrl} alt="VietQR" className="qr-img" />
      </div>
      <p className="qr-caption">{translateLabel("Scan with any banking app to pay")}</p>
    </div>
  );
};

PaymentQRPanel.RightColumn = function RightColumn() {
  const { translateLabel } = useLanguage();
  const { secondsLeft, amount, transferContent } = useContext(PaymentContext);
  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const seconds = String(secondsLeft % 60).padStart(2, '0');

  return (
    <div className="payment-right-col">
      <div className="timer-wrapper">
        <span className="timer-label">{translateLabel("Code expires in:")}</span>
        <span className="timer-value">{minutes}:{seconds}</span>
      </div>

      <div className="bank-card">
        <h3 className="bank-owner">{receivingBank.holder}</h3>

        <div className="bank-info-row">
          <div className="bank-info-text">
            <span className="bank-info-label">{translateLabel("Bank")}</span>
            <span className="bank-info-value">{receivingBank.name}</span>
          </div>
          {/* No copy button here as per requirements */}
          <div className="copy-spacer"></div>
        </div>

        <CopyableRow label={translateLabel("Account Number")} value={receivingBank.account} />
        <CopyableRow
          label={translateLabel("Amount")}
          displayValue={`${amount.toLocaleString('vi-VN')} ₫`}
          copyValue={String(amount)}
        />
        <CopyableRow label={translateLabel("Transfer Content")} value={transferContent} />
      </div>
    </div>
  );
};

PaymentQRPanel.SuccessScreen = function SuccessScreen() {
  const { translateLabel } = useLanguage();
  return (
    <motion.div
      className="payment-success-screen"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <CheckCircle2 size={80} className="success-icon" />
      <h2 className="success-heading">{translateLabel("Payment Successful")}</h2>
      <p className="success-text">{translateLabel("The payment has been verified. The table will be updated.")}</p>
    </motion.div>
  );
};

PaymentQRPanel.ExpiredOverlay = function ExpiredOverlay() {
  const { translateLabel } = useLanguage();
  const { resetPayment } = useContext(PaymentContext);

  return (
    <div className="payment-expired-overlay">
      <div className="expired-content">
        <h2 className="expired-heading">{translateLabel("Payment Expired")}</h2>
        <p className="expired-text">{translateLabel("This QR code is no longer valid.")}</p>
        <button className="btn-generate" onClick={resetPayment}>
          {translateLabel("Generate New Code")}
        </button>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// HELPER COMPONENTS
// -----------------------------------------------------------------------------

function CopyableRow({ label, value, displayValue, copyValue }) {
  const { translateLabel } = useLanguage();
  const [copied, setCopied] = useState(false);
  const textToCopy = copyValue || value;
  const textToDisplay = displayValue || value;

  const handleCopy = () => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bank-info-row">
      <div className="bank-info-text">
        <span className="bank-info-label">{translateLabel(label)}</span>
        <span className="bank-info-value">{textToDisplay}</span>
      </div>
      <button className="btn-copy" onClick={handleCopy} title={translateLabel("Copy to clipboard")}>
        {copied ? <CheckCircle2 size={20} className="icon-copied" /> : <Copy size={20} className="icon-copy" />}
      </button>

      <AnimatePresence>
        {copied && (
          <motion.div
            className="toast-copied"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {translateLabel("Copied!")}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
