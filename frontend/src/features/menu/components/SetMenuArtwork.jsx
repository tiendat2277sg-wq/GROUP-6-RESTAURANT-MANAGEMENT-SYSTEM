import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
import { setMenus } from '../data/omakaseMenus.js';

const kaisekiCounts = { 'combo-4': 7, 'combo-6': 9, 'combo-10': 12 };

export default function SetMenuArtwork({ dish, ...imageProps }) {
  const { language, translateLabel } = useLanguage();
  const courses = setMenus[dish.id];
  if (language === 'vi' || !courses) return <img {...imageProps} />;

  const count = kaisekiCounts[dish.id];
  return (
    <span className="set-menu-sheet-en">
      <span className="set-menu-sheet-en__brand">FUKU</span>
      <strong>{dish.name.toLowerCase()}</strong>
      <span className="set-menu-sheet-en__type">{count ? 'Kaiseki' : 'Omakase'} · {count ?? courses.length} courses</span>
      {count && <span className="set-menu-sheet-en__highlights">Set highlights</span>}
      {courses.map((name, index) => (
        <span className="set-menu-sheet-en__row" key={name}>
          <span>{String(index + 1).padStart(2, '0')}</span>
          <span>{translateLabel(name)}</span>
        </span>
      ))}
    </span>
  );
}
