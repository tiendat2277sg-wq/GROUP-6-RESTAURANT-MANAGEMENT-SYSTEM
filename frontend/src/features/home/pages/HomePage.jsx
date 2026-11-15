import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import HeroSection from '../components/HeroSection.jsx';
import SignatureDishCarousel from '../components/SignatureDishCarousel.jsx';
import GiftCardSection from '../components/GiftCardSection.jsx';
import OfferingBlock from '../components/OfferingBlock.jsx';
import CinematicIntro from '@/components/ui/CinematicIntro.jsx';
import { homeImages } from '../data/homeAssets.js';
import { eveningProgram } from '../data/eveningProgram.js';
import '../styles/home.css';

/**
 * Intro timing (all in ms, aligned with CinematicIntro.jsx constants):
 *
 *  0    — Overlay appears. "Hello" shows.
 *  800  — Word cycle starts: Warm · Crafted · Refined
 *  2260 — "FUKU" appears
 *  2940 — Arc curtain begins rising
 *  4040 — Arc done → overlay starts fade out
 *  4420 — Overlay gone. navbar slides in. video starts.
 *
 *  TOTAL visible intro: ~4.4s
 *
 *  T_DONE (below): when onDone fires from CinematicIntro
 *  We give HOME 380ms of overlap so content starts appearing
 *  just as the last pixels of arc clear the screen.
 */

// sessionStorage key — only plays once per browser session
const STORAGE_KEY = 'phurai_intro_seen';

function Home() {
  const { translateLabel } = useLanguage();
  const location  = useLocation();
  const seenIntro = () => !!sessionStorage.getItem(STORAGE_KEY);

  const [showIntro, setShowIntro] = useState(() => !seenIntro());
  const [revealUI, setRevealUI]   = useState(() => seenIntro());

  // Called by CinematicIntro when arc animation completes
  const handleIntroDone = useCallback(() => {
    sessionStorage.setItem(STORAGE_KEY, 'true');
    setShowIntro(false);
    // Slight stagger — let overlay fully fade before enabling scroll / nav
    setTimeout(() => {
      setRevealUI(true);
      document.body.classList.remove('intro-running');
    }, 420);
  }, []);

  useEffect(() => {
    if (!seenIntro()) {
      document.body.classList.add('intro-running');
      // Safety fallback: if intro never calls onDone (e.g. framer-motion blocked)
      // New intro total ≈ 4.7s: Hello(0.78) + Welcome(0.93) + To(0.56) + FUKU(1.13) + arc(0.85) + exit(0.5)
      const fallback = setTimeout(() => {
        handleIntroDone();
      }, 7000);
      return () => {
        clearTimeout(fallback);
        document.body.classList.remove('intro-running');
      };
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to #about section when hash changes
  useEffect(() => {
    if (location.hash !== '#about') return undefined;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    const timer = window.setTimeout(() => {
      document.getElementById('about-section')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 100);
    return () => window.clearTimeout(timer);
  }, [location.pathname, location.hash]);

  return (
    <>
      <AnimatePresence>
        {showIntro && (
          <CinematicIntro key="intro" onDone={handleIntroDone} />
        )}
      </AnimatePresence>

      <div className="phurai-home">
        <div className="phurai-home__header-wrap">
          <HeroSection
            isRevealReady={revealUI}
            isVideoPlaying={!showIntro}
          />
        </div>

        <main>
          <div id="about-section">
            <OfferingBlock
              label={translateLabel("THỰC ĐƠN THEO MÙA")}
              title={translateLabel("Hôm nay, đầu bếp chọn gì?")}
              description={translateLabel("Ở FUKU, bạn chọn omakase và để đầu bếp dẫn dắt bữa ăn. Từng món được dọn theo thứ tự riêng, từ lát sashimi thanh nhẹ đến món nóng và vị ngọt cuối bữa. Hãy cho chúng tôi biết nếu bạn có dị ứng khi đặt chỗ.")}
              imageSrc={homeImages.offeringSushi}
              imageAlt={translateLabel("Sushi và sashimi trong thực đơn omakase")}
            />
          </div>
          <OfferingBlock
            label={translateLabel("TỐI THỨ SÁU · THỨ BẢY · CHỦ NHẬT")}
            title={translateLabel("Một buổi tối cùng nghệ thuật Nhật Bản")}
            description={eveningProgram + ' Chọn một trong ba buổi tối này khi đặt chỗ để kết hợp bữa omakase với chương trình tại nhà hàng.'}
            imageSrc={homeImages.taikoPerformance}
            imageAlt={translateLabel("Các nghệ sĩ đánh trống Taiko trên sân khấu dưới ánh đèn đỏ")}
            reverse
          />
          <SignatureDishCarousel />
          <GiftCardSection />
        </main>
      </div>
    </>
  );
}

export default Home;
