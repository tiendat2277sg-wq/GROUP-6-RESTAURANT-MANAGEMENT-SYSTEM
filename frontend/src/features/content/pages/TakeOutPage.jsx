import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
import { useState } from "react";
import takeoutHero from "@/assets/images/takeout/takeout-hero.png";
import takeoutArrow from "@/assets/images/takeout/takeout-arrow.svg";
import takeoutPhone from "@/assets/images/takeout/takeout-phone.svg";
import "../styles/takeout.css";

const lunchBentoItems = [
  {
    title: "SUSHI SELECTION",
    description: "Chef's choice of 8 pieces of Nigiri and 1 Tuna Roll.",
    price: "58",
  },
  {
    title: "SASHIMI SELECTION",
    description: "Chef's choice of 13 pieces of Sashimi.",
    price: "58",
  },
  {
    title: "MAKI TRIO",
    description: "Spicy Tuna Roll, Yellowtail Jalapeno, Shrimp Tempura Roll",
    price: "47",
  },
  {
    title: "TOFU & VEGETABLE SPICY GARLIC SAUCE",
    description: "Includes Shiitake Salad",
    price: "32",
  },
  {
    title: "*GRILLED SALMON",
    description: "Includes Tuna Sashimi Salad",
    price: "39",
  },
  {
    title: "*GRILLED CHICKEN",
    description: "Includes Tuna Sashimi Salad",
    price: "39",
  },
  {
    title: "*GRILLED TENDERLOIN",
    description: "Includes Sashimi Salad",
    price: "46",
  },
];

const lunchColdDishes = [
  { title: "TORO TARTARE WITH CAVIAR", price: "48" },
  { title: "YELLOWTAIL TARTARE WITH CAVIAR", price: "38" },
  { title: "SALMON TARTARE WITH CAVIAR", price: "38" },
  { title: "YELLOWTAIL JALAPENO", price: "37" },
  { title: "FLUKE DRY MISO", price: "38" },
  { title: "TIRADITO", price: "36" },
  { title: "NEW STYLE SASHIMI WITH SALMON", price: "37" },
  { title: "NEW STYLE SASHIMI WITH WHITE FISH", price: "39" },
  { title: "CRISPY RICE WITH SPICY TUNA", price: "37" },
  { title: "TUNA TATAKI TOSAZU", price: "37" },
  { title: "SASHIMI SALAD WITH MATSUHISA DRESSING", price: "39" },
  { title: "LOBSTER SHIITAKE SALAD WITH SPICY LEMON DRESSING", price: "72" },
  { title: "BABY SPINACH SALAD WITH LOBSTER", price: "72" },
  { title: "BABY SPINACH SALAD WITH GRILLED SHRIMP", price: "42" },
  { title: "WAGYU TATAKI WITH PONZU (2OZ)", price: "80" },
];

const dinnerNigiri = [
  { title: "TUNA", price: "8.5" },
  { title: "TORO", price: "10" },
  { title: "SALMON", price: "8.5" },
  { title: "KING SALMON", price: "10" },
  { title: "YELLOWTAIL", price: "8.5" },
  { title: "KAMPACHI", price: "10.5" },
  { title: "SHIMAAJI", price: "10.5" },
  { title: "FLUKE", price: "9" },
  { title: "JAPANESE RED SNAPPER", price: "9" },
  { title: "KINMEDAI", price: "15" },
  { title: "SHRIMP", price: "8" },
  { title: "SNOW CRAB", price: "13" },
  { title: "SCALLOP", price: "8.5" },
  { title: "OCTOPUS", price: "7.5" },
  { title: "JAPANESE SEA URCHIN", price: "19" },
];

const dinnerHotDishes = [
  { title: "BLACK COD WITH MISO", price: "52" },
  { title: "UMAMI GLAZED SLICED SEA BASS", price: "58" },
  { title: "SQUID PASTA WITH LIGHT GARLIC SAUCE", price: "37" },
  { title: "SHRIMP WITH SPICY GARLIC", price: "49" },
  { title: "ROCK SHRIMP TEMPURA CREAMY SPICY", price: "37" },
  { title: "WHITE FISH TEMPURA", price: "58" },
  { title: "LOBSTER WASABI PEPPER", price: "72" },
  { title: "GRILLED SALMON - CHOICE OF SAUCES", price: "41" },
  { title: "GRILLED CHICKEN - CHOICE OF SAUCES", price: "41" },
  { title: "GRILLED BEEF TENDERLOIN - CHOICE OF SAUCES", price: "65" },
  { title: "GRILLED LAMB CHOPS - CHOICE OF SAUCES", price: "28" },
  { title: "RIB EYE WITH YUZU HONEY TRUFFLE", price: "68" },
  { title: "MISO SOUP", price: "9" },
];

