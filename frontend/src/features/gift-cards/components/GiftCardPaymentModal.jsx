import PayOSCheckoutCard from '@/features/payment/components/PayOSCheckoutCard.jsx';
import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
import { useEffect } from "react";
import { formatVND } from "@/core/utils/formatCurrency";
import "../styles/gift-cards.css";

function GiftCardPaymentModal({
  open,
  amount,
  phase = "confirm",
  errorMessage = "",
  voucherCode = "",
  payment,
  onClose,
  onConfirm,
}) {
  const { translateLabel } = useLanguage();
  useEffect(() => {
    if (!open) return undefined;

    const onKey = (event) => {
      if (event.key === "Escape" && phase !== "loading") {
        onClose?.();
      }
    };

    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose, phase]);

  if (!open || !amount) return null;

  const formattedAmount = formatVND(amount);

  return (
    <div
      className="gift-pay-modal"
      role="presentation"
      onClick={phase === "loading" ? undefined : onClose}
    >
      <div
        className="gift-pay-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gift-pay-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        {phase === "success" ? (
          <>
            <p className="gift-pay-modal__eyebrow">{translateLabel("Payment successful")}</p>
            <h2 id="gift-pay-modal-title" className="gift-pay-modal__title">
              {translateLabel("Your gift card is ready")}
            </h2>
            <p className="gift-pay-modal__text">
              {translateLabel("Payment successful! Here is your Gift Card Code. Please save it for your next meal at FUKU.")}
            </p>
            <div className="gift-pay-modal__code" aria-label={translateLabel("Gift card voucher code")}>
              {voucherCode}
            </div>
            <div className="gift-pay-modal__actions">
              <button type="button" className="gift-pay-modal__btn gift-pay-modal__btn--primary" onClick={onClose}>
                {translateLabel("Return to Home")}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="gift-pay-modal__eyebrow">{translateLabel("Gift card payment")}</p>
            <h2 id="gift-pay-modal-title" className="gift-pay-modal__title">
              {translateLabel("Confirm your purchase")}
            </h2>
            <p className="gift-pay-modal__text">
              {translateLabel("Confirm purchase of")} <strong>{formattedAmount}</strong> {translateLabel("Gift Card?")}
            </p>

            {payment && <PayOSCheckoutCard kind="intent" targetId={payment.payment_code} amount={amount} onSuccess={onConfirm} />}
            {errorMessage ? (
              <p className="gift-pay-modal__error" role="alert">
                {errorMessage}
              </p>
            ) : null}

            <div className="gift-pay-modal__actions">
              <button
                type="button"
                className="gift-pay-modal__btn gift-pay-modal__btn--ghost"
                onClick={onClose}
                disabled={phase === "loading"}
              >
                {translateLabel("Cancel")}
              </button>
              <button
                type="button"
                className="gift-pay-modal__btn gift-pay-modal__btn--primary"
                onClick={onConfirm}
                disabled={phase === "loading"}
              >
                {phase === "loading" ? (
                  <span className="gift-pay-modal__loading">
                    <span className="gift-pay-modal__spinner" aria-hidden="true" />
                    {translateLabel("Processing…")}
                  </span>
                ) : (
                  translateLabel(payment ? "Check payment" : "Continue")
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default GiftCardPaymentModal;
