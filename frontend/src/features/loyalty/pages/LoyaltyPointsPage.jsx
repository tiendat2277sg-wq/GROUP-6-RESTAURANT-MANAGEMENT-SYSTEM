import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
import { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Gem, Clock, Ticket, TrendingUp, CheckCircle2, AlertTriangle, Loader2, Star } from 'lucide-react';
import { getLoyaltyBalance, getLoyaltyCatalog, redeemPromotion, getMyPromotions, getLoyaltyHistory } from '../services/loyaltyApi.js';
import { format } from 'date-fns';
import { useAuth } from '@/features/auth/context/AuthContext';
import '../styles/loyalty.css';

// ─── Design tokens (matching profile.css) ─────────────────────────────────────
const T = {
  bg: '#FAF7F2',
  surface: '#FFFFFF',
  primary: '#7A2E2E',
  primaryLight: '#FDF3E7',
  gold: '#C9A227',
  goldLight: '#FEF3C7',
  olive: '#8B7355',
  success: '#5B8C5A',
  danger: '#C1440E',
  textMain: '#2B2118',
  textMuted: '#8A7F73',
  border: '#ECE5DA',
  shadow: '0 2px 10px rgba(43,33,24,0.06)',
  shadowHover: '0 8px 24px rgba(43,33,24,0.12)',
  radius: '16px',
  radiusSm: '10px',
};

