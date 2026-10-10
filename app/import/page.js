'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { parseBctcSheet } from '@/lib/import/parseBctc';

export default function ImportPage() {
  const { data: session } = useSession();
  const userRole = session?.user?.role || 'Viewer';
  const userBranch = session?.user?.branch;

  const [file, setFile] = useState(null);
  const [workbook, setWorkbook] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  
  // Mặc định tháng hiện tại dạng YYYY-MM
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [targetMonth, setTargetMonth] = useState(defaultMonth);

  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [parseError, setParseError] = useState('');

  const [activeTab, setActiveTab] = useState('matrix'); // 'matrix' | 'checksum' | 'warnings'
  const [submitting, setSubmitting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Khi chọn file
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParseError('');
    setImportResult(null);
    setParsedData(null);
    setParsing(true);

    try {
      const data = await selectedFile.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      setWorkbook(wb);
      setSheetNames(wb.SheetNames || []);

      if (wb.SheetNames.length > 0) {
        // Tự động tìm sheet phù hợp nhất (ví dụ có chữ BCTC hoặc T...)
        const firstSheet = wb.SheetNames[0];
        setSelectedSheet(firstSheet);
        
        // Thử đoán tháng từ tên sheet (e.g. T8 -> 2026-08)
        const matchT = firstSheet.match(/T(\d+)/i) || firstSheet.match(/Tháng\s*(\d+)/i);
        if (matchT && matchT[1]) {
          const m = String(matchT[1]).padStart(2, '0');
          setTargetMonth(`2026-${m}`);
        }

        // Chạy parse sheet đầu tiên
        runParse(wb, firstSheet, targetMonth);
      }
    } catch (err) {
      console.error('File read error:', err);
      setParseError('Không thể đọc file Excel. Vui lòng kiểm tra lại định dạng file .xlsx.');
    } finally {
      setParsing(false);
    }
  };

  // Hàm chạy parse sheet
  const runParse = (wb, sheet, month) => {
    if (!wb || !sheet) return;
    setParsing(true);
    setParseError('');

    try {
      const res = parseBctcSheet(wb, sheet, month);
      if (res.error) {
        setParseError(res.error);
        setParsedData(null);
      } else {
        setParsedData(res);
      }
    } catch (err) {
      console.error('Parse error:', err);
      setParseError(`Lỗi khi quét sheet: ${err.message}`);
      setParsedData(null);
    } finally {
      setParsing(false);
    }
  };

  // Khi người dùng đổi Sheet
  const handleSheetChange = (newSheet) => {
    setSelectedSheet(newSheet);
    if (workbook) {
      runParse(workbook, newSheet, targetMonth);
    }
  };

  // Khi người dùng đổi Tháng
  const handleMonthChange = (newMonth) => {
    setTargetMonth(newMonth);
    if (workbook && selectedSheet) {
      runParse(workbook, selectedSheet, newMonth);
    }
  };

  // Xác nhận lưu vào Google Sheets
  const handleConfirmImport = async () => {
    if (!parsedData || !parsedData.records || parsedData.records.length === 0) return;

    if (!confirm(`Xác nhận GHI ĐÈ toàn bộ số liệu của tháng [${targetMonth}] cho ${parsedData.branches.length} cơ sở từ file Excel?`)) {
      return;
    }

    setSubmitting(true);
    setImportResult(null);

    try {
      const branchNames = parsedData.branches.map(b => b.branchName);
      const res = await fetch('/api/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: targetMonth,
          branches: branchNames,
          records: parsedData.records,
          fileName: file?.name || 'excel_import.xlsx',
          sheetName: selectedSheet
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setImportResult({
          success: true,
          message: `Đã import thành công ${data.insertedCount} dòng dữ liệu cho ${data.branchesCount} cơ sở (Đã ghi đè ${data.replacedCount} dòng cũ)!`
        });
      } else {
        setImportResult({
          success: false,
          message: data.error || 'Có lỗi xảy ra khi lưu dữ liệu lên máy chủ.'
        });
      }
    } catch (err) {
      setImportResult({
        success: false,
        message: `Lỗi kết nối máy chủ: ${err.message}`
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val) => {
    if (val === 0 || !val) return '-';
    return Number(val).toLocaleString('vi-VN') + ' đ';
  };

  if (userRole === 'Viewer') {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', marginTop: '2rem' }}>
        <h2 style={{ color: 'var(--expense-color)', marginBottom: '0.5rem' }}>Không có quyền truy cập</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Tài khoản của bạn chỉ có quyền Xem (Viewer). Chức năng Import chỉ dành cho Quản trị viên và Kế toán.</p>
        <Link href="/" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>Quay lại Tổng quan</Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ padding: '0 0.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '5rem' }}>
      <header style={{ padding: '1rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Nhập Báo Cáo Tài Chính từ Excel</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Hỗ trợ file ma trận đa cơ sở, tự động kiểm tra đối chiếu doanh thu & EBIT, ghi theo lô chống lỗi 429
          </p>
        </div>
      </header>

      {/* BƯỚC 1: TẢI TỆP VÀ CẤU HÌNH */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem' }}>
          1. Chọn Tệp & Cấu Hình
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
          {/* File Picker */}
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Tệp BCTC (.xlsx)
            </label>
            <input 
              type="file" 
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              className="form-control"
              style={{ padding: '0.5rem' }}
            />
            {file && (
              <p style={{ fontSize: '0.8rem', color: 'var(--profit-color)', marginTop: '0.4rem' }}>
                ✓ {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {/* Chọn Sheet */}
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Chọn Sheet Cần Import
            </label>
            <select
              className="form-control"
              value={selectedSheet}
              onChange={(e) => handleSheetChange(e.target.value)}
              disabled={sheetNames.length === 0}
            >
              {sheetNames.length === 0 ? (
                <option value="">-- Chưa tải file --</option>
              ) : (
                sheetNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))
              )}
            </select>
          </div>

          {/* Chọn Tháng */}
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Áp Dụng Cho Tháng
            </label>
            <input 
              type="month"
              className="form-control"
              value={targetMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
            />
          </div>
        </div>

        {parsing && (
          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--primary-color)' }}>
            <div className="spinner" style={{ width: '20px', height: '20px' }}></div>
            <span>Đang quét dữ liệu ma trận từ Sheet [{selectedSheet}]...</span>
          </div>
        )}

        {parseError && (
          <div className="error-message" style={{ marginTop: '1rem' }}>
            ⚠️ {parseError}
          </div>
        )}
      </div>

      {/* BƯỚC 2: XEM TRƯỚC VÀ ĐỐI CHIẾU CHECK_SUM */}
      {parsedData && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.75rem' }}>
            <div>
              <h3 style={{ margin: 0 }}>2. Kiểm Tra & Đối Chiếu Dữ Liệu</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                Tìm thấy <strong>{parsedData.branches.length} cơ sở</strong> | <strong>{parsedData.records.length} bản ghi</strong>
              </p>
            </div>

            {/* Tab switch */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={() => setActiveTab('matrix')}
                className="btn"
                style={{
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.85rem',
                  background: activeTab === 'matrix' ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                  color: activeTab === 'matrix' ? '#fff' : 'var(--text-primary)'
                }}
              >
                📊 Ma trận số liệu
              </button>
              <button 
                onClick={() => setActiveTab('checksum')}
                className="btn"
                style={{
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.85rem',
                  background: activeTab === 'checksum' ? 'var(--primary-color)' : 'rgba(255,255,255,0.05)',
                  color: activeTab === 'checksum' ? '#fff' : 'var(--text-primary)'
                }}
              >
                🔍 Đối chiếu Checksum ({parsedData.checksumReport.filter(c => c.isEBITMatch).length}/{parsedData.checksumReport.length})
              </button>
              {parsedData.warnings.length > 0 && (
                <button 
                  onClick={() => setActiveTab('warnings')}
                  className="btn"
                  style={{
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.85rem',
                    background: activeTab === 'warnings' ? 'var(--primary-color)' : 'rgba(251, 191, 36, 0.15)',
                    color: activeTab === 'warnings' ? '#fff' : '#f59e0b'
                  }}
                >
                  ⚠️ Cảnh báo ({parsedData.warnings.length})
                </button>
              )}
            </div>
          </div>

          {/* TAB 1: MA TRẬN SỐ LIỆU */}
          {activeTab === 'matrix' && (
            <div style={{ overflowX: 'auto', maxHeight: '550px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--surface-color)', zIndex: 10 }}>
                  <tr>
                    <th style={{ padding: '0.75rem', borderBottom: '2px solid var(--surface-border)', minWidth: '220px' }}>Chỉ Tiêu P&L</th>
                    {parsedData.branches.map(b => (
                      <th key={b.branchName} style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '2px solid var(--surface-border)', minWidth: '130px' }}>
                        {b.branchName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsedData.categories.map((cat, idx) => (
                    <tr key={cat.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                      <td style={{ padding: '0.5rem 0.75rem', fontWeight: 500 }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginRight: '6px' }}>[{cat.id}]</span>
                        {cat.name}
                      </td>
                      {parsedData.branches.map(b => {
                        const bKey = b.branchId || b.rawName;
                        const amt = parsedData.matrixData[cat.id]?.[bKey] || 0;
                        const isNegative = amt < 0;
                        return (
                          <td key={b.branchName} style={{ padding: '0.5rem 0.75rem', textAlign: 'right', color: isNegative ? '#f59e0b' : (amt > 0 ? 'var(--text-primary)' : 'var(--text-secondary)') }}>
                            {formatCurrency(amt)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: ĐỐI CHIẾU CHECKSUM */}
          {activeTab === 'checksum' && (
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Hệ thống tự động cộng dồn các chỉ tiêu con và so khớp với các dòng tổng trong file Excel của từng cơ sở để phát hiện sai sót nếu có:
              </p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                  <thead style={{ background: 'var(--surface-color)' }}>
                    <tr>
                      <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--surface-border)' }}>Cơ sở</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '1px solid var(--surface-border)' }}>Tổng Doanh Thu (Tính)</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '1px solid var(--surface-border)' }}>Doanh Thu (Excel)</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid var(--surface-border)' }}>Khớp DT?</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '1px solid var(--surface-border)' }}>EBIT (Tính)</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '1px solid var(--surface-border)' }}>EBIT (Excel)</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', borderBottom: '1px solid var(--surface-border)' }}>Khớp EBIT?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.checksumReport.map(item => (
                      <tr key={item.branchName} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{item.branchName}</td>
                        <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>{formatCurrency(item.calcRevenue)}</td>
                        <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>{formatCurrency(item.excelRevenue)}</td>
                        <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                          <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', background: item.isRevenueMatch ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: item.isRevenueMatch ? '#22c55e' : '#ef4444' }}>
                            {item.isRevenueMatch ? '✓ Khớp' : 'Lệch'}
                          </span>
                        </td>
                        <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.calcEBIT)}</td>
                        <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.excelEBIT)}</td>
                        <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                          <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', background: item.isEBITMatch ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)', color: item.isEBITMatch ? '#22c55e' : '#ef4444' }}>
                            {item.isEBITMatch ? '✓ Khớp 100%' : 'Lệch'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: CẢNH BÁO */}
          {activeTab === 'warnings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {parsedData.warnings.map((w, i) => (
                <div key={i} style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)', fontSize: '0.85rem' }}>
                  ⚠️ {w.message}
                </div>
              ))}
            </div>
          )}

          {/* BƯỚC 3: NÚT XÁC NHẬN GHI ĐÈ */}
          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {userRole === 'Editor' 
                  ? `Lưu ý: Bạn là Editor [${userBranch}]. Hệ thống sẽ chỉ ghi nhận dữ liệu cho cơ sở của bạn.`
                  : `Bạn đang có quyền [${userRole}]. Số liệu của toàn bộ ${parsedData.branches.length} cơ sở sẽ được cập nhật.`}
              </p>
            </div>

            <button
              onClick={handleConfirmImport}
              disabled={submitting}
              className="btn btn-primary"
              style={{ padding: '0.75rem 2rem', fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {submitting ? (
                <>
                  <div className="spinner" style={{ width: '16px', height: '16px' }}></div>
                  <span>Đang lưu vào Google Sheets...</span>
                </>
              ) : (
                <>
                  <span>🚀 Xác Nhận Ghi Đè Lên Hệ Thống</span>
                </>
              )}
            </button>
          </div>

          {importResult && (
            <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '8px', background: importResult.success ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)', border: `1px solid ${importResult.success ? '#22c55e' : '#ef4444'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{importResult.success ? '✓ Thành công!' : '✗ Thất bại!'}</strong>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>{importResult.message}</p>
              </div>
              {importResult.success && (
                <Link href={`/report?month=${targetMonth}`} className="btn" style={{ background: '#22c55e', color: '#fff', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                  Xem Báo Cáo Ngay ➔
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