const dinnerVegetables = [
  { title: "FIELD GREENS WITH MATSUHISA DRESSING", price: "18" },
  { title: "SHIITAKE SALAD WITH SPICY LEMON DRESSING", price: "24" },
  { title: "BABY SPINACH SALAD WITH DRY MISO", price: "24" },
  { title: "TOFU WITH STYLE", price: "21" },
  { title: "CRISPY RICE WITH AVOCADO", price: "28" },
  { title: "EGGPLANT MISO", price: "21" },
  { title: "BRUSSEL SPROUTS GOAN PONZU", price: "26" },
  { title: "ROASTED CAULIFLOWER WITH JALAPENO SALSA", price: "20" },
  { title: "WARM MUSHROOM SALAD", price: "34" },
  { title: "TOFU & VEGETABLE SPICY GARLIC", price: "25" },
];

function MenuItem({ title, description, price, simple = false }) {
  const { translateLabel } = useLanguage();
  if (simple) {
    return (
      <div className="takeout-menu__item takeout-menu__item--simple">
        <p className="takeout-menu__item-title">{translateLabel(title)}</p>
        <span className="takeout-menu__item-price">{price}</span>
      </div>
    );
  }

  return (
    <div className="takeout-menu__item">
      <div className="takeout-menu__item-copy">
        <p className="takeout-menu__item-title">{translateLabel(title)}</p>
        {description ? (
          <p className="takeout-menu__item-description">{translateLabel(description)}</p>
        ) : null}
      </div>
      <span className="takeout-menu__item-price">{price}</span>
    </div>
  );
}

function LunchMenu() {
  const { translateLabel } = useLanguage();
  return (
    <div className="takeout-menu__panel" role="tabpanel" id="takeout-lunch-panel">
      <header className="takeout-menu__header">
        <p className="takeout-menu__label">{translateLabel("TAKEOUT LUNCH MENU")}</p>
        <p className="takeout-menu__meta">{translateLabel("Mỗi ngày")}</p>
      </header>

      <div className="takeout-menu__section">
        <h3 className="takeout-menu__section-title">{translateLabel("FUKU SELECT BENTO")}</h3>
        <div className="takeout-menu__item takeout-menu__item--stacked">
          <p className="takeout-menu__item-description takeout-menu__item-description--center">
            {translateLabel("Sashimi salad, assorted sushi, black cod with miso, tenderloin anticucho & miso soup")}
          </p>
          <span className="takeout-menu__item-price takeout-menu__item-price--center">
            59
          </span>
        </div>
      </div>

      <div className="takeout-menu__section">
        <h3 className="takeout-menu__section-title">{translateLabel("BENTO BOXES")}</h3>
        <p className="takeout-menu__section-note takeout-menu__section-note--italic">
          {translateLabel("Includes Tomato Ceviche, Rice, Miso Soup & Matcha Cookie")}
        </p>
        <div className="takeout-menu__list">
          {lunchBentoItems.map((item) => (
            <MenuItem key={item.title} {...item} />
          ))}
        </div>
        <p className="takeout-menu__section-note takeout-menu__section-note--sauce">
          {translateLabel("*CHOICE OF SAUCE: TERIYAKI, WASABI PEPPER OR ANTICUCHO")}
        </p>
      </div>

      <div className="takeout-menu__section">
        <h3 className="takeout-menu__section-title">{translateLabel("TACOS")}</h3>
        <MenuItem
          title={translateLabel("TACO BOX")}
          description={translateLabel("Build your own: includes 6 taco shells and a choice of up to three proteins")}
          price="60"
        />
        <p className="takeout-menu__section-note takeout-menu__section-note--small">
          {translateLabel("(1 PROTEIN PAIR OF TACOS)")}
        </p>
        <p className="takeout-menu__section-note takeout-menu__section-note--small takeout-menu__section-note--caps">
          {translateLabel("TUNA | SALMON | YELLOWTAIL | LOBSTER* | WAGYU*")}
        </p>
        <p className="takeout-menu__section-note takeout-menu__section-note--small">
          {translateLabel("*ADDITIONAL CHARGES APPLY FOR LOBSTER ($3.00 PER TACO) AND WAGYU ($12.00 PER TACO)")}
        </p>
      </div>

      <div className="takeout-menu__section takeout-menu__section--last">
        <h3 className="takeout-menu__section-title">{translateLabel("COLD DISHES")}</h3>
        <div className="takeout-menu__list">
          {lunchColdDishes.map((item) => (
            <MenuItem key={item.title} {...item} simple />
          ))}
        </div>
      </div>
    </div>
  );
}

function DinnerMenu() {
  const { translateLabel } = useLanguage();
  return (
    <div className="takeout-menu__panel" role="tabpanel" id="takeout-dinner-panel">
      <div className="takeout-menu__section">
        <h3 className="takeout-menu__section-title">{translateLabel("NIGIRI / SASHIMI")}</h3>
        <p className="takeout-menu__section-note">{translateLabel("Price per piece")}</p>
        <div className="takeout-menu__list">
          {dinnerNigiri.map((item) => (
            <MenuItem key={item.title} {...item} simple />
          ))}
        </div>
      </div>

      <div className="takeout-menu__section">
        <h3 className="takeout-menu__section-title">{translateLabel("HOT DISHES")}</h3>
        <div className="takeout-menu__list">
          {dinnerHotDishes.map((item) => (
            <MenuItem key={item.title} {...item} simple />
          ))}
        </div>
      </div>

      <div className="takeout-menu__section">
        <h3 className="takeout-menu__section-title">{translateLabel("JAPANESE A5 WAGYU")}</h3>
        <MenuItem title={translateLabel("WAGYU STEAK 6 OZ")} price="200" />
        <p className="takeout-menu__section-note takeout-menu__section-note--italic">
          {translateLabel("Served with Yuzu Soy, Teriyaki, Anticucho, Wasabi Pepper Sauce on side")}
        </p>
      </div>

      <div className="takeout-menu__section takeout-menu__section--last">
        <h3 className="takeout-menu__section-title">{translateLabel("VEGETABLES")}</h3>
        <div className="takeout-menu__list">
          {dinnerVegetables.map((item) => (
            <MenuItem key={item.title} {...item} simple />
          ))}
        </div>
      </div>
    </div>
  );
}

