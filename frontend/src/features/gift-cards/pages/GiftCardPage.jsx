import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatVND } from "@/core/utils/formatCurrency";
import { GIFT_CARD_OPTIONS } from "../data/giftCardOptions.js";
import { buyGiftCard } from "../services/giftCardApi.js";
import GiftCardPaymentModal from "../components/GiftCardPaymentModal.jsx";
import "../styles/gift-cards.css";

function isCustomerUser(user) {
  if (!user) return false;
  const roleId = Number(user.roleId ?? user.role_id);
  if (roleId === 1) return true;
  const role = String(user.roleName ?? user.role_name ?? user.role ?? "")
    .trim()
    .toLowerCase();
  return role === "customer";
}

function GiftCardPage({ isAuthenticated, currentUser, onRequireAuth }) {
  const { translateLabel } = useLanguage();
  const navigate = useNavigate();
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [phase, setPhase] = useState("confirm");
  const [errorMessage, setErrorMessage] = useState("");
  const [voucherCode, setVoucherCode] = useState("");

  const buyerId = currentUser?.userId ?? currentUser?.user_id ?? currentUser?.id;
  const purchaseKey = amount => `fuku-gift-pending-${buyerId}-${amount}`;
  const [payment,setPayment] = useState(null);

  const resetModal = useCallback(() => {
    setModalOpen(false);
    setPayment(null);
    setSelectedAmount(null);
    setPhase("confirm");
    setErrorMessage("");
    setVoucherCode("");
  }, []);

  const handlePurchase = (amount) => {
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }

    if (!isCustomerUser(currentUser)) {
      setSelectedAmount(amount);
      setPhase("confirm");
      setErrorMessage("Gift cards can only be purchased with a customer account.");
      setVoucherCode("");
      setModalOpen(true);
      return;
    }

    const reference = localStorage.getItem(purchaseKey(amount));
    setPayment(reference ? {payment_code:reference} : null);
    setSelectedAmount(amount);
    setPhase(reference ? "pending" : "confirm");
    setErrorMessage("");
    setVoucherCode("");
    setModalOpen(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedAmount || !currentUser) return;

    const userId = buyerId;
    if (!userId) {
      setErrorMessage("Could not identify your account. Please sign in again.");
      return;
    }

    setPhase("loading");
    setErrorMessage("");

    try {
      const result = await buyGiftCard(userId, selectedAmount, payment?.payment_code);
      if (!result.promo_code) {
        localStorage.setItem(purchaseKey(selectedAmount),result.payment_code);
        setPayment(result);
        setPhase("pending");
        return;
      }
      localStorage.removeItem(purchaseKey(selectedAmount));
      setVoucherCode(result.promo_code);
      setPhase("success");
    } catch (error) {
      setPhase("confirm");
      setErrorMessage(error.message || "Could not complete your purchase. Please try again.");
    }
  };

  const handleCloseModal = () => {
    if (phase === "success") {
      resetModal();
      navigate("/");
      return;
    }
    resetModal();
  };

  return (
    <main className="gift-cards-page">
      <header className="gift-cards-page__hero">
        <p className="gift-cards-page__eyebrow">{translateLabel("FUKU Gift Cards")}</p>
        <h1 className="gift-cards-page__title">{translateLabel("Give the Gift of FUKU")}</h1>
        <p className="gift-cards-page__lead">
          {translateLabel("Share the art of Japanese-Peruvian dining. Each gift card is delivered as a unique voucher code, redeemable on your next visit.")}
        </p>
      </header>

      <section className="gift-cards-page__grid" aria-label={translateLabel("Gift card denominations")}>
        {GIFT_CARD_OPTIONS.map((option) => (
          <article key={option.id} className="gift-card-option">
            <p className="gift-card-option__tier">{option.tier}</p>
            <h2 className="gift-card-option__amount">{formatVND(option.amount)}</h2>
            <p className="gift-card-option__desc">{translateLabel(option.description)}</p>
            <button
              type="button"
              className="gift-card-option__btn"
              onClick={() => handlePurchase(option.amount)}
            >
              {translateLabel("Purchase")}
            </button>
          </article>
        ))}
      </section>

      <p className="gift-cards-page__note">
        {translateLabel("Your voucher is issued once the bank confirms payment.")}
      </p>

      <GiftCardPaymentModal
        open={modalOpen}
        amount={selectedAmount}
        phase={phase}
        payment={payment}
        errorMessage={errorMessage}
        voucherCode={voucherCode}
        onClose={handleCloseModal}
        onConfirm={handleConfirmPayment}
      />
    </main>
  );
}

export default GiftCardPage;
