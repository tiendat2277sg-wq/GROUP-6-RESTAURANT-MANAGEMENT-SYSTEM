import React, { useMemo } from 'react';
import { LockKeyhole } from 'lucide-react';
import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
import { SHAPES, getChairPositions } from '../../config/floorPlanConfig';
import '../../styles/table-board.css';

export default function TableUnit({ tableData, capacity, status, isSelected, isDimmed, isHidden, onClick, onShowTooltip, onHideTooltip }) {
  const {language}=useLanguage();
  const locked=!['Available','CurrentTable'].includes(status);
  const profile = SHAPES[tableData.type];

  const handleTableClick = (e) => {
    onHideTooltip();
    if (status === 'OutOfArea' || status === 'SelectionFull') return; // greyed out by the area filter / selection already complete
    onClick(tableData.id);
  };

  const chairs = useMemo(() => getChairPositions(profile), [profile]);

  const maxRy = profile.shape === 'circle' ? profile.r : (profile.shape === 'rect' ? profile.h / 2 : profile.ry);
  // Keep the label below the outer edge of the bottom chair, not over its seat.
  const textY = maxRy + profile.gap + 27;

  let shapeSVG = null;
  if (profile.shape === 'circle') {
    shapeSVG = <circle className="table-shape" r={profile.r} fill={tableData.fill || "#dceaf5"} stroke="#2f7d4f" strokeWidth="2" />;
  } else if (profile.shape === 'ellipse') {
    shapeSVG = <ellipse className="table-shape" rx={profile.rx} ry={profile.ry} fill={tableData.fill || "#dceaf5"} stroke="#2f7d4f" strokeWidth="2" />;
  } else if (profile.shape === 'rect') {
    shapeSVG = (
      <rect
        className="table-shape"
        x={-profile.w / 2}
        y={-profile.h / 2}
        width={profile.w}
        height={profile.h}
        rx={profile.rx}
        ry={profile.ry}
        fill={tableData.fill || "#dceaf5"}
        stroke="#2f7d4f"
        strokeWidth="2"
      />
    );
  }

  let statusClass = 'available';
  if (isSelected) {
    statusClass = 'selected';
  } else if (status === 'CurrentTable') {
    statusClass = 'current-table';
  } else if (status === 'Occupied') {
    statusClass = 'occupied';
  } else if (status === 'Reserved') {
    statusClass = 'reserved';
  } else if (status === 'Cleaning') {
    statusClass = 'cleaning';
  } else if (status === 'OutOfArea' || status === 'SelectionFull') {
    statusClass = 'inactive';
  } else if (status === 'InvalidCapacity') {
    statusClass = 'inactive';
  } else if (status === 'Inactive') {
    statusClass = 'inactive';
  }

  const style = {
    '--table-fill': tableData.fill || '#dceaf5',
    '--chair-fill': tableData.chair || '#cfe3da',
    opacity: isDimmed ? 0.35 : 1,
    visibility: isHidden ? 'hidden' : 'visible',
    cursor: locked ? 'not-allowed' : 'pointer',
    pointerEvents: 'auto',
    transition: 'opacity 0.2s ease'
  };

  return (
    <g
      id={`tbl-${tableData.id}`}
      className={`table-unit ${statusClass}${locked ? ' is-locked' : ''}`}
      data-id={tableData.id}
      data-capacity={profile.seats || profile.n}
      role="button"
      tabIndex={isDimmed || status === 'OutOfArea' ? -1 : 0}
      aria-label={`${tableData.id}, ${capacity || profile.seats || profile.n} ${language==='vi'?'chỗ':'seats'}${locked ? (language==='vi'?', không thể chọn':', unavailable') : ''}`}
      aria-pressed={Boolean(isSelected)}
      transform={`translate(${tableData.x},${tableData.y})`}
      style={style}
      onClick={handleTableClick}
      onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();handleTableClick(event);}}}
      onMouseEnter={onShowTooltip}
      onMouseLeave={onHideTooltip}
    >
      {chairs.map((p, index) => (
        <rect
          key={index}
          className="chair"
          x={(p.x - 9).toFixed(1)}
          y={(p.y - 7).toFixed(1)}
          width="18"
          height="14"
          rx="4"
          transform={`rotate(${p.rot.toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)})`}
        />
      ))}
      {shapeSVG}
      {locked && !profile.labelInside && <LockKeyhole x={maxRy+12} y={-maxRy-16} width={18} height={18} className="table-lock" aria-hidden="true" />}
      {profile.labelInside ? (
        <text className="table-label" y="4" textAnchor="middle" style={{ fontSize: 11, fontWeight: 700, pointerEvents: 'none' }}>
          {String(tableData.id).replace(/^[A-Za-z]+-0*/, '')}
        </text>
      ) : (
        <text className="table-label" y={textY}>
          {tableData.id}
        </text>
      )}
    </g>
  );
}