function TakeOut() {
  const { translateLabel } = useLanguage();
  const [activeTab, setActiveTab] = useState("lunch");

  const scrollToTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  };

  return (
    <div className="takeout-page">
      <main className="takeout-main" id="takeout-top">
        <section className="takeout-hero" aria-labelledby="takeout-hero-heading">
          <div className="takeout-hero__image">
            <img
              src={takeoutHero}
              alt={translateLabel("Takeout presentation with coffee and plated dishes")}
            />
          </div>

          <div className="takeout-hero__copy">
            <p className="takeout-hero__label" id="takeout-hero-heading">
              {translateLabel("ORDER TAKEOUT")}
            </p>

            <div className="takeout-hero__hours">
              <div className="takeout-hero__group">
                <p className="takeout-hero__line takeout-hero__line--title">{translateLabel("LUNCH")}</p>
                <p className="takeout-hero__line">{translateLabel("Mỗi ngày")}</p>
                <p className="takeout-hero__line">10:00 – 15:00</p>
              </div>
              <div className="takeout-hero__group">
                <p className="takeout-hero__line takeout-hero__line--title">{translateLabel("DINNER")}</p>
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

            <p className="takeout-hero__note">
              {translateLabel("Place your order via apps or call:")}
            </p>
          </div>
        </section>

        <section className="takeout-menu-band" aria-hidden="true">
          <h2>{translateLabel("TAKEOUT MENU")}</h2>
        </section>

        <section className="takeout-menu" aria-label={translateLabel("Takeout menu")}>
          <div
            className="takeout-menu__tabs"
            role="tablist"
            aria-label={translateLabel("Takeout menu type")}
          >
            <button
              type="button"
              role="tab"
              id="takeout-tab-lunch"
              aria-selected={activeTab === "lunch"}
              aria-controls="takeout-lunch-panel"
              className={`takeout-menu__tab${activeTab === "lunch" ? " takeout-menu__tab--active" : ""}`}
              onClick={() => setActiveTab("lunch")}
            >
              {translateLabel("LUNCH")}
            </button>
            <button
              type="button"
              role="tab"
              id="takeout-tab-dinner"
              aria-selected={activeTab === "dinner"}
              aria-controls="takeout-dinner-panel"
              className={`takeout-menu__tab${activeTab === "dinner" ? " takeout-menu__tab--active" : ""}`}
              onClick={() => setActiveTab("dinner")}
            >
              {translateLabel("DINNER")}
            </button>
          </div>

          <div className="takeout-menu__content">
            {activeTab === "lunch" ? <LunchMenu /> : <DinnerMenu />}
          </div>
        </section>

        <section className="takeout-note" aria-labelledby="takeout-note-heading">
          <p className="takeout-note__label" id="takeout-note-heading">
            {translateLabel("NOTE:")}
          </p>
          <p className="takeout-note__text">
            {translateLabel("ALL RAW FISH ITEMS MUST BE CONSUMED WITHIN AN HOUR OF PICK-UP. CONSUMING RAW OR UNDERCOOKED MEATS, POULTRY, SEAFOOD OR EGGS MAY INCREASE YOUR RISK OF FOOD-BORNE ILLNESS.")}
          </p>
          <button
            type="button"
            className="takeout-note__top-link"
            onClick={scrollToTop}
          >
            {translateLabel("GO TO TOP")}
          </button>
        </section>

        <section className="takeout-order" aria-labelledby="takeout-order-heading">
          <h2 className="takeout-order__heading" id="takeout-order-heading">
            {translateLabel("ORDER TAKEOUT")}
          </h2>
          <div className="takeout-order__group">
            <p className="takeout-order__title">{translateLabel("LUNCH")}</p>
            <p className="takeout-order__time">{translateLabel("Mỗi ngày")} 10:00 – 15:00</p>
          </div>
          <div className="takeout-order__group">
            <p className="takeout-order__title">{translateLabel("DINNER")}</p>
            <p className="takeout-order__time">{translateLabel("Mỗi ngày")} 17:00 – 22:00</p>
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
            <span>{translateLabel("PLACE YOUR ORDER VIA APPS OR CALL:")}</span>
            <div className="takeout-contact__phone">
              <img src={takeoutPhone} alt="" />
              <a href="tel:+84966783333">+84 966 783 333</a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default TakeOut;
