import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Đọc biến môi trường thủ công
const envFile = fs.readFileSync(path.resolve('.env.local'), 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  if (line.trim() && !line.startsWith('#')) {
    const [key, ...values] = line.split('=');
    if (key) {
      env[key.trim()] = values.join('=').trim().replace(/^"|"$/g, '');
    }
  }
});

const getAuth = () => {
  const privateKey = env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
  return new JWT({
    email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
};

const SOURCE_SHEET_ID = '1Jc0359umIpcmXLyZl4buxSg7CCXa1_k-AHeHOmFRWJA';
const DEST_SHEET_ID = env.GOOGLE_SHEET_ID;

const parseAmount = (val) => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const str = String(val).replace(/[,.]/g, '').replace(/[^\d-]/g, '');
  return Number(str) || 0;
};

async function migrateData() {
  const auth = getAuth();
  
  // Connect to Source
  const srcDoc = new GoogleSpreadsheet(SOURCE_SHEET_ID, auth);
  await srcDoc.loadInfo();
  
  // Tìm sheet Tháng 5 và Tháng 6
  const sheetMay = srcDoc.sheetsByTitle['T5 (C.Pha)'] || srcDoc.sheetsByTitle['Tháng 5'];
  const sheetJune = srcDoc.sheetsByTitle['T6 (C.Pha)'] || srcDoc.sheetsByTitle['Tháng 6'];
  
  if (!sheetMay && !sheetJune) {
    console.log("Không tìm thấy sheet Tháng 5 hoặc Tháng 6. Danh sách sheet hiện có:");
    srcDoc.sheetsByIndex.forEach(s => console.log(s.title));
    return;
  }

  // Connect to Destination
  const destDoc = new GoogleSpreadsheet(DEST_SHEET_ID, auth);
  await destDoc.loadInfo();
  let dbSheet = destDoc.sheetsByTitle['Database_Giao_Dich'];
  if (!dbSheet) {
    console.log("Chưa có Database_Giao_Dich, script sẽ dừng.");
    return;
  }

  const newRecords = [];
  
  const processSourceSheet = async (sheet, monthKey) => {
    if (!sheet) return;
    console.log(`Đang đọc dữ liệu từ: ${sheet.title} (Tháng ${monthKey})`);
    
    await sheet.loadCells('A1:AA100');
    const headerRowIdx = 0; // Giả sử header nằm ở hàng đầu tiên
    
    // Đọc danh sách cơ sở
    const branches = [];
    for (let c = 1; c < 20; c++) {
      const bName = sheet.getCell(headerRowIdx, c).value;
      const bType = sheet.getCell(headerRowIdx + 1, c).value; // Row 1 là "Giá trị (VND)"
      if (bName && bName.trim() && bName !== 'TỔNG HỆ THỐNG' && bType && bType.toString().includes('Giá trị')) {
        branches.push({ colIdx: c, name: bName.trim() });
      }
    }
    console.log("Các cơ sở tìm thấy:", branches.map(b => b.name));

    // Đọc từng Danh mục (từ row 2)
    for (let r = headerRowIdx + 2; r < 100; r++) {
      const category = sheet.getCell(r, 0).value;
      if (!category) continue;
      
      const catTrim = category.toString().trim();
      // Bỏ qua các dòng tổng
      if (
        catTrim === '' ||
        catTrim.startsWith('I. TỔNG') ||
        catTrim.startsWith('II. TỔNG') ||
        catTrim.startsWith('IV. LỢI NHUẬN') ||
        catTrim.includes('TỔNG GIÁ VỐN') ||
        catTrim.includes('TỔNG CHI PHÍ') ||
        catTrim.includes('GIẢM TRỪ DOANH THU') ||
        catTrim === 'EBIT' ||
        catTrim === 'Net Profit'
      ) {
        continue;
      }
      
      // Với mỗi cơ sở, lấy dữ liệu
      for (const branch of branches) {
        const val = sheet.getCell(r, branch.colIdx).value;
        const amount = parseAmount(val);
        if (amount !== 0) {
          // Phân loại Thu hay Chi.
          // Dựa vào r (row index) để phân loại tạm: các row < 6 là Thu (như "1. Doanh thu bán hàng")
          let type = 'Chi';
          if (r < 6) type = 'Thu';
          
          newRecords.push({
            Ma_Giao_Dich: uuidv4(),
            Thoi_Gian: new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }),
            Ngay: monthKey,
            Chi_Nhanh: branch.name,
            Danh_Muc: catTrim,
            Loai: type,
            So_Tien: amount,
            Ghi_Chu: ''
          });
        }
      }
    }
  };

  await processSourceSheet(sheetMay, '2024-05');
  await processSourceSheet(sheetJune, '2024-06');
  
  // Tinh chỉnh Loai (Thu/Chi)
  // Đọc Master_Danh_Muc để map cho chính xác
  const masterDanhMuc = destDoc.sheetsByTitle['Master_Danh_Muc'];
  const typeMap = {};
  if (masterDanhMuc) {
    const rows = await masterDanhMuc.getRows();
    rows.forEach(r => {
      const groupName = r.get('Nhom') || '';
      let type = 'Chi';
      if (groupName.toLowerCase().includes('doanh thu')) type = 'Thu';
      typeMap[r.get('Ten_Danh_Muc')] = type;
    });
  }
  
  newRecords.forEach(r => {
    if (typeMap[r.Danh_Muc]) {
      r.Loai = typeMap[r.Danh_Muc];
    }
  });

  console.log(`Đã chuẩn bị ${newRecords.length} dòng dữ liệu để Insert.`);
  if (newRecords.length > 0) {
    await dbSheet.addRows(newRecords);
    console.log("MIGRATION HOÀN TẤT!");
  }
}

migrateData().catch(console.error);
