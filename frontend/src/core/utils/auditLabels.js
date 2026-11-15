// Hiển thị nhật ký hệ thống dễ đọc: mã hành động → nhãn, tên bảng → nhãn, JSON → danh sách "trường: giá trị".
// Mã lạ chưa có trong bảng vẫn được làm đẹp tự động nên không bao giờ hiện thô.

const ACTIONS_VI = {
  ASSIGN_TABLE: 'Gán bàn',
  AUTOMATED_PAYMENT_SUCCESS: 'Thanh toán tự động thành công',
  CONFIRM_RESERVATION: 'Xác nhận đặt bàn',
  CREATE_PROMOTION_CODE: 'Tạo mã khuyến mãi',
  ERT_EXTENDED: 'Gia hạn thời gian dùng bữa',
  KITCHEN_UPDATE_TICKET_STATUS: 'Bếp cập nhật trạng thái phiếu món',
  LOYALTY_POINTS_EARNED: 'Cộng điểm thành viên',
  MANAGER_FORCE_SETTLE: 'Quản lý chốt thanh toán thủ công',
  MANAGER_RESOLVE_REQUEST: 'Quản lý xử lý yêu cầu',
  ONLINE_PAYMENT_RELEASE: 'Giải phóng bàn sau thanh toán online',
  ORDER_PLACED: 'Khách gọi món',
  PAYMENT_CONFIRMED: 'Xác nhận thanh toán',
  PAYMENT_EXPIRED: 'Thanh toán hết hạn',
  PERFORMANCE_REVIEW_ADDED: 'Thêm đánh giá nhân viên',
  REPORT_GENERATED: 'Tạo báo cáo',
  REPORT_REVIEWED_BY_ADMIN: 'Admin đã duyệt báo cáo',
  REPORT_SUBMITTED_TO_ADMIN: 'Gửi báo cáo cho admin',
  RESERVATION_CREATED: 'Tạo đặt bàn',
  STAFF_CASH_CONFIRM_RELEASE: 'Nhân viên xác nhận tiền mặt và trả bàn',
  STAFF_CHECKOUT_RESERVATION: 'Nhân viên thanh toán đặt bàn',
  STAFF_MERGE_TABLES: 'Nhân viên ghép bàn',
  STAFF_UNMERGE_TABLES: 'Nhân viên tách bàn',
  TABLE_ASSIGNMENT_FINALIZATION_NEEDED: 'Cần chốt bàn cho đặt chỗ',
  TABLE_RELEASED: 'Trả bàn',
  TICKET_SENT_TO_KITCHEN: 'Gửi phiếu món xuống bếp',
  WALKIN_SEATED: 'Xếp bàn cho khách vãng lai',
};

const TABLES_VI = {
  KitchenTickets: 'Phiếu bếp',
  LoyaltyTransactions: 'Điểm thành viên',
  OrderItems: 'Món trong đơn',
  Orders: 'Đơn hàng',
  Payments: 'Thanh toán',
  'Promotions/PromoCodes': 'Khuyến mãi',
  Report: 'Báo cáo',
  ReportSubmission: 'Báo cáo gửi admin',
  'dbo.ReportSubmissions': 'Báo cáo gửi admin',
  Reservations: 'Đặt bàn',
  RestaurantTables: 'Bàn ăn',
  StaffProfiles: 'Hồ sơ nhân viên',
};

const FIELDS_VI = {
  action: 'Hành động', actor: 'Người thực hiện', actor_id: 'Mã người thực hiện', actor_type: 'Loại người thực hiện',
  actor_user_id: 'Mã người thực hiện', added_minutes: 'Số phút thêm', alert_threshold_minutes: 'Ngưỡng cảnh báo (phút)',
  amountPaid: 'Số tiền đã trả', amount_paid: 'Số tiền đã trả', applicable_to: 'Áp dụng cho',
  book_entire_area: 'Đặt cả khu vực', child: 'Bàn con', child_number: 'Số bàn con', course_stage: 'Giai đoạn món',
  customer_id: 'Mã khách hàng', date_range: 'Khoảng thời gian', deposit_amount: 'Tiền cọc', description: 'Mô tả',
  discount_type: 'Loại giảm giá', discount_value: 'Giá trị giảm', dish_id: 'Mã món', dish_name: 'Tên món',
  end_at: 'Kết thúc', file_reference: 'Tệp đính kèm', final_total: 'Tổng cuối', format: 'Định dạng',
  max_discount: 'Giảm tối đa', method: 'Phương thức', min_order_value: 'Đơn tối thiểu', new_status: 'Trạng thái mới',
  notes: 'Ghi chú', old_status: 'Trạng thái cũ', order_code: 'Mã đơn', order_id: 'Mã đơn hàng',
  order_item_id: 'Mã món trong đơn', order_status: 'Trạng thái đơn', payment_id: 'Mã thanh toán',
  payment_method_id: 'Phương thức thanh toán', points: 'Điểm', points_required: 'Điểm cần đổi',
  preferred_area_id: 'Khu vực ưu tiên', preferred_area_name: 'Tên khu vực ưu tiên', preferred_table_id: 'Bàn ưu tiên',
  preferred_table_number: 'Số bàn ưu tiên', promo_code: 'Mã khuyến mãi', promotion_id: 'Mã chương trình',
  promotion_name: 'Tên chương trình', quantity: 'Số lượng', rating: 'Đánh giá', releaseTrigger: 'Cách trả bàn',
  remaining_bills: 'Hóa đơn còn lại', report_type: 'Loại báo cáo', reservation_end_at: 'Giờ kết thúc đặt bàn',
  reservation_id: 'Mã đặt bàn', reservation_source: 'Nguồn đặt bàn', reservation_status: 'Trạng thái đặt bàn',
  staffId: 'Mã nhân viên', staffName: 'Nhân viên', start_at: 'Bắt đầu', submission_id: 'Mã báo cáo gửi',
  suggested_table_id: 'Bàn gợi ý', suggested_table_number: 'Số bàn gợi ý', tableId: 'Mã bàn', table_id: 'Mã bàn',
  table_assignment_status: 'Trạng thái gán bàn', table_status: 'Trạng thái bàn', total_quantity: 'Tổng số lượng',
  transactionRef: 'Mã giao dịch', triggered_by: 'Kích hoạt bởi', type: 'Loại', usage_limit: 'Giới hạn lượt dùng',
  validity_duration_hours: 'Hiệu lực (giờ)',
};

