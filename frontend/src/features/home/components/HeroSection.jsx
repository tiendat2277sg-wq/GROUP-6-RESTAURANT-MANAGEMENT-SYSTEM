import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
import { useEffect, useRef, useState } from 'react';
import { Link } from "react-router-dom";
import { homeImages } from "../data/homeAssets.js";
import { useScrollReveal } from "@/hooks/useScrollReveal";

/**
 * HeroSection
 *
 * Video strategy:
 *   - src is SET IMMEDIATELY so browser preloads while intro overlay is on top.
 *   - .play() is only called once intro finishes (isVideoPlaying = true).
 *   - This eliminates the gray-flash: by the time the overlay lifts, video
 *     has already buffered its first frame.
 *   - The hero section has a black background-color as a further safety net.
 */
function HeroSection({ isRevealReady = true, isVideoPlaying = true }) {
  const { translateLabel } = useLanguage();
  const revealRef = useScrollReveal({ enabled: isRevealReady });
  const videoRef  = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isVideoPlaying) {
      video.play().catch(e => {
        if (e.name !== 'AbortError') {
          console.log('Video autoplay prevented:', e);
        }
      });
    } else {
      video.pause();
    }
  }, [isVideoPlaying]);

  return (
    <section className="phurai-hero" aria-label={translateLabel("Welcome")}>
      <video
        ref={videoRef}
        src={homeImages.heroVideo}
        className="phurai-hero__bg"
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
      />

      <div className="phurai-hero__overlay" aria-hidden="true" />

      <div className="phurai-hero__content home-reveal-parent" ref={revealRef}>
        <div className="phurai-hero__badge home-reveal-child">
          <span className="phurai-hero__badge-line" />
          <p>{translateLabel("NHÀ HÀNG OMAKASE NHẬT BẢN")}</p>
          <span className="phurai-hero__badge-line" />
        </div>

        <h1 className="phurai-hero__title home-reveal-child home-reveal-child--delay-1">
          Fuku <em>Omakase</em>
        </h1>

        <p className="phurai-hero__subtitle home-reveal-child home-reveal-child--delay-2">
          {translateLabel("Thực đơn theo mùa, do đầu bếp lựa chọn cho từng bữa ăn.")}
          <br />
          {translateLabel("Thưởng thức nghệ thuật truyền thống Nhật Bản mỗi tối thứ Sáu, thứ Bảy và Chủ nhật.")}
        </p>

        <div className="phurai-hero__actions home-reveal-child home-reveal-child--delay-3">
          <Link to="/menus?experience=omakase" className="phurai-btn-primary">
            {translateLabel("XEM THỰC ĐƠN")}
          </Link>
          <Link to="/reservations" className="phurai-btn-ghost">
            {translateLabel("ĐẶT CHỖ")}
          </Link>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;