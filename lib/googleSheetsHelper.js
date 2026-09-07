import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { v4 as uuidv4 } from 'uuid';

// Khởi tạo Document với xác thực Service Account
const getDoc = async () => {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_SHEET_ID) {
    throw new Error('Missing Google Service Account credentials in environment variables.');
  }

  const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

  const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
  await doc.loadInfo();
  return doc;
};

const parseAmount = (val) => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const str = String(val).replace(/[,.]/g, '').replace(/[^\d-]/g, '');
  return Number(str) || 0;
};

// --- BỘ NHỚ ĐỆM (CACHE) MÁY CHỦ GIẢM TẢI GOOGLE API ---
let pnlCache = { data: null, time: 0 };
let masterCache = { data: null, time: 0 };
const SERVER_CACHE_TTL = 60 * 1000; // 60 giây

// Hàm lấy tất cả dữ liệu (dùng cho Dashboard chung / Lịch sử)
export async function getPnLData(month = null, branch = null, forceRefresh = false) {
  // Chỉ dùng cache nếu không filter (vì API luôn gọi ko filter)
  if (!forceRefresh && !month && !branch && pnlCache.data && (Date.now() - pnlCache.time < SERVER_CACHE_TTL)) {
    return pnlCache.data;
  }
  const doc = await getDoc();
  
  let sheet = doc.sheetsByTitle['Database_Giao_Dich'];
  if (!sheet) {
    sheet = await doc.addSheet({ 
      title: 'Database_Giao_Dich',
      headerValues: ['Ma_Giao_Dich', 'Thoi_Gian', 'Ngay', 'Chi_Nhanh', 'Danh_Muc', 'Loai', 'So_Tien', 'Ghi_Chu']
    });
  }
  
  const rows = await sheet.getRows();
  let records = [];
  
  let totalRevenue = 0;
  let totalExpense = 0;
  
  rows.forEach(row => {
    const rowMonth = row.get('Ngay');
    const rowBranch = row.get('Chi_Nhanh');
    
    // Filter if month or branch is provided
    if (month && rowMonth !== month) return;
    if (branch && branch !== 'All' && rowBranch !== branch) return;

    const amount = parseAmount(row.get('So_Tien'));
    const type = row.get('Loai');
    const category = row.get('Danh_Muc');
    
    // Bỏ qua các dòng rác (không có tháng hoặc không có danh mục)
    if (!rowMonth || !category) return;
    
    records.push({
      id: row.get('Ma_Giao_Dich'),
      date: rowMonth,
      branch: rowBranch || '',
      category: category,
      type: type,
      amount: amount,
      note: row.get('Ghi_Chu'),
      timestamp: row.get('Thoi_Gian')
    });

    if (type && type.toLowerCase() === 'thu' || type === 'Revenue') {
      totalRevenue += amount;
    } else if (type && type.toLowerCase() === 'chi' || type === 'Expense') {
      totalExpense += amount;
    }
  });
  
  const netProfit = totalRevenue - totalExpense;
  
  const result = {
    records: records.reverse(), // Giao dịch mới nhất lên đầu
    summary: {
      totalRevenue,
      totalExpense,
      netProfit
    }
  };

  if (!month && !branch) {
    pnlCache.data = result;
    pnlCache.time = Date.now();
  }

  return result;
}

// Hàm lấy dữ liệu theo Tháng và Cơ sở (Dùng để Auto-fill khi Edit)
export async function getPnLByMonthAndBranch(month, branch) {
  const doc = await getDoc();
  const sheet = doc.sheetsByTitle['Database_Giao_Dich'];
  if (!sheet) return [];

  const rows = await sheet.getRows();
  const records = [];

  rows.forEach(row => {
    const rMonth = row.get('Ngay');
    const rBranch = row.get('Chi_Nhanh');
    if (rMonth === month && rBranch === branch) {
      const category = row.get('Danh_Muc');
      if (!category) return; // Bỏ qua dòng rỗng

      records.push({
        id: row.get('Ma_Giao_Dich'),
        date: rMonth,
        branch: rBranch,
        category: category,
        type: row.get('Loai'),
        amount: parseAmount(row.get('So_Tien')),
        note: row.get('Ghi_Chu'),
        timestamp: row.get('Thoi_Gian')
      });
    }
  });

  return records;
}

// Hàm UPSERT: Xóa dòng cũ của (Tháng, Cơ sở) và chèn mảng dòng mới
export async function upsertPnLTransactions(transactions, month, branch) {
  const doc = await getDoc();
  let sheet = doc.sheetsByTitle['Database_Giao_Dich'];
  
  if (!sheet) {
    sheet = await doc.addSheet({ 
      title: 'Database_Giao_Dich',
      headerValues: ['Ma_Giao_Dich', 'Thoi_Gian', 'Ngay', 'Chi_Nhanh', 'Danh_Muc', 'Loai', 'So_Tien', 'Ghi_Chu']
    });
  }

  // Bước 1: Xóa các dòng cũ
  const rows = await sheet.getRows();
  const rowsToDelete = rows.filter(row => row.get('Ngay') === month && row.get('Chi_Nhanh') === branch);
  
  // Xóa từ dưới lên trên để không làm sai lệch index
  for (const row of [...rowsToDelete].reverse()) {
    await row.delete();
  }

  // Bước 2: Chèn dữ liệu mới
  const vnTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" });
  
  // Bỏ qua các giao dịch có Amount = 0
  const validTransactions = transactions.filter(t => Number(t.amount) !== 0);

  if (validTransactions.length > 0) {
    const recordsToInsert = validTransactions.map(row => ({
      Ma_Giao_Dich: row.id || uuidv4(), // Giữ ID cũ hoặc tạo mới
      Thoi_Gian: vnTime,
      Ngay: month,
      Chi_Nhanh: branch,
      Danh_Muc: row.category,
      Loai: row.type,
      So_Tien: Number(row.amount),
      Ghi_Chu: row.note || ''
    }));

    await sheet.addRows(recordsToInsert);
  }
  
  return { success: true, count: validTransactions.length, deletedCount: rowsToDelete.length };
}

