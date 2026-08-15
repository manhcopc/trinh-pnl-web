'use client';
import { useState, useEffect, useMemo } from 'react';
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
    viewMode: 'single', // 'single' | 'branch_compare' | 'trend_analysis'
    month: currentMonth,
    branch: 'All', // Dùng cho single và branch_compare
    selectedBranches: [], // Dùng cho trend_analysis
    selectedMonths: []
  });

  // Extract unique months from records for the Trend Analysis filter if needed
  const availableMonths = useMemo(() => {
    const months = new Set();
    records.forEach(r => { if (r.date) months.add(r.date); });
    return Array.from(months).sort().reverse();
  }, [records]);

  // Khởi tạo selectedMonths và selectedBranches khi dữ liệu đã sẵn sàng
  useEffect(() => {
    if (availableMonths.length > 0 && filters.selectedMonths.length === 0) {
      setFilters(prev => ({ ...prev, selectedMonths: availableMonths }));
    }
    if (branches.length > 0 && filters.selectedBranches.length === 0) {
      // Mặc định chọn tất cả
      setFilters(prev => ({ ...prev, selectedBranches: [...branches] }));
    }
  }, [availableMonths, branches, filters.selectedMonths.length, filters.selectedBranches.length]);

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
      <div className="glass-panel" style={{ padding: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        
        <div className="form-group" style={{ marginBottom: 0, minWidth: '180px', flex: 1 }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}>Chế Độ Xem</label>
          <select 
            name="viewMode" 
            value={filters.viewMode} 
            onChange={handleFilterChange}
            className="form-control"
            style={{ padding: '0.5rem 1rem' }}
          >
            <option value="single">📊 Báo cáo Đơn (1 Tháng)</option>
            <option value="branch_compare">🏢 So sánh Cơ sở</option>
            <option value="trend_analysis">📈 Phân tích Xu hướng (Các tháng)</option>
          </select>
        </div>

        {/* Cột chọn Tháng chỉ hiện nếu là báo cáo đơn */}
        {filters.viewMode === 'single' && (
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
        )}

        {/* Cột chọn Tháng cho So Sánh Cơ Sở (chỉ cần 1 tháng) */}
        {filters.viewMode === 'branch_compare' && (
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
        )}

        {/* Cột chọn Cơ sở dạng Dropdown (Single, Branch Compare) */}
        {filters.viewMode !== 'trend_analysis' && filters.viewMode !== 'branch_compare' && (
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

        {/* Cột tick chọn Cơ sở cho Phân Tích Xu Hướng */}
        {filters.viewMode === 'trend_analysis' && (
          <div className="form-group" style={{ marginBottom: 0, minWidth: '250px', flex: 2 }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}>Chọn các cơ sở so sánh</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', background: 'rgba(255,255,255,0.8)', padding: '0.75rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)' }}>
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
        )}

        {/* Cột tick chọn nhiều Tháng cho Phân Tích Xu Hướng */}
        {filters.viewMode === 'trend_analysis' && (
          <div className="form-group" style={{ marginBottom: 0, minWidth: '250px', flex: 2 }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}>Chọn các tháng hiển thị</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', background: 'rgba(255,255,255,0.8)', padding: '0.75rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)' }}>
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
        )}
        <button 
          onClick={refresh} 
          className="btn btn-primary" 
          style={{ width: 'auto', padding: '0.5rem 1.5rem', marginBottom: '0.1rem' }}
          disabled={loading || masterDataLoading}
        >
          {loading ? 'Đang tải...' : 'Làm Mới Dữ Liệu'}
        </button>
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
          categoryGroups={categoryGroups}
          masterBranches={branches}
        />
      )}
    </div>
  );
}
