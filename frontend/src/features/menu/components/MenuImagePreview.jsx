import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { courseDetails, courseImage, setMenus } from '../data/omakaseMenus.js';

function OmakasePreview({ dish, courses, onClose }) {
  const { translateLabel } = useLanguage();
  const dialog = useRef(null);
  const [index, setIndex] = useState(0);
  const name = courses[index];
  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);
  return createPortal(
    <dialog ref={dialog} className="omakase-gallery" aria-label={dish.name}
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.target === dialog.current) onClose(); }}>
      <div className="omakase-gallery__body">
        <button type="button" className="menu-image-preview__close" aria-label={translateLabel("Đóng")} onClick={onClose}>×</button>
        <p>{translateLabel(dish.name)}</p>
        <img src={courseImage(name)} alt={translateLabel(name)} />
        <div aria-live="polite">
          <small>{translateLabel(dish.categoryId === 'chefs-set-menu' ? 'Điểm nhấn' : 'Món')} {index + 1} / {courses.length}</small>
          <h3>{translateLabel(name)}</h3>
          <p className="omakase-gallery__description">{translateLabel(courseDetails[name].description)}</p>
        </div>
        <nav aria-label={translateLabel("Thứ tự lên món")}>
          <button type="button" disabled={index === 0} onClick={() => setIndex(index - 1)}>{translateLabel("← Món trước")}</button>
          <button type="button" disabled={index === courses.length - 1} onClick={() => setIndex(index + 1)}>{translateLabel("Món tiếp →")}</button>
        </nav>
      </div>
    </dialog>, document.body
  );
}

function MenuImagePreview({ dish, onClose }) {
  const { translateLabel } = useLanguage();
  const [closing, setClosing] = useState(false);

  const handleClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(() => {
      setClosing(false);
      onClose();
    }, 220);
  }, [closing, onClose]);

  useEffect(() => {
    if (!dish) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !setMenus[dish.id]) handleClose();
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [dish, handleClose]);

  if (!dish) return null;
  if (setMenus[dish.id]) {
    return <OmakasePreview key={dish.id} dish={dish} courses={setMenus[dish.id]} onClose={onClose} />;
  }

  return createPortal(
    <div
      className={`menu-image-preview${closing ? ' menu-image-preview--closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="menu-image-preview-title"
    >
      <div
        className="menu-image-preview__overlay"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div className="menu-image-preview__content">
        <button
          type="button"
          className="menu-image-preview__close"
          onClick={handleClose}
          aria-label={translateLabel("Close image preview")}
        >
          ×
        </button>
        <img src={dish.image} alt={dish.name} className="menu-image-preview__image" />
        
      </div>
    </div>,
    document.body
  );
}

export default MenuImagePreview;
