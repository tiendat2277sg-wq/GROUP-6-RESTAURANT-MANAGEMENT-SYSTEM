import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
import takeoutHero from '@/assets/images/takeout/takeout-hero.png';
import takeoutArrow from '@/assets/images/takeout/takeout-arrow.svg';
import takeoutPhone from '@/assets/images/takeout/takeout-phone.svg';

function TakeOutHero() {
  const { translateLabel } = useLanguage();
  return (
    <section className="takeout-hero" aria-labelledby="takeout-hero-heading">
      <div className="takeout-hero__image">
        <img src={takeoutHero} alt={translateLabel("Takeout presentation with coffee and plated dishes")} />
      </div>

      <div className="takeout-hero__copy">
        <p className="takeout-hero__label" id="takeout-hero-heading">
          {translateLabel("ORDER TAKEOUT")}
        </p>

        <div className="takeout-hero__grid">
          <div className="takeout-hero__group">
            <p className="takeout-hero__line">{translateLabel("LUNCH")}</p>
            <p className="takeout-hero__line">{translateLabel("Mỗi ngày")}</p>
            <p className="takeout-hero__line">10:00 – 15:00</p>
          </div>
          <div className="takeout-hero__group">
            <p className="takeout-hero__line">{translateLabel("DINNER")}</p>
            <p className="takeout-hero__line">{translateLabel("Mỗi ngày")}</p>
            <p className="takeout-hero__line">17:00 – 22:00</p>
          </div>
        </div>

        <div className="takeout-hero__delivery">
          <p className="takeout-hero__delivery-title">{translateLabel("FOR DELIVERY:")}</p>
          <div className="takeout-hero__delivery-links">
            <a className="takeout-hero__delivery-link" href="#grab">
              <span>{translateLabel("GRAB")}</span>
              <img src={takeoutArrow} alt="" />
            </a>
            <a className="takeout-hero__delivery-link" href="#shopeefood">
              <span>{translateLabel("SHOPEEFOOD")}</span>
              <img src={takeoutArrow} alt="" />
            </a>
          </div>
        </div>

        <p className="takeout-hero__copy-note">
          {translateLabel("Place your order from 5:00 PM via apps or call:")}
        </p>

        <div className="takeout-hero__phone">
          <img src={takeoutPhone} alt="" />
          <a href="tel:+84966783333">+84 966 783 333</a>
        </div>
      </div>
    </section>
  );
}

export default TakeOutHero;
