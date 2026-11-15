import SetMenuArtwork from './SetMenuArtwork.jsx';
import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
import React from 'react';
import { motion } from 'framer-motion';
import { formatVND } from '@/core/utils/formatCurrency.js';
import OutlineButton from '@/components/common/OutlineButton.jsx';
import { setMenus } from '../data/omakaseMenus.js';
import { resolveDishImage } from '../data/menuAssets.js';
import '../styles/liquidGlass.css';


export default function AIDishRecommendations({
  recommendedDishes = [], onOpenVisualSearch, onPreviewImage,
  canAddToCart = false, isDineInOnly = () => false, onAddToCart,
}) {
  const { translateLabel } = useLanguage();
  const defaultRecommendations = [
    {
      id: 'ai-rec-1',
      name: 'YELLOWTAIL JALAPEÑO',
      price: 320000,
      image_url: '/src/assets/images/menu/menu-yellowtail-jalapeno.jpg',

      aiReason: 'delicately sliced yellowtail sashimi with touches of garlic puree & jalapeno'
    },
    {
      id: 'ai-rec-2',
      name: 'TORO TARTARE WITH CAVIAR',
      price: 428000,
      image_url: '/src/assets/images/menu/menu-toro-tartare.jpg',

      aiReason: 'finely chopped bluefin toro topped with ossetra caviar and wasabi soy'
    },
    {
      id: 'ai-rec-3',
      name: 'FLUKE SASHIMI DRY MISO',
      price: 188000,
      image_url: '/src/assets/images/menu/menu-fluke-sashimi.jpg',

      aiReason: 'yuzu juice, extra virgin olive oil, dry miso, chives'
    },
    {
      id: 'ai-rec-4',
      name: 'NEW STYLE SASHIMI',
      price: 228000,
      image_url: '/src/assets/images/menu/menu-new-style-sashimi.jpg',

      aiReason: 'seared with hot sesame and olive oil, garlic puree, and ginger'
    },
    {
      id: 'ai-rec-5',
      name: 'SALMON NEW STYLE',
      price: 168000,
      image_url: '/src/assets/images/menu/menu-salmon-new-style.jpg',

      aiReason: 'thinly sliced fresh salmon lightly seared with hot oil blend'
    },
    {
      id: 'ai-rec-6',
      name: 'SEAFOOD UDON',
      price: 148000,
      image_url: '/src/assets/images/menu/menu-seafood-udon.jpg',

      aiReason: 'stir-fried thick udon noodles with fresh seafood and spicy broth'
    }
  ];


  const dishesToDisplay = recommendedDishes.length > 0 
    ? recommendedDishes.slice(0, 6).map(d => ({
        ...d,

        aiReason: d.description || d.aiReason || 'chef signature recommendation'
      }))
    : defaultRecommendations;

  const handleCardImageClick = (dish) => {
    onPreviewImage?.({ ...dish,
      name: dish.name || dish.dish_name,
      image: resolveDishImage(dish.image_url || dish.image)
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 18 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <section className="liquid-glass-container" style={{ margin: '24px 0', padding: '32px 28px', background: '#ffffff', borderRadius: '24px', border: '1px solid rgba(208, 197, 186, 0.5)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--menu-text, #342716)', margin: 0, letterSpacing: '-0.01em' }}>
              {translateLabel("Khám phá món ăn")}
            </h2>

          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.86rem', color: 'var(--menu-body, #4d463d)' }}>
            {translateLabel("Một số món trong danh mục đang xem.")}
          </p>
        </div>

        {/* Apple Liquid Glass Visual Search Trigger Button */}
        <motion.button
          type="button"
          onClick={onOpenVisualSearch}
          className="apple-liquid-glass-btn"
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.96 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ffffff' }}>
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <path d="M11 8v6M8 11h6"></path>
          </svg>
          {translateLabel("Search by AI Image")}
        </motion.button>

      </div>

      {/* Recommendations Grid with Synchronized Typography */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
          gap: '24px'
        }}
      >
        {dishesToDisplay.map((dish) => (
          <motion.div 
            key={dish.id || dish.dish_id || dish.name}
            variants={itemVariants}
            whileHover={setMenus[dish.id] ? undefined : { y: -6, scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className={setMenus[dish.id] ? "apple-liquid-glass-card omakase-recommendation" : "apple-liquid-glass-card"}
            style={{
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >

            <div>
              {/* Image with zoom-in cursor & Lightbox preview on click */}
              <div 
                onClick={() => handleCardImageClick(dish)}
                style={{ 
                  position: 'relative', 
                  marginBottom: '16px', 
                  borderRadius: '12px', 
                  overflow: 'hidden', 
                  aspectRatio: setMenus[dish.id] ? 'auto' : '4 / 3', 
                  cursor: 'zoom-in',
                  background: '#f5f1ea' 
                }}
              >
                <SetMenuArtwork dish={dish}
                  src={resolveDishImage(dish.image_url || dish.image)} 
                  alt={dish.name || dish.dish_name}
                  style={{ width: '100%', height: setMenus[dish.id] ? 'auto' : '100%', display: 'block', objectFit: setMenus[dish.id] ? 'contain' : 'cover', transition: 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)' }}
                  className={setMenus[dish.id] ? undefined : "hover:scale-105"}
                />


              </div>

              {/* Title matching site menu-item__name font & gold color */}
              <h3 
                onClick={() => handleCardImageClick(dish)}
                style={{ 
                  fontSize: '1rem', 
                  fontWeight: '600', 
                  color: 'var(--menu-gold, #9b845e)', 
                  margin: '0 0 6px 0', 
                  textTransform: 'uppercase', 
                  letterSpacing: '1.5px', 
                  lineHeight: '1.4',
                  cursor: 'pointer'
                }}
              >
                {translateLabel(dish.name || dish.dish_name)}
              </h3>

              {/* Description matching site menu-item__desc font & muted color */}
              <p style={{ fontSize: '0.84rem', fontWeight: '400', color: 'var(--menu-body, #4d463d)', margin: '0 0 16px 0', lineHeight: '1.4', letterSpacing: '0.14px' }}>
                {translateLabel(dish.aiReason)}
              </p>
            </div>

            {/* Price matching site menu-item__price font */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '8px' }}>
              <span className="menu-card__price" style={{ fontSize: '1.1rem', fontWeight: '800', fontFamily: 'var(--font-body, "Hanken Grotesk", system-ui, sans-serif)', color: 'var(--menu-text, #342716)' }}>
                {formatVND(dish.price)}
              </span>
              {canAddToCart && !isDineInOnly(dish) && dish.dish_id && dish.is_available !== false && dish.is_available !== 0 ? (
                <button
                  type="button"
                  onClick={() => onAddToCart?.(dish)}
                  aria-label={translateLabel("Add Item") + ' · ' + translateLabel(dish.name || dish.dish_name)}
                  className="menu-recommendation-add"
                >
                  <span aria-hidden="true">+</span> {translateLabel("Add Item")}
                </button>
              ) : null}
            </div>

          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