// Hàm lấy Master Data động
export async function getMasterData(forceRefresh = false) {
  if (!forceRefresh && masterCache.data && (Date.now() - masterCache.time < SERVER_CACHE_TTL)) {
    return masterCache.data;
  }
  const doc = await getDoc();
  
  // Đọc danh sách Cơ sở
  let branches = [];
  const sheetCoSo = doc.sheetsByTitle['Master_Co_So'];
  if (sheetCoSo) {
    const rowsCoSo = await sheetCoSo.getRows();
    const rawBranches = rowsCoSo.map(r => r.get('Ten_Co_So')).filter(Boolean);
    branches = [...new Set(rawBranches)]; // Loại bỏ các cơ sở bị trùng lặp trong Google Sheets
  }

  // Đọc danh sách Danh mục
  let categoryGroups = [];
  const sheetDanhMuc = doc.sheetsByTitle['Master_Danh_Muc'];
  if (sheetDanhMuc) {
    const rowsDanhMuc = await sheetDanhMuc.getRows();
    
    // Grouping by "Nhom"
    const groupsMap = {};
    rowsDanhMuc.forEach(r => {
      const groupName = r.get('Nhom');
      const catName = r.get('Ten_Danh_Muc');
      if (!groupName || !catName) return;
      
      if (!groupsMap[groupName]) {
        // Suy luận type dựa trên Tên Nhóm hoặc có thể thiết lập thêm một cột type ở Sheet
        let type = 'Chi'; // default
        if (groupName.toLowerCase().includes('doanh thu') && !groupName.toLowerCase().includes('giảm trừ')) type = 'Thu';
        else if (groupName.toLowerCase().includes('tồn kho') || groupName.toLowerCase().includes('bo')) type = 'Khac';
        
        groupsMap[groupName] = {
          group: groupName,
          type: type,
          items: []
        };
      }
      groupsMap[groupName].items.push(catName);
    });
    
    // Convert map to array and sort according to original structure if needed
    // Default order will be how they appear in the spreadsheet from top to bottom
    categoryGroups = Object.values(groupsMap);
  }

  const result = {
    branches,
    categoryGroups
  };

  masterCache.data = result;
  masterCache.time = Date.now();

  return result;
}

// Thêm Cơ sở mới
export async function addBranch(name) {
  const doc = await getDoc();
  const sheet = doc.sheetsByTitle['Master_Co_So'];
  if (!sheet) throw new Error('Không tìm thấy sheet Master_Co_So');
  
  // Tự động sinh ID theo dạng CS_xx
  const rows = await sheet.getRows();
  const nextId = rows.length + 1;
  const formattedId = `CS_${String(nextId).padStart(2, '0')}`;
  
  await sheet.addRow({
    ID_Co_So: formattedId,
    Ten_Co_So: name,
    Loai: 'Tu_Dong'
  });
  
  return { success: true, name };
}

// Thêm Danh mục mới
export async function addCategory(name, groupName) {
  const doc = await getDoc();
  const sheet = doc.sheetsByTitle['Master_Danh_Muc'];
  if (!sheet) throw new Error('Không tìm thấy sheet Master_Danh_Muc');
  
  // Tự động sinh ID theo dạng DM_xxx
  const rows = await sheet.getRows();
  const nextId = rows.length + 1;
  const formattedId = `DM_${String(nextId).padStart(3, '0')}`;
  
  await sheet.addRow({
    ID_Danh_Muc: formattedId,
    Ten_Danh_Muc: name,
    Nhom: groupName
  });
  
  return { success: true, name, groupName };
}

// Lấy thông tin User từ bảng Master_Users
export async function getUserByEmail(email) {
  try {
    const doc = await getDoc();
    let sheet = doc.sheetsByTitle['Master_Users'];
    
    // Nếu sheet chưa tồn tại, tạo mới để tránh lỗi (nhưng user lúc này sẽ không có ai)
    if (!sheet) {
      sheet = await doc.addSheet({ 
        title: 'Master_Users',
        headerValues: ['Email', 'Role', 'Branch', 'PIN']
      });
      return null;
    }

    const rows = await sheet.getRows();
    const userRow = rows.find(r => r.get('Email') === email);
    
    if (userRow) {
      return {
        email: userRow.get('Email'),
        role: userRow.get('Role') || 'Viewer', // Default to Viewer if empty
        branch: userRow.get('Branch') || 'All',
        pin: userRow.get('PIN') || null
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching user by email:', error);
    return null;
  }
}

export async function updateUserPin(email, newPin) {
  try {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['Master_Users'];
    if (!sheet) return { success: false, error: 'Sheet Master_Users not found' };

    const rows = await sheet.getRows();
    const userRow = rows.find(r => r.get('Email') === email);
    
    if (userRow) {
      userRow.set('PIN', newPin);
      await userRow.save();
      return { success: true };
    }
    return { success: false, error: 'User not found' };
  } catch (error) {
    console.error('Error updating user PIN:', error);
    return { success: false, error: error.message };
  }
}
