import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
const bentoBoxes = [
  {
    title: 'SUSHI SELECTION',
    description: "Chef's choice of 8 pieces of Nigiri and 1 Tuna Roll.",
    price: '58',
  },
  {
    title: 'SASHIMI SELECTION',
    description: "Chef's choice of 13 pieces of Sashimi.",
    price: '58',
  },
  {
    title: 'MAKI TRIO',
    description: 'Spicy Tuna Roll, Yellowtail Jalapeno, Shrimp Tempura Roll',
    price: '47',
  },
  {
    title: 'TOFU & VEGETABLE SPICY GARLIC SAUCE',
    description: 'Includes Shiitake Salad',
    price: '32',
  },
  {
    title: '*GRILLED SALMON',
    description: 'Includes Tuna Sashimi Salad',
    price: '39',
  },
];

const grilledItems = [
  {
    title: '*GRILLED CHICKEN',
    description: 'Includes Tuna Sashimi Salad',
    price: '39',
  },
  {
    title: '*GRILLED TENDERLOIN',
    description: 'Includes Sashimi Salad',
    price: '46',
  },
];

const coldDishes = [
  { title: 'TORO TARTARE WITH CAVIAR', price: '48' },
  { title: 'YELLOWTAIL TARTARE WITH CAVIAR', price: '38' },
  { title: 'SALMON TARTARE WITH CAVIAR', price: '38' },
  { title: 'YELLOWTAIL JALAPENO', price: '37' },
  { title: 'FLUKE DRY MISO', price: '38' },
  { title: 'TIRADITO', price: '38' },
  { title: 'NEW STYLE SASHIMI WITH SALMON', price: '37' },
  { title: 'NEW STYLE SASHIMI WITH WHITE FISH', price: '39' },
  { title: 'CRISPY RICE WITH SPICY TUNA', price: '37' },
  { title: 'TUNA TATAKI TOSAZU', price: '37' },
  { title: 'SASHIMI SALAD WITH MATSUHISA DRESSING', price: '39' },
  { title: 'LOBSTER SHIITAKE SALAD WITH SPICY LEMON DRESSING', price: '72' },
  { title: 'BABY SPINACH SALAD WITH LOBSTER', price: '72' },
  { title: 'BABY SPINACH SALAD WITH GRILLED SHRIMP', price: '42' },
  { title: 'WAGYU TATAKI WITH PONZU (2OZ)', price: '80' },
];

function MenuItem({ title, description, price, simple = false }) {
  const { translateLabel } = useLanguage();
  if (simple) {
    return (
      <div className="takeout-menu__item takeout-menu__item--simple">
        <p className="takeout-menu__item-title">{translateLabel(title)}</p>
        <div className="takeout-menu__item-price">{price}</div>
      </div>
    );
  }

  return (
    <div className="takeout-menu__item">
      <div className="takeout-menu__item-copy">
        <p className="takeout-menu__item-title">{translateLabel(title)}</p>
        {description ? <p className="takeout-menu__item-description">{translateLabel(description)}</p> : null}
      </div>
      <div className="takeout-menu__item-price">{price}</div>
    </div>
  );
}

function TakeOutMenu() {
  const { translateLabel } = useLanguage();
  return (
    <>
      <section className="takeout-menu-band" aria-hidden="true">
        <h2>{translateLabel("TAKEOUT MENU")}</h2>
      </section>

      <section className="takeout-menu" aria-labelledby="takeout-menu-heading">
        <div className="takeout-menu__tabs" role="tablist" aria-label={translateLabel("Takeout menu type")}>
          <button type="button" className="takeout-menu__tab takeout-menu__tab--active" role="tab" aria-selected="true">
            {translateLabel("LUNCH")}
          </button>
          <button type="button" className="takeout-menu__tab" role="tab" aria-selected="false">
            {translateLabel("DINNER")}
          </button>
        </div>

        <header className="takeout-menu__header">
          <p className="takeout-menu__label" id="takeout-menu-heading">
            {translateLabel("TAKEOUT LUNCH MENU")}
          </p>
          <p className="takeout-menu__meta">Mon - Fri</p>
        </header>

        <div className="takeout-menu__section">
          <h3 className="takeout-menu__section-title">{translateLabel("FUKU SELECT BENTO")}</h3>
          <div className="takeout-menu__item takeout-menu__item--description-only">
            <p className="takeout-menu__item-description">
              {translateLabel("SASHIMI SALAD, ASSORTED SUSHI, BLACK COD WITH MISO, TENDERLOIN ANTICUCHO & MISO SOUP")}
            </p>
            <div className="takeout-menu__item-price">59</div>
          </div>
        </div>

        <div className="takeout-menu__section">
          <h3 className="takeout-menu__section-title">{translateLabel("BENTO BOXES")}</h3>
          <p className="takeout-menu__section-note takeout-menu__section-note--italic">
            {translateLabel("Includes Tomato Ceviche, Rice, Miso Soup & Matcha Cookie")}
          </p>
          <div className="takeout-menu__list">
            {bentoBoxes.map((item) => (
              <MenuItem key={item.title} {...item} />
            ))}
          </div>
        </div>

        <div className="takeout-menu__section">
          <h3 className="takeout-menu__section-title">{translateLabel("GRILLED")}</h3>
          <p className="takeout-menu__section-note takeout-menu__section-note--sauce">
            {translateLabel("*CHOICE OF SAUCE: TERIYAKI, WASABI PEPPER OR ANTICUCHO")}
          </p>
          <div className="takeout-menu__list">
            {grilledItems.map((item) => (
              <MenuItem key={item.title} {...item} />
            ))}
          </div>
        </div>

        <div className="takeout-menu__section">
          <h3 className="takeout-menu__section-title">{translateLabel("TACOS")}</h3>
          <MenuItem
            title={translateLabel("TACO BOX")}
            description={translateLabel("Build your own: includes 6 taco shells and a choice of up to three proteins")}
            price="$60"
          />
          <p className="takeout-menu__section-note takeout-menu__section-note--small">
            {translateLabel("(1 PROTEIN PAIR PAIR OF TACOS)")}
          </p>
          <p className="takeout-menu__section-note takeout-menu__section-note--small takeout-menu__section-note--caps">
            {translateLabel("TUNA | SALMON | YELLOWTAIL | LOBSTER* | WAGYU*")}
          </p>
          <p className="takeout-menu__section-note takeout-menu__section-note--small">
            {translateLabel("*ADDITIONAL CHARGES APPLY FOR LOBSTER ($3.00 PER TACO) AND WAGYU ($12.00 PER TACO)")}
          </p>
        </div>

        <div className="takeout-menu__section">
          <h3 className="takeout-menu__section-title">{translateLabel("COLD DISHES")}</h3>
          <div className="takeout-menu__list takeout-menu__list--narrow">
            {coldDishes.map((item) => (
              <MenuItem key={item.title} {...item} simple />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export default TakeOutMenu;
