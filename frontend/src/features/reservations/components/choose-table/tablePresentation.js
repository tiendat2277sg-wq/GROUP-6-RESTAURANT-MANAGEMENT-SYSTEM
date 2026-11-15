export function areaLabel(name,language='vi') {
  const value=String(name||'');
  const groups=[[/window/i,'Khu cửa sổ','Window area'],[/vip/i,'Khu VIP','VIP area'],[/standard/i,'Khu tiêu chuẩn','Standard area'],[/premium/i,'Khu cao cấp','Premium area'],[/private/i,'Khu phòng riêng','Private area'],[/kitchen.*view|view.*kitchen/i,'Khu hướng bếp','Kitchen view area'],[/omakase/i,'Khu Omakase','Omakase area']];
  const match=groups.find(([pattern])=>pattern.test(value));
  return match ? match[language==='vi'?1:2] : value;
}
