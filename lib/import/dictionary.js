export const STANDARD_BRANCHES = [
  { id: 'CS_01', name: 'PHT', type: 'Vật Lý' },
  { id: 'CS_02', name: 'Phố Đi Bộ', type: 'Vật Lý' },
  { id: 'CS_03', name: 'Hội An', type: 'Vật Lý' },
  { id: 'CS_04', name: '111 NHT', type: 'Vật Lý' },
  { id: 'CS_05', name: '109 NHT', type: 'Vật Lý' },
  { id: 'CS_06', name: 'Chợ Hàn + Bảo Tàng', type: 'Vật Lý' },
  { id: 'CS_07', name: 'Cá chép', type: 'Vật Lý' },
  { id: 'CS_09', name: 'VTV8', type: 'Vật Lý' },
  { id: 'CS_10', name: 'Doanh thu Bếp', type: 'Vật Lý' },
  { id: 'CS_11', name: 'Doanh thu Tổng Cà Phê Đóng Gói và Hàng lưu niệm', type: 'Tu_Dong' },
  { id: 'CS_12', name: 'Doanh thu Sự Kiện', type: 'Tu_Dong' },
  { id: 'CS_13', name: 'CÔNG TY - BO', type: 'Tu_Dong' },
  { id: 'CS_14', name: 'Cửa hàng Aeonmall', type: 'Tu_Dong' },
  { id: 'CS_15', name: 'Trình Quảng Trường', type: 'Tu_Dong' }
];

export const STANDARD_CATEGORIES = [
  { id: 'DM_001', name: 'Doanh thu bán hàng', group: 'I. TỔNG DOANH THU', type: 'Thu' },
  { id: 'DM_002', name: 'DT Cà Phê Đóng Gói', group: 'I. TỔNG DOANH THU', type: 'Thu' },
  { id: 'DM_003', name: 'DT Hàng Lưu niệm', group: 'I. TỔNG DOANH THU', type: 'Thu' },
  { id: 'DM_004', name: 'Doanh thu hoạt động khác', group: 'I. TỔNG DOANH THU', type: 'Thu' },
  { id: 'DM_024', name: 'Cho thuê', group: 'I. TỔNG DOANH THU', type: 'Thu' },
  { id: 'DM_005', name: 'Chi phí Nguyên vật liệu (NVL)', group: 'II.1 TỔNG GIÁ VỐN HÀNG BÁN (COGS)', type: 'Chi' },
  { id: 'DM_006', name: 'Chi phí Công cụ dụng cụ (CCDC)', group: 'II.1 TỔNG GIÁ VỐN HÀNG BÁN (COGS)', type: 'Chi' },
  { id: 'DM_007', name: 'Chi phí Cà Phê Đóng gói', group: 'II.1 TỔNG GIÁ VỐN HÀNG BÁN (COGS)', type: 'Chi' },
  { id: 'DM_008', name: 'Chi phí Hàng Lưu niệm', group: 'II.1 TỔNG GIÁ VỐN HÀNG BÁN (COGS)', type: 'Chi' },
  { id: 'DM_009', name: 'In dư / Giảm giá đối ngoại', group: 'II.2 GIẢM TRỪ DOANH THU', type: 'Chi' },
  { id: 'DM_010', name: 'Chi phí Nhân sự (Labor Cost)', group: 'II.3 TỔNG CHI PHÍ HOẠT ĐỘNG (OPEX)', type: 'Chi' },
  { id: 'DM_011', name: 'Tiện ích & Vận hành (Điện, Nước...)', group: 'II.3 TỔNG CHI PHÍ HOẠT ĐỘNG (OPEX)', type: 'Chi' },
  { id: 'DM_012', name: 'Marketing & Bán hàng trực tuyến', group: 'II.3 TỔNG CHI PHÍ HOẠT ĐỘNG (OPEX)', type: 'Chi' },
  { id: 'DM_013', name: 'Bảo trì sửa chữa cơ sở', group: 'II.3 TỔNG CHI PHÍ HOẠT ĐỘNG (OPEX)', type: 'Chi' },
  { id: 'DM_014', name: 'Quản lý & Hành chính văn phòng', group: 'II.3 TỔNG CHI PHÍ HOẠT ĐỘNG (OPEX)', type: 'Chi' },
  { id: 'DM_015', name: 'Chi phí Thuê mặt bằng (Rent)', group: 'II.3 TỔNG CHI PHÍ HOẠT ĐỘNG (OPEX)', type: 'Chi' },
  { id: 'DM_016', name: 'Chi phí Tài chính phát sinh ( DỰ KIẾN )', group: 'II.3 TỔNG CHI PHÍ HOẠT ĐỘNG (OPEX)', type: 'Chi' },
  { id: 'DM_017', name: 'Chi phí Quan hệ & Đối ngoại (Lobby)', group: 'II.4 TỔNG CHI PHÍ KHÁC', type: 'Chi' },
  { id: 'DM_018', name: 'Chi phí Phạt / Đền bù thiệt hại', group: 'II.4 TỔNG CHI PHÍ KHÁC', type: 'Chi' },
  { id: 'DM_019', name: 'Chi phí phát sinh khác', group: 'II.4 TỔNG CHI PHÍ KHÁC', type: 'Chi' },
  { id: 'DM_020', name: 'Chi phí khấu hao', group: 'III. CHI PHÍ KHẤU HAO', type: 'Chi' },
  { id: 'DM_021', name: 'Tồn kho NVL', group: 'TỒN KHO', type: 'TonKho' },
  { id: 'DM_022', name: 'Tồn kho Cà phê đóng gói', group: 'TỒN KHO', type: 'TonKho' },
  { id: 'DM_023', name: 'Tồn kho lưu niệm', group: 'TỒN KHO', type: 'TonKho' },
  { id: 'DM_025', name: 'Chi phí BO chia cho cửa hàng', group: 'PHÂN BỔ BO', type: 'Chi' }
];

