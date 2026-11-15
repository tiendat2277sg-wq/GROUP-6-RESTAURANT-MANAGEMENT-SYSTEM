import PaymentConfirmedDialog from '../components/PaymentConfirmedDialog';
import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
import { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import CheckoutQR from '../components/CheckoutQR';
import { Skeleton } from '@/components/ui/Skeleton.jsx';
import CustomerReviewModal from '../../reviews/CustomerReviewModal';
import usePaymentPolling from '../hooks/usePaymentPolling';
import { useTableSession } from '@/features/table-session';
import { useAuth } from '@/features/auth/context/AuthContext';
import { getMyPromotions, applyPromotion } from '@/features/loyalty/services/loyaltyApi.js';
import '../../reservations/styles/ReservationDetails.css';


export default function CustomerCheckout() {
  const { translateLabel } = useLanguage();
  const { orderId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { session } = useTableSession();
  // Checkout can close the table session before the final payment poll arrives.
  const [checkoutToken] = useState(() => new URLSearchParams(location.search).get('session_token') || session?.token);
  const paymentToken = checkoutToken || session?.token;
  const { currentUser } = useAuth();
  const userId = currentUser?.user_id || currentUser?.userId || currentUser?.id;

  // Try to use location state first for instant loading
  const [amount, setAmount] = useState(location.state?.amount || null);
  const [historyData, setHistoryData] = useState(null);
  const [isLoading, setIsLoading] = useState(!location.state?.amount);

  const { status, error: paymentError } = usePaymentPolling(orderId, paymentToken);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Voucher states
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [applying, setApplying] = useState(false);
  const [voucherError, setVoucherError] = useState('');
  const [originalAmount, setOriginalAmount] = useState(null);
  const [myActiveVouchers, setMyActiveVouchers] = useState([]);

  // Fetch active vouchers for the user
  useEffect(() => {
    async function fetchVouchers() {
      if (!userId) return;
      try {
        const res = await getMyPromotions(userId, 'active');
        if (res?.success) {
          setMyActiveVouchers(res.promotions || []);
        }
      } catch (err) {
        console.error("Failed to fetch customer vouchers for checkout:", err);
      }
    }
    fetchVouchers();
  }, [userId]);

  // Fetch true amount from backend history API if not passed or just to verify
  useEffect(() => {
    async function fetchAmount() {
      if (!paymentToken) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/public/qr-order/session/${encodeURIComponent(paymentToken)}/history`);
        const result = await res.json();
        if (result.success && result.data) {
          setHistoryData(result.data);
          if (result.data.summary) {
            setAmount(result.data.summary.remainingToPay);
          }
        }
      } catch (err) {
        console.error("Failed to fetch session history for checkout amount", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAmount();
  }, [paymentToken]);



  const handleApplyVoucher = async () => {
    if (!voucherCode.trim() || !userId) return;
    setApplying(true);
    setVoucherError('');
    try {
      const match = myActiveVouchers.find(
        (v) => v.promo_code.toUpperCase() === voucherCode.toUpperCase().trim()
      );
      if (!match) {
        setVoucherError('Voucher code not found in your wallet. Redeem it first!');
        setApplying(false);
        return;
      }

      const res = await applyPromotion(userId, {
        customerPromotionId: match.customer_promotion_id,
        orderId: Number(orderId)
      }, paymentToken);

      if (res?.success) {
        setAppliedVoucher({
          code: match.promo_code,
          discount_amount: res.discountAmount
        });
        setOriginalAmount(amount);
        setAmount(res.newTotalAmount);
      } else {
        setVoucherError(res?.message || 'Failed to apply voucher.');
      }
    } catch (err) {
      setVoucherError(err?.message || 'Error applying voucher.');
    } finally {
      setApplying(false);
    }
  };

  if (paymentError) return <p role="alert">{translateLabel(paymentError)}</p>;
  if (isLoading || !status) {
    return (
      <div className="rd-page rd-page--checkout flex flex-col items-center justify-center p-4 min-h-screen text-white">
        <div className="rd-card p-6 max-w-md w-full flex flex-col items-center space-y-4">
          <Skeleton className="w-1/2 h-6 bg-white/10" />
          <Skeleton className="w-48 h-48 rounded-xl bg-white/10 animate-pulse" />
          <Skeleton className="w-3/4 h-4 bg-white/10" />
        </div>
      </div>
    );
  }

  if (status === 'Paid' || status === 'Completed') {
    return showReviewModal
      ? <CustomerReviewModal isOpen onClose={() => navigate('/')} onSubmitted={() => navigate('/')} orderId={orderId} tableToken={paymentToken} />
      : <PaymentConfirmedDialog reference={'DH' + orderId} onContinue={() => setShowReviewModal(true)} />;
  }

  if (amount === null || amount === 0) {
    return (
      <div className="rd-page rd-page--checkout flex flex-col items-center justify-center p-4 text-center min-h-screen text-white">

        <div className="rd-card p-8 max-w-sm w-full flex flex-col items-center">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center shadow-sm mb-4 text-3xl">⚠️</div>
          <h2 className="text-xl font-bold text-white mb-2">{translateLabel("Invalid Payment Amount")}</h2>
          <p className="text-white/60 text-sm mb-6 max-w-xs mx-auto">{translateLabel("We could not verify the remaining amount for this order.")}</p>
          <button
            onClick={() => navigate(-1)}
            className="pay-btn-cancel w-full"
          >
            {translateLabel("Go Back")}
          </button>
        </div>
      </div>
    );
  }


  return (
    <>
      <CheckoutQR
        tableToken={paymentToken}
        status={status}
        orderId={orderId}
        amount={amount}
        historyData={historyData}
        originalAmount={originalAmount}
        voucherCode={voucherCode}
        setVoucherCode={setVoucherCode}
        appliedVoucher={appliedVoucher}
        applying={applying}
        voucherError={voucherError}
        onApplyVoucher={handleApplyVoucher}
        onRetry={() => {
          navigate(-1);
        }}
      />

    </>
  );
}
