import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
import accessibilityIcon from '@/assets/icons/accessibility.svg';
import scrollTopAltIcon from '@/assets/icons/scroll-top-alt.svg';

function FloatingUtilityButtons() {
  const { translateLabel } = useLanguage();
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="phurai-floating-utils" aria-label={translateLabel("Utility controls")}>
      <button type="button" className="phurai-floating-utils__btn" aria-label={translateLabel("Accessibility")}>
        <img src={accessibilityIcon} alt="" className="icon nav-icon" />
      </button>
      <button
        type="button"
        className="phurai-floating-utils__btn"
        aria-label={translateLabel("Back to top")}
        onClick={scrollToTop}
      >
        <img src={scrollTopAltIcon} alt="" className="icon nav-icon" />
      </button>
    </div>
  );
}

export default FloatingUtilityButtons;