export function cleanName(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^([0-9]+\.|[ivxIVX]+\.|\•|\*|\-)\s*/, '')
    .trim()
    .toLowerCase();
}

// Special alias dictionary
export const SPECIAL_CATEGORY_MAP = {
  'thu nhập khác ( cho thuê )': 'DM_024',
  'thu nhập khác (cho thuê)': 'DM_024',
  'cho thuê': 'DM_024',
  'chi phí tài chính phát sinh ( dự kiến )': 'DM_016',
  'chi phí tài chính phát sinh (dự kiến)': 'DM_016',
  'chi phí tài chính phát sinh': 'DM_016'
};

export const SPECIAL_BRANCH_MAP = {
  'công ty - bo': 'CS_13',
  'công ty-bo': 'CS_13',
  'công ty bo': 'CS_13',
  'cửa hàng aeonmall': 'CS_14',
  'aeonmall': 'CS_14',
  'chợ hàn + bảo tàng': 'CS_06',
  'cá chép': 'CS_07',
  'doanh thu tổng cà phê đóng gói và hàng lưu niệm': 'CS_11',
  'doanh thu tổng cà phê đóng gói v...': 'CS_11',
  'doanh thu tổng cà phê đóng gói': 'CS_11'
};

export function matchBranch(rawBranchName) {
  const cleaned = cleanName(rawBranchName);
  if (!cleaned) return null;

  // Check special map
  if (SPECIAL_BRANCH_MAP[cleaned]) {
    return STANDARD_BRANCHES.find(b => b.id === SPECIAL_BRANCH_MAP[cleaned]) || null;
  }

  // Exact clean match
  const found = STANDARD_BRANCHES.find(b => cleanName(b.name) === cleaned);
  if (found) return found;

  // Partial match fallback
  return STANDARD_BRANCHES.find(b => {
    const stdClean = cleanName(b.name);
    return cleaned.includes(stdClean) || stdClean.includes(cleaned);
  }) || null;
}

export function matchCategory(rawCategoryName) {
  const cleaned = cleanName(rawCategoryName);
  if (!cleaned) return null;

  // Check special map
  if (SPECIAL_CATEGORY_MAP[cleaned]) {
    return STANDARD_CATEGORIES.find(c => c.id === SPECIAL_CATEGORY_MAP[cleaned]) || null;
  }

  // Exact clean match
  const found = STANDARD_CATEGORIES.find(c => cleanName(c.name) === cleaned);
  if (found) return found;

  // Partial match fallback (e.g. without extra parenthesis spacing)
  return STANDARD_CATEGORIES.find(c => {
    const stdClean = cleanName(c.name);
    return stdClean.replace(/\s+/g, '') === cleaned.replace(/\s+/g, '');
  }) || null;
}
