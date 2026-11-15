import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
import { homeImages } from '../data/homeAssets.js';
import { useScrollReveal } from '@/hooks/useScrollReveal';

function GiftCardSection() {
  const { translateLabel } = useLanguage();
  const revealRef = useScrollReveal();

  return (
    <section className="phurai-gift home-reveal-parent" aria-labelledby="gift-heading" ref={revealRef}>
      <div className="phurai-gift__content">
        <h2 id="gift-heading" className="home-reveal-child">{translateLabel("GIVE THE GIFT OF FUKU")}</h2>
        <p className="home-reveal-child home-reveal-child--delay-1">
          {translateLabel("Our FUKU Giftcards are perfect for any")} <strong>{translateLabel("occasion")}</strong>.
        </p>
      </div>
      <div className="phurai-gift__media home-reveal-child home-reveal-child--delay-3">
        <img src={homeImages.giftCard} alt={translateLabel("FUKU gift card")} />
      </div>
    </section>
  );
}

export default GiftCardSection;
