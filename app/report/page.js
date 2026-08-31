'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useMasterData } from '@/hooks/useMasterData';
import PnLReportTable from '../components/PnLReportTable';
import PnLMatrixTable from '../components/PnLMatrixTable';
import { usePnLData } from '@/hooks/usePnLData';

export default function ReportPage() {
  // Sử dụng Hook Cache cho PnL Data
  const { records, loading, error, refresh } = usePnLData();
  
  // Sử dụng Hook Cache cho Master Data
  const { branches, categoryGroups, loading: masterDataLoading, error: masterDataError } = useMasterData();
  
  // Lấy tháng hiện tại (YYYY-MM)
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  const [filters, setFilters] = useState({
    viewMode: 'single', // 'single' | 'branch_compare' | 'trend_analysis' | 'custom_compare'
    month: currentMonth,
    branch: 'All', // Dùng cho single, branch_compare và làm Mốc Gốc (Base Target)
    selectedBranches: [], // Dùng cho trend_analysis
    selectedMonths: []
  });

  // State cho các Cột So Sánh (Dùng trong mode custom_compare)
  const [compareTargets, setCompareTargets] = useState([]);

  // Extract unique months from records for the Trend Analysis filter if needed
  const availableMonths = useMemo(() => {
    const months = new Set();
    records.forEach(r => { if (r.date) months.add(r.date); });
    return Array.from(months).sort().reverse();
  }, [records]);

  const isInitialized = useRef(false);

  // Khởi tạo selectedMonths và selectedBranches khi dữ liệu đã sẵn sàng
  useEffect(() => {
    if (!isInitialized.current && availableMonths.length > 0 && branches.length > 0) {
      setFilters(prev => ({ 
        ...prev, 
        selectedMonths: availableMonths,
        selectedBranches: [...branches]
      }));
      isInitialized.current = true;
    }
  }, [availableMonths, branches]);

  const handleMonthToggle = (month) => {
    setFilters(prev => {
      const current = prev.selectedMonths || [];
      if (current.includes(month)) {
        return { ...prev, selectedMonths: current.filter(m => m !== month) };
      } else {
        return { ...prev, selectedMonths: [...current, month] };
      }
    });
  };

  const handleBranchToggle = (b) => {
    setFilters(prev => {
      const current = prev.selectedBranches || [];
      if (current.includes(b)) {
        return { ...prev, selectedBranches: current.filter(br => br !== b) };
      } else {
        return { ...prev, selectedBranches: [...current, b] };
      }
    });
  };

  const handleFilterChange = (e) => {
    setFilters(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  // Logic thêm/xóa/sửa Cột So Sánh
  const addCompareTarget = () => {
    setCompareTargets(prev => [
      ...prev,
      { id: Date.now(), branch: branches[0] || 'All', month: availableMonths[0] || currentMonth }
    ]);
  };

  const updateCompareTarget = (id, field, value) => {
    setCompareTargets(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const removeCompareTarget = (id) => {
    setCompareTargets(prev => prev.filter(t => t.id !== id));
  };

  if (masterDataLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Đang tải Cấu hình hệ thống...</p>
      </div>
    );
  }

  if (masterDataError) {
    return (
      <div className="error-message" style={{ margin: '2rem' }}>
        Lỗi tải Cấu hình: {masterDataError}
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ padding: '0 0.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '5rem' }}>
      <header style={{ padding: '1rem 0' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Báo Cáo Phân Tích</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Phân tích chuyên sâu dữ liệu P&L toàn hệ thống</p>
      </header>

      {/* Toolbar - Bộ lọc */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0, minWidth: '220px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block', fontWeight: 600 }}>CÔNG CỤ PHÂN TÍCH</label>
            <select 
              name="viewMode" 
              value={filters.viewMode} 
              onChange={handleFilterChange}
              className="form-control"
              style={{ padding: '0.5rem 1rem', fontWeight: 600, border: '1px solid var(--primary-color)', color: 'var(--primary-color)' }}
            >
              <option value="single">📊 Báo cáo Đơn (1 Tháng)</option>
              <option value="branch_compare">🏢 So sánh Cơ sở cùng tháng</option>
              <option value="trend_analysis">📈 Phân tích Xu hướng dài hạn</option>
              <option value="custom_compare">🛠️ Trình Dựng So Sánh Tùy Chỉnh</option>
            </select>
          </div>

          <button 
            onClick={refresh} 
            className="btn btn-primary" 
            style={{ width: 'auto', padding: '0.5rem 1.5rem', marginLeft: 'auto' }}
            disabled={loading || masterDataLoading}
          >
            {loading ? 'Đang tải...' : 'Làm Mới Dữ Liệu'}
          </button>
        </div>

        {/* --- CÁC KHỐI CHỌN ĐIỀU KIỆN TƯƠNG ỨNG VỚI TỪNG VIEW MODE --- */}

        {/* Khối cho Single, Branch Compare và Cột Mốc của Custom Compare */}
        {filters.viewMode !== 'trend_analysis' && (
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', background: filters.viewMode === 'custom_compare' ? 'rgba(56, 189, 248, 0.05)' : 'transparent', padding: filters.viewMode === 'custom_compare' ? '1rem' : '0', borderRadius: '8px', border: filters.viewMode === 'custom_compare' ? '1px dashed var(--primary-color)' : 'none' }}>
            {filters.viewMode === 'custom_compare' && (
              <div style={{ width: '100%', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary-color)', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                  🎯 CỘT MỐC (BASE TARGET)
                </span>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>Mọi đối tượng so sánh bên dưới sẽ được tính % chênh lệch dựa trên Mốc này.</p>
              </div>
            )}
            
            <div className="form-group" style={{ marginBottom: 0, minWidth: '160px', flex: 1 }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}>Kỳ Báo Cáo</label>
              <select
                name="month"
                value={filters.month}
                onChange={handleFilterChange}
                className="form-control"
                style={{ padding: '0.5rem 1rem' }}
              >
                <option value={currentMonth}>Tháng {currentMonth}</option>
                {availableMonths.map(m => m !== currentMonth && <option key={m} value={m}>Tháng {m}</option>)}
              </select>
            </div>

            {/* Cột chọn Cơ sở dạng Dropdown (Ẩn nếu đang ở branch_compare vì branch_compare sẽ lấy tất cả MasterBranches) */}
            {filters.viewMode !== 'branch_compare' && (
              <div className="form-group" style={{ marginBottom: 0, minWidth: '180px', flex: 1 }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}>Cơ Sở</label>
                <select 
                  name="branch" 
                  value={filters.branch} 
                  onChange={handleFilterChange}
                  className="form-control"
                  style={{ padding: '0.5rem 1rem' }}
                >
                  <option value="All">-- TẤT CẢ CƠ SỞ --</option>
                  {branches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Khối dành riêng cho CUSTOM COMPARE */}
        {filters.viewMode === 'custom_compare' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ width: '100%', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f59e0b', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                ⚖️ ĐỐI TƯỢNG SO SÁNH (COMPARE TARGETS)
              </span>
            </div>
            
            {compareTargets.length === 0 && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontStyle: 'italic', margin: 0 }}>
                Chưa có đối tượng so sánh nào. Hãy bấm thêm bên dưới.
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {compareTargets.map((target, index) => (
                <div key={target.id} style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', minWidth: '25px' }}>#{index + 1}</span>
                  
                  <select 
                    value={target.month} 
                    onChange={e => updateCompareTarget(target.id, 'month', e.target.value)}
                    className="form-control"
                    style={{ padding: '0.4rem', width: 'auto', minWidth: '130px', fontSize: '0.9rem' }}
                  >
                    <option value={currentMonth}>Tháng {currentMonth}</option>
                    {availableMonths.map(m => m !== currentMonth && <option key={m} value={m}>Tháng {m}</option>)}
                  </select>

                  <select 
                    value={target.branch} 
                    onChange={e => updateCompareTarget(target.id, 'branch', e.target.value)}
                    className="form-control"
                    style={{ padding: '0.4rem', width: 'auto', minWidth: '160px', fontSize: '0.9rem' }}
                  >
                    <option value="All">-- TẤT CẢ CƠ SỞ --</option>
                    {branches.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>

                  <button 
                    onClick={() => removeCompareTarget(target.id)}
                    className="btn"
                    style={{ padding: '0.4rem 0.6rem', background: 'rgba(244, 63, 94, 0.1)', color: 'var(--expense-color)', marginLeft: 'auto' }}
                    title="Xóa cột so sánh này"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <button 
              onClick={addCompareTarget}
              className="btn"
              style={{ width: 'fit-content', padding: '0.5rem 1rem', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px dashed #f59e0b' }}
            >
              + Thêm Đối Tượng So Sánh
            </button>
          </div>
        )}

        {/* Khối dành riêng cho TREND ANALYSIS */}
        {filters.viewMode === 'trend_analysis' && (
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {/* Cột tick chọn Cơ sở cho Phân Tích Xu Hướng */}
            <div className="form-group" style={{ marginBottom: 0, minWidth: '250px', flex: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>Chọn các cơ sở so sánh</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={() => setFilters(prev => ({ ...prev, selectedBranches: [...branches] }))} 
                    className="btn"
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', minWidth: '60px' }}
                  >
                    <FaCheckDouble style={{ display: 'inline', marginRight: '4px' }} /> Tất cả
                  </button>
                  <button 
                    onClick={() => setFilters(prev => ({ ...prev, selectedBranches: [] }))} 
                    className="btn"
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', border: '1px solid var(--surface-border)', minWidth: '60px' }}
                  >
                    <FaRegSquare style={{ display: 'inline', marginRight: '4px' }} /> Bỏ chọn
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
                {branches.length === 0 ? (
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Không có cơ sở</span>
                ) : (
                  branches.map(b => (
                    <label key={b} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={filters.selectedBranches?.includes(b) || false} 
                        onChange={() => handleBranchToggle(b)} 
                        style={{ accentColor: 'var(--primary-color)', width: '16px', height: '16px' }}
                      />
                      {b}
                    </label>
                  ))
                )}
              </div>
            </div>

            {/* Cột tick chọn nhiều Tháng cho Phân Tích Xu Hướng */}
            <div className="form-group" style={{ marginBottom: 0, minWidth: '250px', flex: 2 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>Chọn các tháng hiển thị</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    onClick={() => setFilters(prev => ({ ...prev, selectedMonths: availableMonths }))} 
                    className="btn"
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', minWidth: '60px' }}
                  >
                    <FaCheckDouble style={{ display: 'inline', marginRight: '4px' }} /> Tất cả
                  </button>
                  <button 
                    onClick={() => setFilters(prev => ({ ...prev, selectedMonths: [] }))} 
                    className="btn"
                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-secondary)', border: '1px solid var(--surface-border)', minWidth: '60px' }}
                  >
                    <FaRegSquare style={{ display: 'inline', marginRight: '4px' }} /> Bỏ chọn
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-border)' }}>
                {availableMonths.length === 0 ? (
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Không có dữ liệu</span>
                ) : (
                  availableMonths.map(m => (
                    <label key={m} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.9rem', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={filters.selectedMonths?.includes(m) || false} 
                        onChange={() => handleMonthToggle(m)} 
                        style={{ accentColor: 'var(--primary-color)', width: '16px', height: '16px' }}
                      />
                      {m}
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Nội dung báo cáo */}
      {error ? (
        <div className="error-message" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          {error}
        </div>
      ) : loading ? (
        <div className="glass-panel" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div className="spinner"></div>
          <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Đang tổng hợp dữ liệu báo cáo...</p>
        </div>
      ) : filters.viewMode === 'single' ? (
        <PnLReportTable records={records} filters={filters} categoryGroups={categoryGroups} />
      ) : (
        <PnLMatrixTable 
          records={records} 
          mode={filters.viewMode} 
          targetMonth={filters.month} 
          targetBranch={filters.branch} 
          targetMonths={filters.selectedMonths}
          targetBranches={filters.selectedBranches}
          compareTargets={compareTargets} // Truyền sang Matrix
          categoryGroups={categoryGroups}
          masterBranches={branches}
        />
      )}
    </div>
  );
}
