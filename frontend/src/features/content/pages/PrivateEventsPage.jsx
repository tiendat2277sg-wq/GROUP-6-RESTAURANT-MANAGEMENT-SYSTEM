import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
import heroImage from "@/assets/images/private-events/private-events-hero.jpg";
import diningImage from "@/assets/images/private-events/private-events-dining.jpg";
import waveWallImage from "@/assets/images/private-events/wave-wall.jpg";
import northAlcoveImage from "@/assets/images/private-events/north-alcove.jpg";
import entireDiningRoomImage from "@/assets/images/private-events/entire-dining-room.jpg";
import sakeTableImage from "@/assets/images/private-events/sake-table.jpg";
import candleRoomImage from "@/assets/images/private-events/candle-room.jpg";
import malibuTableImage from "@/assets/images/private-events/malibu-table.jpg";
import interactiveStationsImage from "@/assets/images/private-events/interactive-stations.jpg";
import phuraiCateringImage from "@/assets/images/private-events/phurai-catering.jpg";
import "../styles/privateEvents.css";

const spaces = [
  {
    title: "WAVE WALL",
    level: "STREET LEVEL",
    description:
      "Situated at the far west end of the Bar & Lounge, the Wave Wall is well suited for a simple gathering of light bites and beverages. Guests will have their own dedicated staff, but no access to the bar.",
    capacity: "Capacity: 25 standing",
    minimum: "Food & Beverage Minimum will apply",
    image: waveWallImage,
    imageAlt: "Wave Wall bar area at FUKU",
    reverse: false,
  },
  {
    title: "NORTH ALCOVE",
    level: "STREET LEVEL",
    description:
      "The North Alcove in the lounge is ideal for an intimate dinner or reception. This secluded enclave offers privacy while maintaining the vibrant atmosphere of the lounge.",
    capacity: "Capacity: 12 standing, 10 seated",
    minimum: "Food & Beverage Minimum will apply",
    image: northAlcoveImage,
    imageAlt: "North Alcove private dining area",
    reverse: true,
  },
  {
    title: "ENTIRE DINING ROOM",
    level: "LOWER LEVEL",
    description:
      "The 2,300-square-foot main dining room features the heart of the restaurant - the sushi bar with an open kitchen in the background. Grand architecture meets artisanal craftsmanship.",
    capacity: "Entire Floor Capacity: 120 seated, 150 standing",
    minimum: "Food & Beverage Minimum will apply",
    image: entireDiningRoomImage,
    imageAlt: "Entire dining room at FUKU",
    reverse: false,
  },
  {
    title: "SAKE TABLE",
    level: "LOWER LEVEL",
    description:
      "Alongside the Main Dining Room, the Sake Table is bookended with custom sake vases. A semi-private communal experience that honors the tradition of shared spirits.",
    capacity: "Capacity: 14 seated",
    minimum: "Food & Beverage Minimum may apply",
    image: sakeTableImage,
    imageAlt: "Sake Table communal dining",
    reverse: true,
  },
  {
    title: "CANDLE ROOM",
    level: "LOWER LEVEL",
    description:
      "Designed with candle work illuminating the blue tile walls, this room is situated off the main dining area. Velvet drapery provides visual privacy for a truly exclusive experience.",
    capacity: "Capacity: 40 seated",
    minimum: "Food & Beverage Minimum will apply",
    image: candleRoomImage,
    imageAlt: "Candle Room private dining",
    reverse: false,
  },
  {
    title: "MALIBU TABLE",
    level: "LOWER LEVEL",
    description:
      "A large round table within the Candle Room. Perfect for seated events of 8 to 14 guests. This space has visual privacy with floor to ceiling velvet drapery.",
    capacity: "Capacity: 14 seated",
    minimum: "Food & Beverage Minimum will apply",
    image: malibuTableImage,
    imageAlt: "Malibu Table seating area",
    reverse: true,
  },
];

const stationItems = [
  "Hand Roll Station",
  "Sashimi Bar",
  "Whole Fish Sashimi FUKU Style",
  "Wagyu Slicing",
  "Japanese Whisky Tasting",
  "Hokusetsu Sake Sampling",
];

function SpaceRow({ title, level, description, capacity, minimum, image, imageAlt, reverse }) {
  const { translateLabel } = useLanguage();
  const textPanel = (
    <div className="private-events-split__text">
      <p className="private-events-space__level">{level}</p>
      <h3 className="private-events-space__title">{translateLabel(title)}</h3>
      <p className="private-events-space__description">{translateLabel(description)}</p>
      <div className="private-events-space__meta">
        <p>{capacity}</p>
        <p>{minimum}</p>
      </div>
    </div>
  );

  const imagePanel = (
    <div className="private-events-split__media">
      <img src={image} alt={imageAlt} />
    </div>
  );

  return (
    <article className="private-events-split private-events-split--space">
      {reverse ? (
        <>
          {imagePanel}
          {textPanel}
        </>
      ) : (
        <>
          {textPanel}
          {imagePanel}
        </>
      )}
    </article>
  );
}

