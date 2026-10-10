import * as XLSX from 'xlsx';
import { STANDARD_BRANCHES, STANDARD_CATEGORIES, matchBranch, matchCategory, cleanName } from './dictionary.js';

/**
 * Parses a number from Excel string or number value
 * Handles "705,643,100 đ", "670.953.871 đ", "-3,361,872 đ", "(500,000)", etc.
 */
export function parseExcelAmount(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;

  let str = String(val).trim();
  if (str === '' || str === '-' || str === '0 đ' || str === '0') return 0;

  // Handle accounting negative: (1,000,000)
  let isNegative = false;
  if (str.startsWith('(') && str.endsWith(')')) {
    isNegative = true;
    str = str.slice(1, -1).trim();
  } else if (str.startsWith('-')) {
    isNegative = true;
    str = str.slice(1).trim();
  }

  // Remove currency symbol and whitespace
  str = str.replace(/[đĐ\s]/g, '');

  // Distinguish comma vs dot thousands separator
  // If both dot and comma exist (e.g. 1.234,56 or 1,234.56)
  if (str.includes(',') && str.includes('.')) {
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      // European format: 1.234,56 -> 1234.56
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: 1,234.56 -> 1234.56
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    // Only comma: for VND it's almost always thousands separator (705,643,100)
    str = str.replace(/,/g, '');
  } else if (str.includes('.')) {
    // Only dot: e.g. 670.953.871
    str = str.replace(/\./g, '');
  }

  const num = parseFloat(str);
  if (isNaN(num)) return 0;
  return isNegative ? -num : num;
}

/**
 * Returns list of sheet names from workbook buffer or array
 */
export function getExcelSheetNames(fileData) {
  const wb = XLSX.read(fileData, { type: 'binary', cellFormula: false });
  return wb.SheetNames || [];
}

/**
 * Parses selected sheet into structured matrix data & checksums
 */
