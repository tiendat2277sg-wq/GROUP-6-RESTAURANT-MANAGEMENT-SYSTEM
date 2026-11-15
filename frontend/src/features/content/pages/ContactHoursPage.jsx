import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
import { useRef } from "react";
import heroImage from "@/assets/images/contact-hours/contact-hero.jpg";
import mapImage from "@/assets/images/contact-hours/contact-map.jpg";
import atmosphereImage from "@/assets/images/contact-hours/contact-atmosphere.jpg";
import "../styles/contactHours.css";

const CONTACT_EMAIL = "tiendat1177sg@gmail.com";
const MAPS_URL = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent("128 Đỗ Bá, Đà Nẵng, Việt Nam");
const sendMail = () => { window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${CONTACT_EMAIL}`, "_blank", "noopener"); };

function HoursColumn({ title, blocks }) {
  const { translateLabel } = useLanguage();
  return (
    <div className="contact-hours-hours__column">
      <h3>{translateLabel(title)}</h3>
      {blocks.map((block) => (
        <div className="contact-hours-hours__block" key={block.label}>
          <p className="contact-hours-hours__label">{translateLabel(block.label)}</p>
          {block.lines.map((line) => (
            <p className="contact-hours-hours__line" key={line}>
              {line}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}

function ContactHours() {
  const { translateLabel } = useLanguage();
  const hoursRef = useRef(null);

  const scrollToHours = () => {
    hoursRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  };

  return (
    <main className="contact-hours-page">
      <section className="contact-hours-hero" aria-label={translateLabel("Contact and hours hero")}>
        <img
          className="contact-hours-hero__image"
          src={heroImage}
          alt={translateLabel("FUKU sashimi platter")}
        />
        <div className="contact-hours-hero__overlay">
          <div className="contact-hours-hero__card">
            <span className="contact-hours-hero__dash" aria-hidden="true" />
            <h1 className="contact-hours-hero__title">
              {translateLabel("CONTACT &")}
              <br />
              {translateLabel("HOURS")}
            </h1>
            <button
              type="button"
              className="contact-hours-hero__cta"
              onClick={scrollToHours}
            >
              {translateLabel("REGULAR HOURS")}
            </button>
          </div>
        </div>
      </section>

      <section
        id="contact-hours-regular"
        ref={hoursRef}
        className="contact-hours-regular"
        aria-labelledby="contact-hours-regular-title"
      >
        <div className="contact-hours-regular__inner">
          <h2 id="contact-hours-regular-title">{translateLabel("REGULAR HOURS")}</h2>
          <div className="contact-hours-hours__grid">
            {["DINING ROOM","BAR LOUNGE","TAKEOUT HOURS"].map((title) => (
              <HoursColumn
                key={title}
                title={translateLabel(title)}
                blocks={[
                  { label: "Lunch", lines: ["Mỗi ngày", "10:00 – 15:00"] },
                  { label: "Dinner", lines: ["Mỗi ngày", "17:00 – 22:00"] },
                ]}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="contact-hours-info" aria-label={translateLabel("Contact information")}>
        <div className="contact-hours-info__inner">
          <div className="contact-hours-info__left">
            <div className="contact-hours-info__map">
              <img src={mapImage} alt={translateLabel("Map showing FUKU location")} />
            </div>
            <div className="contact-hours-info__details">
              <div className="contact-hours-info__detail">
                <h3>{translateLabel("ADDRESS")}</h3>
                <p className="contact-hours-info__text">
                  128 Đỗ Bá
                  <br />
                  Đà Nẵng, Việt Nam
                </p>
                <button type="button" className="contact-hours-info__btn" onClick={() => window.open(MAPS_URL, "_blank", "noopener")}>
                  {translateLabel("DIRECTIONS")}
                </button>
              </div>
              <div className="contact-hours-info__detail">
                <h3>{translateLabel("CONTACT")}</h3>
                <p className="contact-hours-info__text">0966 783 333</p>
                <button type="button" className="contact-hours-info__btn" onClick={sendMail} style={{ textTransform: "none", letterSpacing: "0.02em" }}>
                  {CONTACT_EMAIL}
                </button>
              </div>
            </div>
          </div>

          <div className="contact-hours-info__right">
            <div className="contact-hours-info__card">
              <h3>{translateLabel("PRESS INQUIRIES")}</h3>
              <button type="button" className="contact-hours-info__btn" onClick={sendMail} style={{ textTransform: "none", letterSpacing: "0.02em" }}>
                {CONTACT_EMAIL}
              </button>
            </div>
            <div className="contact-hours-info__card">
              <h3>
                {translateLabel("REQUEST RECEIPT")}
                <br />
                {translateLabel("COPY")}
              </h3>
              <button type="button" className="contact-hours-info__btn" onClick={sendMail} style={{ textTransform: "none", letterSpacing: "0.02em" }}>
                {CONTACT_EMAIL}
              </button>
            </div>
            <div className="contact-hours-info__atmosphere">
              <img src={atmosphereImage} alt={translateLabel("FUKU dining atmosphere")} />
            </div>
          </div>
        </div>
      </section>

      <section className="contact-hours-top">
        <button type="button" className="contact-hours-top__btn" onClick={scrollToTop}>
          {translateLabel("Go to top")}
        </button>
      </section>
    </main>
  );
}

export default ContactHours;
// touch17
// touch18
// touch19
// touch20