// ─── Animated counter ──────────────────────────────────────────────────────────
function AnimatedCounter({ value }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = count;
    const end = parseInt(value, 10) || 0;
    if (start === end) return;
    const duration = 800;
    const increment = (end - start) / (duration / 16);
    let timer = setInterval(() => {
      start += increment;
      if ((increment > 0 && start >= end) || (increment < 0 && start <= end)) {
        clearInterval(timer);
        setCount(end);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{count.toLocaleString()}</span>;
}

// ─── Promo Countdown ─────────────────────────────────────────────────────────
function PromoCountdown({ expiryDate, onExpired }) {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    const updateCountdown = () => {
      const diff = new Date(expiryDate) - new Date();
      if (diff <= 0) {
        setTimeLeft('Expired');
        onExpired?.();
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      let text = '';
      if (days > 0) text += `${days}d `;
      if (hours > 0 || days > 0) text += `${hours}h `;
      text += `${minutes}m remaining`;
      setTimeLeft(text);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [expiryDate]);
  return (
    <span className="loyalty-vouchers__countdown">
      <Clock size={13} /> {timeLeft}
    </span>
  );
}

// ─── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title }) {
  const { translateLabel } = useLanguage();
  return (
    <div className="loyalty-section-header">
      <Icon size={18} className="loyalty-section-header__icon" />
      <h3 className="loyalty-section-header__title">{translateLabel(title)}</h3>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function LoyaltyPointsPage() {
  const { translateLabel } = useLanguage();
  const [balanceData, setBalanceData] = useState({ balance: 0, totalEarned: 0, totalRedeemed: 0 });
  const [catalog, setCatalog] = useState([]);
  const [myPromotions, setMyPromotions] = useState([]);
  const [pointHistory, setPointHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('active');
  const [loading, setLoading] = useState(true);
  const [exchanging, setExchanging] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const { currentUser } = useAuth();
  const userId = currentUser?.user_id || currentUser?.userId || currentUser?.id;

  const loadLoyaltyData = async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [balRes, catRes, vouchRes, histRes] = await Promise.all([
        getLoyaltyBalance(userId),
        getLoyaltyCatalog(userId),
        getMyPromotions(userId),
        getLoyaltyHistory(userId),
      ]);
      if (balRes?.success) setBalanceData(balRes);
      if (catRes?.success) setCatalog(catRes.catalog || []);
      if (vouchRes?.success) setMyPromotions(vouchRes.promotions || []);
      if (histRes?.success) setPointHistory(histRes.history || []);
    } catch (err) {
      console.error('[LoyaltyPointsPage] load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLoyaltyData(); }, [userId]);

  const handleRedeem = async () => {
    if (!selectedPromo || !userId) return;
    setExchanging(true);
    setActionError('');
    setActionSuccess('');
    try {
      const res = await redeemPromotion(userId, selectedPromo.promotion_id);
      if (res?.success) {
        setActionSuccess(`Redeemed! Your promo code: ${res.promotion.code}`);
        setSelectedPromo(null);
        await loadLoyaltyData();
        setTimeout(() => setActionSuccess(''), 6000);
      } else {
        setActionError(res?.message || 'Failed to redeem promotion.');
        setTimeout(() => setActionError(''), 5000);
      }
    } catch (err) {
      setActionError(err?.message || 'An error occurred.');
      setTimeout(() => setActionError(''), 5000);
    } finally {
      setExchanging(false);
    }
  };

  const filteredPromotions = useMemo(() => myPromotions.filter(v => v.status === activeTab), [myPromotions, activeTab]);

  if (loading) {
    return (
      <div className="loyalty-page__loading">
        <Loader2 size={36} className="loyalty-page__loader" />
        <p>{translateLabel("Loading loyalty points and rewards…")}</p>
      </div>
    );
  }

  return (
    <div className="loyalty-page">

      {/* ── Toast messages ── */}
      {actionSuccess && (
        <div className="loyalty-toast loyalty-toast--success">
          <CheckCircle2 size={18} className="loyalty-toast__icon--success" />
          <div className="loyalty-toast__body">
            <p className="loyalty-toast__title">{translateLabel("Redemption Successful")}</p>
            <p className="loyalty-toast__msg">{actionSuccess}</p>
          </div>
          <button onClick={() => setActionSuccess('')} className="loyalty-toast__close loyalty-toast__close--success">×</button>
        </div>
      )}
      {actionError && (
        <div className="loyalty-toast loyalty-toast--error">
          <AlertTriangle size={18} className="loyalty-toast__icon--error" />
          <div className="loyalty-toast__body">
            <p className="loyalty-toast__title">{translateLabel("Redemption Failed")}</p>
            <p className="loyalty-toast__msg">{actionError}</p>
          </div>
          <button onClick={() => setActionError('')} className="loyalty-toast__close loyalty-toast__close--error">×</button>
        </div>
      )}

      {/* ── Balance + Stats ── */}
      <section className="loyalty-balance">
        {/* Balance card */}
        <div className="loyalty-balance__card">
          {/* Decorative circles */}
          <div className="loyalty-balance__deco-1" />
          <div className="loyalty-balance__deco-2" />

          <div>
            <span className="loyalty-balance__label">{translateLabel("Point Balance")}</span>
            <h2 className="loyalty-balance__value">
              <AnimatedCounter value={balanceData.balance} />
              <span className="loyalty-balance__unit">{translateLabel("pts")}</span>
            </h2>
          </div>

          <div className="loyalty-balance__desc">
            <Star size={11} className="loyalty-balance__desc-icon" />
            {translateLabel("1 Loyalty Point earned for every 10,000 VND paid at FUKU checkout")}
          </div>
        </div>

        {/* Stats card */}
        <div className="loyalty-stats">
          <p className="loyalty-stats__title">{translateLabel("Point Statistics")}</p>

          <div className="loyalty-stats__list">
            <div className="loyalty-stats__row loyalty-stats__row--border">
              <div className="loyalty-stats__label-wrap">
                <TrendingUp size={14} className="loyalty-stats__label-icon--success" />
                <span className="loyalty-stats__label">{translateLabel("Total earned")}</span>
              </div>
              <span className="loyalty-stats__value">+{(balanceData.totalEarned || 0).toLocaleString()}</span>
            </div>

            <div className="loyalty-stats__row">
              <div className="loyalty-stats__label-wrap">
                <Gem size={14} className="loyalty-stats__label-icon--danger" />
                <span className="loyalty-stats__label">{translateLabel("Total redeemed")}</span>
              </div>
              <span className="loyalty-stats__value">-{(balanceData.totalRedeemed || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Rewards Catalog ── */}
      <section>
        <SectionHeader icon={Ticket} title={translateLabel("Exchange Rewards Catalog")} />

        {catalog.length === 0 ? (
          <p className="loyalty-catalog__empty">{translateLabel("No rewards available at the moment. Check back soon!")}</p>
        ) : (
          <div className="loyalty-catalog__grid">
            {catalog.map((promo) => {
              const userPoints = balanceData.balance || 0;
              const canRedeem = userPoints >= promo.points_required;
              const outOfStock = promo.remaining_quantity !== null && promo.remaining_quantity <= 0;

              return (
                <div key={promo.promotion_id} className="loyalty-catalog__card">
                  {outOfStock && (
                    <span className="loyalty-catalog__soldout">
                      {translateLabel("Sold out")}
                    </span>
                  )}

                  <div className="loyalty-catalog__info">
                    <span className="loyalty-catalog__tag">
                      {promo.points_required} {translateLabel("Points")}
                    </span>
                    <h4 className="loyalty-catalog__name">{promo.promotion_name}</h4>
                    <p className="loyalty-catalog__desc">
                      {promo.description || 'Redeem points for exclusive restaurant benefits.'}
                    </p>
                  </div>

                  <div className="loyalty-catalog__meta">
                    <span>{translateLabel("Target:")} {promo.applicable_to === 'Both' ? 'All checkouts' : `${promo.applicable_to} only`}</span>
                    {promo.remaining_quantity !== null && <span>{translateLabel("Stock:")} {promo.remaining_quantity} {translateLabel("left")}</span>}
                  </div>

                  <button
                    onClick={() => setSelectedPromo(promo)}
                    disabled={!canRedeem || outOfStock}
                    className="loyalty-catalog__btn"
                  >
                    {translateLabel(!canRedeem ? 'Insufficient Points' : outOfStock ? 'Sold Out' : 'Redeem Now')}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── My Promotions ── */}
      <section>
        <div className="loyalty-section-header loyalty-section-header--vouchers">
          <div className="loyalty-section-header__title-wrap">
            <Ticket size={18} className="loyalty-section-header__icon" />
            <h3 className="loyalty-section-header__title">{translateLabel("My Promo Codes")}</h3>
          </div>

          {/* Tab switcher */}
          <div className="loyalty-tabs">
            {['active', 'used', 'expired'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`loyalty-tabs__btn ${activeTab === tab ? 'loyalty-tabs__btn--active' : ''}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {filteredPromotions.length === 0 ? (
          <p className="loyalty-vouchers__empty">{translateLabel("No")} {activeTab} {translateLabel("promotions found.")}</p>
        ) : (
          <div className="loyalty-vouchers__grid">
            {filteredPromotions.map(voucher => (
              <div key={voucher.customer_promotion_id} className="loyalty-vouchers__card">
                {/* Decorative circle */}
                <div className="loyalty-vouchers__deco" />

                <div className="loyalty-vouchers__header">
                  <div className="loyalty-vouchers__title-wrap">
                    <h5 className="loyalty-vouchers__name">{voucher.promotion_name}</h5>
                    <p className="loyalty-vouchers__desc">{translateLabel(voucher.description)}</p>
                  </div>
                  <span className="loyalty-vouchers__code">
                    {voucher.promo_code}
                  </span>
                </div>

                <div className="loyalty-vouchers__footer">
                  {voucher.status === 'active' ? (
                    <PromoCountdown expiryDate={voucher.expires_at} onExpired={() => loadLoyaltyData()} />
                  ) : voucher.status === 'used' ? (
                    <span className="loyalty-vouchers__status-used">
                      <CheckCircle2 size={12} className="loyalty-vouchers__status-used-icon" />
                      {translateLabel("Used on")} {translateLabel(voucher.used_at ? format(new Date(voucher.used_at), 'MMM d, yyyy') : 'checkout')}
                    </span>
                  ) : (
                    <span className="loyalty-vouchers__status-expired">
                      {translateLabel("Expired")} {format(new Date(voucher.expires_at), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Point History ── */}
      <section style={{ marginTop: '32px' }}>
        <SectionHeader icon={Clock} title={translateLabel("Point Transaction History")} />

        {pointHistory.length === 0 ? (
          <p className="loyalty-catalog__empty">{translateLabel("No point transactions yet. Pay bills at FUKU to earn loyalty points!")}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pointHistory.map((item) => {
              const isEarn = (item.points || 0) > 0 || (item.transaction_type || '').toLowerCase() === 'earn';
              const dateFormatted = item.created_at ? format(new Date(item.created_at), 'MMM d, yyyy · HH:mm') : 'Recent';

              return (
                <div
                  key={item.transaction_id}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #ECE5DA',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 2px 6px rgba(43,33,24,0.03)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: isEarn ? '#F0FDF4' : '#FEF2F2',
                        color: isEarn ? '#15803D' : '#DC2626',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '14px',
                      }}
                    >
                      {isEarn ? <TrendingUp size={18} /> : <Gem size={18} />}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: '#2B2118' }}>
                        {item.description || (isEarn ? 'Earned Loyalty Points' : 'Redeemed Voucher')}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#8A7F73' }}>
                        {dateFormatted} {item.reference_id ? `· Ref #${item.reference_id}` : ''}
                      </p>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: '15px',
                        color: isEarn ? '#15803D' : '#DC2626',
                      }}
                    >
                      {isEarn ? `+${item.points.toLocaleString()}` : `${item.points.toLocaleString()}`} {translateLabel("pts")}
                    </span>
                    <span style={{ display: 'block', fontSize: '11px', color: '#8A7F73', textTransform: 'uppercase', fontWeight: 600, marginTop: '1px' }}>
                      {item.transaction_type}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>


      {/* ── Confirmation Modal ── */}
      {selectedPromo && createPortal(
        <div className="loyalty-confirm-overlay">
          <div className="loyalty-confirm-card">
            {/* Header */}
            <div className="loyalty-confirm-card__header">
              <div className="loyalty-confirm-card__icon-wrapper">
                <Gem size={24} className="loyalty-confirm-card__icon" />
              </div>
              <h3 className="loyalty-confirm-card__title">{translateLabel("Confirm Points Exchange")}</h3>
              <p className="loyalty-confirm-card__desc">{translateLabel("This action cannot be undone. Your points will be deducted immediately.")}</p>
            </div>

            {/* Summary */}
            <div className="loyalty-confirm-card__summary">
              <div className="loyalty-confirm-card__row">
                <span>{translateLabel("Current balance")}</span>
                <span className="loyalty-confirm-card__row--bold">{(balanceData.balance || 0).toLocaleString()} {translateLabel("pts")}</span>
              </div>
              <div className="loyalty-confirm-card__row loyalty-confirm-card__row--danger">
                <span>{translateLabel("Points to deduct")}</span>
                <span>−{selectedPromo.points_required} {translateLabel("pts")}</span>
              </div>
              <div className="loyalty-confirm-card__row loyalty-confirm-card__row--total">
                <span>{translateLabel("Remaining balance")}</span>
                <span className="loyalty-confirm-card__row--success"><AnimatedCounter value={(balanceData.balance || 0) - selectedPromo.points_required} /> {translateLabel("pts")}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="loyalty-confirm-card__actions">
              <button
                onClick={() => setSelectedPromo(null)}
                disabled={exchanging}
                className="loyalty-confirm-card__btn-cancel"
              >
                {translateLabel("Cancel")}
              </button>
              <button
                onClick={handleRedeem}
                disabled={exchanging}
                className="loyalty-confirm-card__btn-confirm"
              >
                {exchanging ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> {translateLabel("Exchanging…")}</> : 'Confirm Exchange'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
