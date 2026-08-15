import fs from 'fs';

const envConfig = fs.readFileSync('./.env.local', 'utf8');
envConfig.split('\n').forEach(line => {
  if (line.trim() && !line.startsWith('#')) {
    const splitIndex = line.indexOf('=');
    if (splitIndex !== -1) {
      const key = line.substring(0, splitIndex).trim();
      let val = line.substring(splitIndex + 1).trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1).replace(/\\n/g, '\n');
      }
      process.env[key] = val;
    }
  }
});

import { upsertPnLTransactions } from './lib/googleSheetsHelper.js';

// The CSV content path
const csvPath = '/Users/copc/.gemini/antigravity/brain/12b3aba0-4a88-4acb-9474-9bec8f1ba52f/.system_generated/steps/340/content.md';
const content = fs.readFileSync(csvPath, 'utf8');

const lines = content.split('\n');
let startIndex = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].startsWith('DANH MỤC CHỈ TIÊU P&L')) {
    startIndex = i;
    break;
  }
}

// Map index to Branch Name exactly as in Master_Co_So
const colToBranch = {
  1: "Hội An",
  3: "VTV8",
  5: "PHT",
  7: "111 NHT",
  9: "109 NHT",
  11: "PĐB",
  13: "Chợ Hàn", // Map "Chợ Hàn + Bảo Tàng" to "Chợ Hàn" (can be adjusted)
  15: "Cá chép",
  17: "Bảo Tàng",
  19: "Quầy Lưu Niệm",
  21: "Sự Kiện",
  23: "Bếp",
  25: "Khối BO"
};

// Map row name to standard Category Name (Danh_Muc) and Type (Loai)
const categoryMap = {
  "1. Doanh thu bán hàng": { cat: "Doanh thu bán hàng", type: "Thu" },
  "2. DT Cà Phê Đóng Gói": { cat: "DT Cà Phê Đóng Gói", type: "Thu" },
  "3. DT Hàng Lưu niệm": { cat: "DT Quà tặng & Lưu niệm", type: "Thu" },
  "4. Doanh thu hoạt động khác": { cat: "Doanh thu hoạt động khác", type: "Thu" },
  "• Chi phí Nguyên vật liệu (NVL)": { cat: "• Chi phí Nguyên vật liệu (NVL)", type: "Chi" },
  "• Chi phí Công cụ dụng cụ (CCDC)": { cat: "• Chi phí Công cụ dụng cụ (CCDC)", type: "Chi" },
  "• Chi phí Cà Phê Đóng gói": { cat: "• Chi phí Cà Phê Đóng gói", type: "Chi" },
  "• Chi phí Hàng Lưu niệm": { cat: "• Chi phí Quà tặng & Lưu niệm", type: "Chi" },
  "• In dư / Giảm giá đối ngoại": { cat: "• In dư / Giảm giá đối ngoại", type: "Chi" },
  "• Chi phí Nhân sự (Labor Cost)": { cat: "• Chi phí Nhân sự (Labor Cost)", type: "Chi" },
  "• Tiện ích & Vận hành (Điện, Nước...)": { cat: "• Tiện ích & Vận hành (Điện, Nước...)", type: "Chi" },
  "• Marketing & Bán hàng trực tuyến": { cat: "• Marketing & Bán hàng trực tuyến", type: "Chi" },
  "• Bảo trì sửa chữa cơ sở": { cat: "• Khấu hao & Bảo trì sửa chữa cơ sở", type: "Chi" },
  "• Quản lý & Hành chính văn phòng": { cat: "• Quản lý & Hành chính văn phòng", type: "Chi" },
  "• Chi phí Thuê mặt bằng (Rent)": { cat: "• Chi phí Thuê mặt bằng (Rent)", type: "Chi" },
  "• Chi phí Tài chính phát sinh ( DỰ KIẾN )": { cat: "• Chi phí Tài chính phát sinh", type: "Chi" },
  "• Chi phí Quan hệ & Đối ngoại (Lobby)": { cat: "• Chi phí Quan hệ & Đối ngoại (Lobby)", type: "Chi" },
  "• Chi phí Phạt / Đền bù thiệt hại": { cat: "• Chi phí Phạt / Đền bù thiệt hại", type: "Chi" },
  "• Chi phí phát sinh khác": { cat: "• Chi phí phát sinh khác", type: "Chi" }
};

const recordsByBranch = {};
Object.values(colToBranch).forEach(b => recordsByBranch[b] = []);

function parseCSVLine(str) {
  const result = [];
  let inQuotes = false;
  let curr = '';
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(curr.trim());
      curr = '';
    } else {
      curr += char;
    }
  }
  result.push(curr.trim());
  return result;
}

for (let i = startIndex + 3; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  
  const row = parseCSVLine(lines[i]);
  if (!row || row.length === 0) continue;
  
  const rawCat = row[0].replace(/^"|"$/g, '').trim();
  if (!categoryMap[rawCat]) continue; // skip non-mapped / total rows
  
  const mapped = categoryMap[rawCat];
  
  // Extract values for each branch
  Object.keys(colToBranch).forEach(colIndex => {
    const valStr = row[colIndex];
    if (valStr && valStr !== '0 đ' && valStr !== '0' && valStr !== '' && !valStr.includes('%')) {
      // Clean up string like "670.953.871 đ" -> 670953871
      const cleanVal = parseInt(valStr.replace(/[^\d-]/g, ''), 10);
      if (cleanVal && cleanVal !== 0) {
        recordsByBranch[colToBranch[colIndex]].push({
          category: mapped.cat,
          type: mapped.type,
          amount: cleanVal,
          note: 'Migrated from Excel'
        });
      }
    }
  });
}

// Upload Data
const MONTH = '2026-08'; // Defaulting to current month

async function run() {
  console.log('Bắt đầu Data Migration...');
  for (const branch of Object.values(colToBranch)) {
    const records = recordsByBranch[branch];
    if (records.length > 0) {
      console.log(`Đang up ${records.length} records cho Cơ sở: ${branch}...`);
      try {
        await upsertPnLTransactions(records, MONTH, branch);
        console.log(`-> Thành công cho ${branch}`);
      } catch (err) {
        console.error(`-> LỖI tại ${branch}:`, err.message);
      }
    } else {
      console.log(`Bỏ qua ${branch} vì không có dữ liệu > 0.`);
    }
  }
  console.log('Hoàn thành toàn bộ Migration!');
}

run();