export function parseBctcSheet(workbook, sheetName, targetMonth) {
  const ws = workbook.Sheets[sheetName];
  if (!ws) {
    return { error: `Không tìm thấy sheet: ${sheetName}` };
  }

  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
  if (!rows || rows.length < 4) {
    return { error: 'Sheet không đủ dữ liệu (tối thiểu 4 dòng).' };
  }

  // Find Header Row (where column 0 contains "DANH MỤC CHỈ TIÊU")
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const firstCell = String(rows[i][0] || '').toLowerCase();
    if (firstCell.includes('danh mục chỉ tiêu') || firstCell.includes('chỉ tiêu')) {
      headerRowIdx = i;
      break;
    }
  }

  if (headerRowIdx === -1) {
    headerRowIdx = 1; // Fallback to row index 1 (Excel row 2)
  }

  const headerRow = rows[headerRowIdx];
  const detectedBranches = [];

  // Detect branch columns
  for (let c = 1; c < headerRow.length; c++) {
    const rawBranch = String(headerRow[c] || '').trim();
    if (!rawBranch) continue;

    // Skip total system column
    const cleaned = cleanName(rawBranch);
    if (cleaned === 'tổng hệ thống' || cleaned.includes('tong he thong')) {
      continue;
    }

    const matched = matchBranch(rawBranch);
    detectedBranches.push({
      colIdx: c,
      rawName: rawBranch,
      branchId: matched ? matched.id : null,
      branchName: matched ? matched.name : rawBranch,
      isMatched: !!matched
    });
  }

  if (detectedBranches.length === 0) {
    return { error: 'Không tìm thấy cột cơ sở nào hợp lệ trong hàng tiêu đề.' };
  }

  // Parse data rows
  const parsedRecords = []; // flat records to insert into Database_Giao_Dich
  const matrixData = {};    // { categoryId: { branchId: amount } }
  const excelTotals = {};   // { checksumKey: { branchId: amount } }
  const warnings = [];
  const unmatchedCategories = [];

  // Keywords for checksum rows
  const checksumRowMatchers = {
    totalRevenue: (s) => s.includes('tổng doanh thu'),
    cogs: (s) => s.includes('tổng giá vốn') || s.includes('cogs'),
    discount: (s) => s.includes('giảm trừ doanh thu'),
    opex: (s) => s.includes('tổng chi phí hoạt động') || s.includes('opex'),
    otherExpense: (s) => s.includes('tổng chi phí khác'),
    totalExpense: (s) => s.includes('tổng chi phí thực tế'),
    ebit: (s) => s.includes('ebit') || s.includes('lợi nhuận trước thuế')
  };

  const startRowIdx = headerRowIdx + 2; // Usually row 4 (index 3)

  for (let r = startRowIdx; r < rows.length; r++) {
    const row = rows[r];
    const rawCatName = String(row[0] || '').trim();

    if (!rawCatName) continue;
    if (rawCatName.toLowerCase().startsWith('ghi chú') || rawCatName.toLowerCase().startsWith('note')) {
      break; // Stop when reaching notes section
    }

    const cleanedCat = cleanName(rawCatName);

    // Check if this is a checksum row
    let isChecksum = false;
    for (const [key, matcher] of Object.entries(checksumRowMatchers)) {
      if (matcher(cleanedCat)) {
        isChecksum = true;
        if (!excelTotals[key]) excelTotals[key] = {};
        for (const b of detectedBranches) {
          const val = parseExcelAmount(row[b.colIdx]);
          excelTotals[key][b.branchId || b.rawName] = val;
        }
        break;
      }
    }

    if (isChecksum) continue;

    // Match standard category
    const matchedCategory = matchCategory(rawCatName);

    if (!matchedCategory) {
      // Check if it's other ignored lines (e.g. "Nếu không tính Tồn kho...")
      if (!cleanedCat.includes('lợi nhuận sau bo') && !cleanedCat.includes('lợi nhuận nếu cộng')) {
        unmatchedCategories.push(rawCatName);
      }
      continue;
    }

    if (!matrixData[matchedCategory.id]) {
      matrixData[matchedCategory.id] = {};
    }

    for (const b of detectedBranches) {
      const bKey = b.branchId || b.rawName;
      const amount = parseExcelAmount(row[b.colIdx]);

      matrixData[matchedCategory.id][bKey] = amount;

      if (amount < 0) {
        warnings.push({
          type: 'negative',
          branch: b.branchName,
          category: matchedCategory.name,
          amount,
          message: `Chỉ tiêu "${matchedCategory.name}" tại cơ sở "${b.branchName}" có số tiền âm: ${amount.toLocaleString('vi-VN')} đ`
        });
      }

      // Record for database
      parsedRecords.push({
        date: targetMonth,
        branch: b.branchName,
        category: matchedCategory.name,
        type: matchedCategory.type === 'Thu' ? 'Thu' : 'Chi',
        amount: amount,
        note: `Import Excel [${sheetName}]`
      });
    }
  }

  // Compute calculated totals and compare with excelTotals (Checksum validation)
  const checksumReport = detectedBranches.map(b => {
    const bKey = b.branchId || b.rawName;

    // Calculate sum of revenue
    let calcRevenue = 0;
    // Calculate sum of expense
    let calcCOGS = 0;
    let calcDiscount = 0;
    let calcOPEX = 0;
    let calcOther = 0;
    let calcDepreciation = 0;

    for (const cat of STANDARD_CATEGORIES) {
      const amt = matrixData[cat.id]?.[bKey] || 0;
      if (cat.group === 'I. TỔNG DOANH THU') calcRevenue += amt;
      else if (cat.group === 'II.1 TỔNG GIÁ VỐN HÀNG BÁN (COGS)') calcCOGS += amt;
      else if (cat.group === 'II.2 GIẢM TRỪ DOANH THU') calcDiscount += amt;
      else if (cat.group === 'II.3 TỔNG CHI PHÍ HOẠT ĐỘNG (OPEX)') calcOPEX += amt;
      else if (cat.group === 'II.4 TỔNG CHI PHÍ KHÁC') calcOther += amt;
      else if (cat.group === 'III. CHI PHÍ KHẤU HAO') calcDepreciation += amt;
    }

    const calcTotalExpense = calcCOGS + calcDiscount + calcOPEX + calcOther;
    const calcEBIT = calcRevenue - (calcTotalExpense + calcDepreciation);

    const excelRev = excelTotals.totalRevenue?.[bKey] ?? null;
    const excelExp = excelTotals.totalExpense?.[bKey] ?? null;
    const excelEBIT = excelTotals.ebit?.[bKey] ?? null;

    const diffRev = excelRev !== null ? Math.abs(calcRevenue - excelRev) : 0;
    const diffEBIT = excelEBIT !== null ? Math.abs(calcEBIT - excelEBIT) : 0;

    return {
      branchId: b.branchId,
      branchName: b.branchName,
      calcRevenue,
      excelRevenue: excelRev,
      isRevenueMatch: diffRev <= 100, // Tolerance 100 VND
      calcTotalExpense,
      excelExpense: excelExp,
      calcEBIT,
      excelEBIT,
      isEBITMatch: diffEBIT <= 100
    };
  });

  return {
    success: true,
    sheetName,
    branches: detectedBranches,
    categories: STANDARD_CATEGORIES,
    matrixData,
    records: parsedRecords,
    checksumReport,
    warnings,
    unmatchedCategories: Array.from(new Set(unmatchedCategories))
  };
}