const VALUES_VI = {
  true: 'Có', false: 'Không', null: '—',
  PENDING: 'Chờ xử lý', CONFIRMED: 'Đã xác nhận', COMPLETED: 'Hoàn tất', CANCELLED: 'Đã hủy', CANCELED: 'Đã hủy',
  SEATED: 'Đã vào bàn', OCCUPIED: 'Có khách', AVAILABLE: 'Trống', RESERVED: 'Đã đặt', PAID: 'Đã thanh toán',
  UNPAID: 'Chưa thanh toán', IN_PROGRESS: 'Đang làm', READY: 'Sẵn sàng', SERVED: 'Đã phục vụ', CASH: 'Tiền mặt',
  ONLINE: 'Online', REVENUE_SUMMARY: 'Tổng hợp doanh thu', REVENUE_DETAIL: 'Chi tiết doanh thu', PDF: 'PDF', EXCEL: 'Excel', MERGE: 'Ghép bàn', UNMERGE: 'Tách bàn', SYSTEM: 'Hệ thống', STAFF: 'Nhân viên', MANAGER: 'Quản lý', ADMIN: 'Admin', CUSTOMER: 'Khách hàng',
};

const MONEY_FIELDS = /(amount|total|deposit|discount_value|max_discount|min_order)/i;

export function prettifyCode(code) {
  return String(code ?? '')
    .replace(/[_.]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
    .toLowerCase()
    .replace(/^\w/, c => c.toUpperCase());
}

export function auditActionLabel(code, language = 'vi') {
  if (!code) return '—';
  const base = String(code).split(' - ')[0].trim();
  if (language === 'vi' && ACTIONS_VI[base]) return ACTIONS_VI[base];
  return prettifyCode(base);
}

/** Phần mô tả đi kèm mã (vd. "PAYMENT_EXPIRED - Created by: System") */
export function auditActionNote(code, language = 'vi') {
  const parts = String(code || '').split(' - ');
  if (parts.length < 2) return '';
  const cleanup = language === 'vi' ? 'Hệ thống tự dọn' : 'Automated cleanup';
  return parts.slice(1).join(' - ').replace('Created by: System (Automated Cleanup)', cleanup);
}

export function auditTableLabel(name, language = 'vi') {
  if (!name) return '—';
  if (language === 'vi' && TABLES_VI[name]) return TABLES_VI[name];
  return prettifyCode(String(name).replace(/^dbo\./, ''));
}

export function auditFieldLabel(key, language = 'vi') {
  if (language === 'vi' && FIELDS_VI[key]) return FIELDS_VI[key];
  return prettifyCode(key);
}

function formatValue(key, value, language) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return language === 'vi' ? (value ? 'Có' : 'Không') : (value ? 'Yes' : 'No');
  if (typeof value === 'number') {
    if (MONEY_FIELDS.test(key) && !/id$/i.test(key)) return `${value.toLocaleString('vi-VN')} ₫`;
    return value.toLocaleString('vi-VN');
  }
  if (typeof value === 'object') {
    return Object.entries(value).map(([k, v]) => `${auditFieldLabel(k, language)}: ${formatValue(k, v, language)}`).join(', ');
  }
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString(language === 'vi' ? 'vi-VN' : 'en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    }
  }
  if (language === 'vi' && VALUES_VI[s.toUpperCase()]) return VALUES_VI[s.toUpperCase()];
  if (language === 'en' && /^[a-z]+(_[a-z]+)+$/.test(s)) return prettifyCode(s);
  return s;
}

/** Trả về mảng [{label, value}] từ chuỗi JSON/object; không bao giờ ném lỗi. */
export function auditDetailRows(raw, language = 'vi') {
  if (raw === null || raw === undefined || raw === '') return [];
  let data = raw;
  if (typeof raw === 'string') {
    try { data = JSON.parse(raw); } catch { return [{ label: '', value: raw }]; }
  }
  if (data === null || typeof data !== 'object') return [{ label: '', value: String(data) }];
  if (Array.isArray(data)) return data.map((v, i) => ({ label: `#${i + 1}`, value: formatValue('', v, language) }));
  return Object.entries(data).map(([k, v]) => ({
    label: auditFieldLabel(k, language),
    value: formatValue(k, v, language),
  }));
}

/** Một dòng tóm tắt ngắn (tối đa vài trường) cho bảng. */
export function auditSummary(raw, language = 'vi', max = 3) {
  return auditDetailRows(raw, language).slice(0, max)
    .map(r => (r.label ? `${r.label}: ${r.value}` : r.value)).join(' · ');
}
