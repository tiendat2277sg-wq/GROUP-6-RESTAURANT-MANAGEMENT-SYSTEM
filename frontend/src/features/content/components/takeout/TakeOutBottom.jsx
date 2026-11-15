import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
import takeoutArrow from '@/assets/images/takeout/takeout-arrow.svg';
import takeoutPhone from '@/assets/images/takeout/takeout-phone.svg';

function TakeOutBottom() {
  const { translateLabel } = useLanguage();
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <section className="takeout-note" aria-labelledby="takeout-note-heading">
        <div className="takeout-note__container">
          <p className="takeout-note__label" id="takeout-note-heading">
            {translateLabel("NOTE:")}
          </p>
          <p className="takeout-note__text">
            {translateLabel("ALL RAW FISH ITEMS MUST BE CONSUMED WITHIN AN HOUR OF PICK-UP. CONSUMING RAW OR UNDERCOOKED MEATS, POULTRY, SEAFOOD OR EGGS MAY INCREASE YOUR RISK OF FOOD-BORNE ILLNESS.")}
          </p>
          <button type="button" className="takeout-note__top-link" onClick={scrollToTop}>
            {translateLabel("GO TO TOP")}
          </button>
        </div>
      </section>

      <section className="takeout-order" aria-labelledby="takeout-order-heading">
        <h2 className="takeout-order__heading" id="takeout-order-heading">
          {translateLabel("ORDER TAKEOUT")}
        </h2>
        <div className="takeout-order__group">
          <p className="takeout-order__title">{translateLabel("LUNCH")}</p>
          <p className="takeout-order__time">{translateLabel("MONDAY - FRIDAY 11:30 AM - 2:30 PM")}</p>
        </div>
        <div className="takeout-order__group">
          <p className="takeout-order__title">{translateLabel("DINNER")}</p>
          <p className="takeout-order__time">{translateLabel("SUNDAY - THURSDAY 5:00 PM - 10:30 PM")}</p>
          <p className="takeout-order__time">{translateLabel("FRIDAY - SATURDAY 5:00 PM - 11:30 PM")}</p>
        </div>
      </section>

      <section className="takeout-contact" aria-label={translateLabel("Takeout contact and delivery")}>
        <div className="takeout-contact__delivery">
          <span className="takeout-contact__label">{translateLabel("FOR DELIVERY")}</span>
          <a className="takeout-contact__link" href="#grab">
            <span>{translateLabel("GRAB")}</span>
            <img src={takeoutArrow} alt="" />
          </a>
          <a className="takeout-contact__link" href="#shopeefood">
            <span>{translateLabel("SHOPEEFOOD")}</span>
            <img src={takeoutArrow} alt="" />
          </a>
        </div>
        <div className="takeout-contact__call">
          <span>{translateLabel("PLACE YOUR ORDER FROM 5:00 PM VIA APPS OR CALL:")}</span>
          <div>
            <img src={takeoutPhone} alt="" />
            <a href="tel:+84966783333">+84 966 783 333</a>
          </div>
        </div>
      </section>
    </>
  );
}

export default TakeOutBottom;