function PrivateEvents({ onNavigate }) {
  const { translateLabel } = useLanguage();
  const handleCateringLink = (event) => {
    event.preventDefault();
    onNavigate?.("catering");
  };

  return (
    <main className="private-events-page">
      <section className="private-events-hero" aria-label={translateLabel("Private events hero")}>
        <img
          className="private-events-hero__image"
          src={heroImage}
          alt={translateLabel("FUKU restaurant interior")}
        />
      </section>

      <section className="private-events-intro">
        <div className="private-events-intro__inner">
          <h1 className="private-events-intro__title">{translateLabel("FUKU PRIVATE EVENTS")}</h1>
          <p className="private-events-intro__lead">
            {translateLabel("Situated in the heart of the city in a stunning landmark building, FUKU features 4,700 square feet of event space including the street-level Bar & Lounge with 30-foot ceilings and the subterranean Main Dining Room. For intimate dinners or large-scale events in an expansive multilevel space, FUKU offers exceptional experiences in a historic setting.")}
          </p>
          <p className="private-events-intro__note">
            {translateLabel("We are also available for offsite catering. For a personal consultation, please submit an inquiry below. Please note the restaurant does not have fully private rooms.")}
          </p>
          <button type="button" className="private-events-intro__cta">
            {translateLabel("INQUIRE NOW")}
          </button>
        </div>
      </section>

      <section className="private-events-hire">
        <div className="private-events-hire__grid">
          <div className="private-events-hire__image-wrap">
            <img src={diningImage} alt={translateLabel("Communal dining table at FUKU")} />
          </div>
          <div className="private-events-hire__copy">
            <div className="private-events-hire__column">
              <h2>{translateLabel("EXCLUSIVE RESTAURANT HIRE")}</h2>
              <p>
                {translateLabel("FUKU is available for exclusive hire. With 30-foot columns, the street-level bar & lounge features a circular bar with a unique floating sculpture inspired by Japanese calligraphy. The lower level dining offers the centerpiece sushi bar with an open kitchen in the background.")}
              </p>
            </div>
            <div className="private-events-hire__column">
              <h2>{translateLabel("OFF PREMISE")}</h2>
              <p>
                {translateLabel("Offsite catering offers a unique opportunity to have FUKU favorites from the comfort of your own home, a large-scale venue, or an exotic location of your choice. Our experienced event team is happy to assist from your initial vision to the fruition of the event.")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="private-events-spaces-heading">
        <h2>{translateLabel("SPACES")}</h2>
      </section>

      <section className="private-events-spaces" aria-label={translateLabel("Event spaces")}>
        {spaces.map((space) => (
          <SpaceRow key={space.title} {...space} />
        ))}
      </section>

      <section className="private-events-menus">
        <h2>{translateLabel("EVENT MENUS")}</h2>
        <p>{translateLabel("Please inquire for most up-to-date menus.")}</p>
      </section>

      <section className="private-events-stations">
        <div className="private-events-split">
          <div className="private-events-split__media">
            <img
              src={interactiveStationsImage}
              alt={translateLabel("Chef preparing sushi for interactive station")}
            />
          </div>
          <div className="private-events-split__text private-events-stations__copy">
            <h2>{translateLabel("INTERACTIVE STATIONS")}</h2>
            <p>
              {translateLabel("Take your event to the next level with the addition of bespoke interactive stations. These unique offerings can present a visual array, shaping a memorable FUKU experience. 40 guests minimum.")}
            </p>
            <ul>
              {stationItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="private-events-catering">
        <div className="private-events-split">
          <div className="private-events-split__text private-events-catering__copy">
            <h2>{translateLabel("FUKU CATERING")}</h2>
            <p>
              {translateLabel("Order from our array of catering packages and platters for your next home or office party.")}
            </p>
            <p>
              {translateLabel("Please contact the events team for more information, or visit")}{" "}
              <button
                type="button"
                className="private-events-catering__link"
                onClick={handleCateringLink}
              >
                {translateLabel("here")}
              </button>{" "}
              {translateLabel("to place a catering order.")}
            </p>
          </div>
          <div className="private-events-split__media">
            <img src={phuraiCateringImage} alt={translateLabel("FUKU catering display")} />
          </div>
        </div>
      </section>
    </main>
  );
}

export default PrivateEvents;
