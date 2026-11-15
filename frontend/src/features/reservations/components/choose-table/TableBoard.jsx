import { useLanguage } from '@/core/i18n/LanguageProvider.jsx';
import React, { useMemo, useState, useEffect } from 'react';
import { LockKeyhole, X, Search, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import {areaLabel} from './tablePresentation';
import FloorPlanSVG, { normalizeStatus } from './FloorPlanSVG';
import TablePreviewModal from './TablePreviewModal';
import { seatingKind, maxTablesForParty } from '../../utils/omakasePolicy.js';

function tableCodeAliases(code) {
  const value = String(code || '').trim().toUpperCase();
  const compact = value.replace(/-/g, '');
  const aliases = [value, compact];
  if (value.startsWith('PRE-')) aliases.push(`P${value.slice(4)}`);
  if (value.startsWith('PR-')) aliases.push(`R${value.slice(3)}`);
  return [...new Set(aliases)];
}

export default function TableBoard({
  tables = [],
  selectedTableId,
  selectedTableIds = [],
  allowMultiple = false,
  currentTableId,
  onSelectTable,
  onApplySelection,
  onCancelSelection,
  guestCount
}) {
  const { translateLabel,language } = useLanguage();
  const vi=language==='vi';
  const [activeFilter, setActiveFilter] = useState(null);
  const [activeAreaId, setActiveAreaId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewZoneImage, setViewZoneImage] = useState(null);
  const [previewTable, setPreviewTable] = useState(null);
  const [areaSelectionError, setAreaSelectionError] = useState('');
  const [draftTableIds, setDraftTableIds] = useState(() => selectedTableIds.length ? selectedTableIds.map(Number) : (selectedTableId ? [Number(selectedTableId)] : []));

  // Lifted Zoom & Pan states
  const [zoomScale, setZoomScale] = useState(1);
  const [fitMode,setFitMode]=useState('contain');
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const handleResetZoomAndPan = (mode='contain') => {
    setFitMode(mode);
    setZoomScale(1);
    setPan({ x: 0, y: 0 });
  };

  // The parent only changes after Apply. Keep the initial/draft selection in
  // sync when a new availability response or reservation is loaded, without
  // overwriting the user's in-progress clicks.
  useEffect(() => {
    const next = selectedTableIds.length
      ? selectedTableIds.map(Number)
      : (selectedTableId ? [Number(selectedTableId)] : []);
    setDraftTableIds(next.filter(Number.isFinite));
  }, [selectedTableId, selectedTableIds]);

  // We need to map config Table ID (e.g. "S-03") to API Table object
  const apiTableMap = useMemo(() => {
    const map = new Map();
    tables.forEach(t => {
      tableCodeAliases(t.table_number).forEach((key) => map.set(key, t));
    });
    return map;
  }, [tables]);

  const handleTableClick = (configId) => {
    const apiTable = tableCodeAliases(configId).map((key) => apiTableMap.get(key)).find(Boolean);
    const status = normalizeStatus(apiTable, guestCount, allowMultiple);
    // Preview first: guests see the real table image and then explicitly choose
    // Select or Deselect. Apply is still the single commit action.
    setPreviewTable({
      code: configId,
      apiTable,
      status,
      isSelected: Boolean(apiTable && draftTableIds.includes(Number(apiTable.table_id))),
    });
  };

  const selectedApiTable = useMemo(
    () => tables.find((t) => String(t.table_id) === String(selectedTableId)),
    [tables, selectedTableId]
  );
  const activeSelectedIds = draftTableIds;
  const selectedCapacity = tables
    .filter((table) => activeSelectedIds.map(String).includes(String(table.table_id)))
    .reduce((total, table) => total + Number(table.capacity || 0), 0);
  const areas = Array.from(new Map(tables.filter((table) => table.area_id).map((table) => [String(table.area_id), table])).values());
  // The rest of the tables lock only once the selection is complete (enough seats, or the table limit reached).
  const selectedForLock = tables.filter((table) => activeSelectedIds.map(String).includes(String(table.table_id)));
  const tableLimit = maxTablesForParty(guestCount, seatingKind(selectedForLock) === 'omakase');
  const selectionComplete = allowMultiple && activeSelectedIds.length > 0 && Number(guestCount) > 0
    && (selectedCapacity >= Number(guestCount) || activeSelectedIds.length >= tableLimit);
  const canApply = allowMultiple
    ? activeSelectedIds.length > 0 && selectedCapacity >= Number(guestCount || 0)
    : activeSelectedIds.length === 1;

  const handleDraftSelect = (tableId) => {
    const id = Number(tableId);
    if (!Number.isFinite(id)) return;
    setAreaSelectionError('');
    if (allowMultiple && !draftTableIds.includes(id)) {
      const nextTable = tables.find((table) => Number(table.table_id) === id);
      const currentTables = tables.filter((table) => draftTableIds.includes(Number(table.table_id)));
      if (nextTable && currentTables.length > 0
        && seatingKind([...currentTables, nextTable]) === 'mixed') {
        setAreaSelectionError(translateLabel("Omakase tables cannot be combined with tables from other areas."));
        return;
      }
    }
    // One booking may hold at most one table per 2 guests (one seat per guest at the Omakase counter).
    if (allowMultiple && !draftTableIds.includes(id)) {
      const nextTable = tables.find((table) => Number(table.table_id) === id);
      const currentTables = tables.filter((table) => draftTableIds.includes(Number(table.table_id)));
      const atOmakase = seatingKind([...currentTables, nextTable].filter(Boolean)) === 'omakase';
      const cap = maxTablesForParty(guestCount, atOmakase);
      if (draftTableIds.length >= cap) {
        setAreaSelectionError(atOmakase
          ? (vi ? `Omakase: mỗi khách một chỗ ngồi. ${guestCount} khách chọn tối đa ${cap} chỗ.` : `Omakase seats one guest each: ${guestCount} guest(s) can pick at most ${cap} seat(s).`)
          : (vi ? `${guestCount} khách được đặt tối đa ${cap} bàn.` : `${guestCount} guest(s) can reserve at most ${cap} table(s).`));
        return;
      }
    }
    setDraftTableIds((previous) => {
      if (!allowMultiple) return [id];
      if (previous.includes(id)) return previous.filter((value) => value !== id);
      const currentCapacity = tables
        .filter((table) => previous.includes(Number(table.table_id)))
        .reduce((total, table) => total + Number(table.capacity || 0), 0);
      // Once the party is seated, keep the selection intentional: the guest
      // must deselect a table before adding another instead of accumulating
      // unrelated tables (e.g. 30 seats for an 8-person booking).
      if (Number(guestCount) > 0 && currentCapacity >= Number(guestCount)) return previous;
      return [...previous, id];
    });
  };

  const applyDraft = () => {
    if (!canApply) return;
    if (onApplySelection) onApplySelection(activeSelectedIds);
    else activeSelectedIds.forEach((id) => onSelectTable?.(id));
  };

  return (
    <div className="table-board-container">
      <div className="tb-tools">
        <label className="tb-search"><Search size={17}/><input aria-label={vi?'Tìm bàn hoặc khu':'Search table or area'} value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder={vi?'Tìm bàn hoặc khu…':'Search table or area…'} />{searchQuery&&<button type="button" aria-label={vi?'Xóa tìm kiếm':'Clear search'} onClick={()=>setSearchQuery('')}><X size={15}/></button>}</label>
        <div className="tb-zoom-controls">
          <button type="button" onClick={()=>handleResetZoomAndPan('contain')} aria-pressed={fitMode==='contain'&&zoomScale===1}><Maximize2 size={15}/>{vi?'Vừa khung':'Fit to frame'}</button>
          <button type="button" onClick={()=>handleResetZoomAndPan('width')} aria-pressed={fitMode==='width'&&zoomScale===1}>{vi?'Phóng rộng':'Fit to width'}</button>
          <button type="button" aria-label={vi?'Thu nhỏ':'Zoom out'} disabled={zoomScale<=1} onClick={()=>setZoomScale(z=>Math.max(1,z-.15))}><ZoomOut size={17}/></button>
          <span>{Math.round(zoomScale*100)}%</span>
          <button type="button" aria-label={vi?'Phóng to':'Zoom in'} disabled={zoomScale>=2.5} onClick={()=>setZoomScale(z=>Math.min(2.5,z+.15))}><ZoomIn size={17}/></button>
        </div>
      </div>
      <div className="tb-area-filters">
        <div className="tb-quick-actions" aria-label={vi?'Lọc theo khu':'Filter by area'}>
          <button type="button" aria-pressed={!activeAreaId} className={!activeAreaId?'is-active':''} onClick={()=>setActiveAreaId(null)}>{vi?'Tất cả khu':'All areas'}</button>
          {areas.map(area=><button key={area.area_id} type="button" aria-pressed={String(activeAreaId)===String(area.area_id)} className={String(activeAreaId)===String(area.area_id)?'is-active':''} onClick={()=>setActiveAreaId(String(area.area_id))}>{areaLabel(area.area_name,language)}</button>)}
        </div>
        <label className="tb-available-toggle"><input type="checkbox" checked={activeFilter==='Available'} onChange={e=>setActiveFilter(e.target.checked?'Available':null)}/>{vi?'Chỉ bàn trống':'Available tables only'}</label>
      </div>
      <div className="tb-status-legend" aria-label={vi?'Chú thích trạng thái bàn':'Table status legend'}>
        {[['available',vi?'Bàn trống':'Available'],['selected',vi?'Đang chọn':'Selected'],['locked',vi?'Không thể chọn':'Unavailable']].map(([state,label])=><span key={state}><i className={'tb-status-swatch '+state}/>{label}</span>)}
        <span><LockKeyhole size={13}/>{vi?'Màu xám: đã đặt, có khách, đang dọn hoặc không phù hợp số khách':'Grey: reserved, occupied, cleaning or unsuitable capacity'}</span>
      </div>
      <FloorPlanSVG
        tables={tables}
        // Render the draft only. Passing the parent/committed table here kept a
        // table orange after Deselect until Apply, which made PR-01 look stuck.
        selectedTableId={activeSelectedIds[0] || null}
        selectedTableIds={activeSelectedIds}
        currentTableId={currentTableId}
        guestCount={guestCount}
        allowMultiple={allowMultiple}
        lockUnselected={selectionComplete}
        onTableClick={handleTableClick}
        activeFilter={activeFilter}
        activeAreaId={activeAreaId}
        searchQuery={searchQuery}
        zoomScale={zoomScale}
        fitMode={fitMode}
        setZoomScale={setZoomScale}
        pan={pan}
        setPan={setPan}
        onResetZoomAndPan={handleResetZoomAndPan}
        onViewZone={(img, label) => setViewZoneImage({ src: img, title: label })}
      />

      <div className="tb-draft-toolbar">
        <div className="tb-selection-summary" role="status" aria-live="polite">
          <span>{vi?'BÀN ĐANG CHỌN':'YOUR SELECTION'}</span>
          <strong>{activeSelectedIds.length ? tables.filter(table=>activeSelectedIds.includes(Number(table.table_id))).map(table=>table.table_number).join(', ') : (vi?'Chưa chọn bàn':'No table selected')}</strong>
          <small>{activeSelectedIds.length ? (vi?selectedCapacity+' chỗ · '+guestCount+' khách':selectedCapacity+' seats · '+guestCount+' guests') : (vi?'Chọn bàn trên sơ đồ để tiếp tục':'Choose a table on the map to continue')}</small>
          {areaSelectionError && <small style={{ display: 'block', color: '#dc2626', marginTop: 6 }}>{areaSelectionError}</small>}
        </div>
        <div>
          {activeSelectedIds.length > 0 && (
            <button type="button" className="rzv-btn rzv-btn--ghost" onClick={() => setDraftTableIds([])}>{translateLabel("Deselect all")}</button>
          )}
          <button type="button" className="rzv-btn rzv-btn--ghost" onClick={() => onCancelSelection?.()}>{translateLabel("Cancel")}</button>
          <button type="button" className="rzv-btn rzv-btn--solid tb-apply-button" disabled={!canApply} onClick={applyDraft}>{vi?'Áp dụng':'Apply'}</button>
        </div>
      </div>

      {/* Zone Image Viewer Modal */}
      {viewZoneImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">{translateLabel(viewZoneImage.title)}</h3>
              <button 
                onClick={() => setViewZoneImage(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 bg-gray-50 flex justify-center">
              <img 
                src={viewZoneImage.src} 
                alt={viewZoneImage.title} 
                className="max-h-[70vh] object-contain rounded-lg shadow-inner"
              />
            </div>
          </div>
        </div>
      )}

      <TablePreviewModal
        table={previewTable?.code}
        apiTable={previewTable?.apiTable}
        tableStatus={previewTable?.status}
        isSelected={previewTable?.isSelected}
        isOpen={Boolean(previewTable)}
        onClose={() => setPreviewTable(null)}
        onSelect={(selectedId) => {
          handleDraftSelect(selectedId);
          setPreviewTable(null);
        }}
      />

    </div>
  );
}
