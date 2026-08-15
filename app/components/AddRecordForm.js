'use client';
import { useState, useMemo, useEffect } from 'react';
import { useMasterData } from '@/hooks/useMasterData';
import { usePnLData } from '@/hooks/usePnLData';
import { formatCurrency } from '@/lib/utils';

export default function AddRecordForm({ onRecordAdded }) {
  const { invalidateCache } = usePnLData();
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const { branches, categoryGroups, loading: masterDataLoading, error: masterDataError } = useMasterData();

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [openSections, setOpenSections] = useState({});

  // Mở group đầu tiên khi categoryGroups đã tải xong
  useEffect(() => {
    if (categoryGroups && categoryGroups.length > 0 && Object.keys(openSections).length === 0) {
      setOpenSections({ [categoryGroups[0].group]: true });
    }
  }, [categoryGroups, openSections]);

  // Lấy tháng hiện tại làm mặc định (YYYY-MM)
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  const [meta, setMeta] = useState({
    month: currentMonth,
    branch: '',
    note: ''
  });
  
  const [amounts, setAmounts] = useState({});

  // Không cần useEffect fetch master data ở đây nữa vì đã có useMasterData hook

  const toggleSection = (id) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleMetaChange = (e) => {
    setMeta({ ...meta, [e.target.name]: e.target.value });
    if (errorMsg) setErrorMsg('');
  };

  const handleAmountChange = (category, value) => {
    if (value !== '' && isNaN(Number(value))) return;
    setAmounts(prev => ({ ...prev, [category]: value }));
  };

  // Auto-fill logic when month and branch change
  useEffect(() => {
    const fetchData = async () => {
      if (!meta.month || !meta.branch) return;
      
      setFetchingData(true);
      setErrorMsg('');
      try {
        const res = await fetch(`/api/pnl?action=get_details&month=${meta.month}&branch=${meta.branch}`);
        if (res.ok) {
          const data = await res.json();
          const newAmounts = {};
          let existingNote = '';
          
          if (data.records && data.records.length > 0) {
            data.records.forEach(r => {
              newAmounts[r.category] = r.amount.toString();
              if (r.note && !existingNote) existingNote = r.note;
            });
            setSuccessMsg('Đã tải số liệu cũ để chỉnh sửa.');
            setTimeout(() => setSuccessMsg(''), 3000);
          }
          
          setAmounts(newAmounts);
          setMeta(prev => ({ ...prev, note: existingNote }));
        }
      } catch (err) {
        console.error('Failed to fetch existing data:', err);
      } finally {
        setFetchingData(false);
      }
    };
    
    fetchData();
  }, [meta.month, meta.branch]);

  // Real-time Calculation
  const { totalRevenue, totalExpense, ebit } = useMemo(() => {
    let rev = 0;
    let exp = 0;
    
    categoryGroups.forEach(group => {
      group.items.forEach(cat => {
        const val = Number(amounts[cat]) || 0;
        if (group.type === 'Thu') rev += val;
        else if (group.type === 'Chi') exp += val;
      });
    });
    
    return {
      totalRevenue: rev,
      totalExpense: exp,
      ebit: rev - exp
    };
  }, [amounts, categoryGroups]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!meta.month) return setErrorMsg('Vui lòng chọn Tháng/Năm.');
    if (!meta.branch) return setErrorMsg('Vui lòng chọn Cơ sở.');
    
    const records = [];
    categoryGroups.forEach(group => {
      group.items.forEach(cat => {
        const val = Number(amounts[cat]);
        if (val && val !== 0) {
          records.push({
            category: cat,
            type: group.type,
            amount: val,
            note: meta.note
          });
        }
      });
    });

    if (records.length === 0) {
      return setErrorMsg('Vui lòng nhập ít nhất một khoản tiền khác 0.');
    }

    setLoading(true);
    setErrorMsg('');
    
    try {
      const response = await fetch('/api/pnl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          month: meta.month, 
          branch: meta.branch, 
          records 
        }),
      });
      
      if (response.ok) {
        invalidateCache(); // Xóa cache PnL để các trang khác tải lại dữ liệu mới
        setSuccessMsg('Lưu giao dịch thành công!');
        setTimeout(() => setSuccessMsg(''), 3500);
        if (onRecordAdded) onRecordAdded();
      } else {
        const errorData = await response.json();
        setErrorMsg(errorData.error || 'Failed to submit data');
      }
    } catch (error) {
      setErrorMsg('Có lỗi xảy ra khi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  if (masterDataLoading) {
    return (
      <div className="glass-panel" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Đang tải Cấu hình hệ thống (Cơ sở & Danh mục)...</p>
      </div>
    );
  }

  return (
    <div className="glass-panel interactive animate-fade-in" style={{ animationDelay: '0.1s', padding: '0', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '1.5rem 1.5rem 0' }}>
        <h2>Nhập Liệu & Chỉnh Sửa P&L</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Chọn Tháng và Cơ sở để xem số liệu cũ (nếu có) hoặc nhập mới. Dữ liệu khi lưu sẽ tự động ghi đè.
        </p>
      </div>
      
      {errorMsg && (
        <div style={{ padding: '0 1.5rem', marginTop: '1rem' }}>
          <div className="error-message">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            {errorMsg}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ padding: '1rem 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Header: Month & Branch */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Tháng / Năm</label>
            <input
              type="month"
              name="month"
              value={meta.month}
              onChange={handleMetaChange}
              className={`form-control ${errorMsg && !meta.month ? 'input-error' : ''}`}
              required
            />
          </div>
          
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Cơ sở</label>
            <select 
              name="branch" 
              value={meta.branch} 
              onChange={handleMetaChange}
              className={`form-control ${errorMsg && !meta.branch ? 'input-error' : ''}`}
              required
            >
              <option value="" disabled>-- Chọn Cơ Sở --</option>
              {branches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>

        {fetchingData && (
          <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}>
            <span className="spinner" style={{width: '16px', height: '16px', marginRight: '8px', borderWidth: '2px'}}></span> 
            Đang tải dữ liệu cũ...
          </div>
        )}

        {/* Accordions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', opacity: fetchingData ? 0.5 : 1, pointerEvents: fetchingData ? 'none' : 'auto' }}>
          {categoryGroups.map(group => (
            <div key={group.group} style={{ border: '1px solid var(--surface-border)', borderRadius: '12px', overflow: 'hidden' }}>
              <div 
                className="accordion-header" 
                onClick={() => toggleSection(group.group)}
                style={{ marginBottom: 0, borderRadius: 0, border: 'none', background: group.type === 'Thu' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.02)' }}
              >
                <span className="accordion-title">{group.group}</span>
                <span className={`accordion-icon ${openSections[group.group] ? 'open' : ''}`}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </span>
              </div>
              
              <div className={`accordion-content ${openSections[group.group] ? 'open' : ''}`} style={{ padding: openSections[group.group] ? '1rem' : '0 1rem', background: 'rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {group.items.map(cat => (
                    <div key={cat} className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{cat}</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={amounts[cat] || ''}
                          onChange={(e) => handleAmountChange(cat, e.target.value)}
                          className="form-control"
                          placeholder="0"
                          style={{ paddingRight: '2.5rem', textAlign: 'right', fontWeight: '500' }}
                        />
                        <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>đ</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Note */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Ghi chú tổng thể (Tùy chọn)</label>
          <input
            type="text"
            name="note"
            value={meta.note}
            onChange={handleMetaChange}
            className="form-control"
            placeholder="Ghi chú cho các giao dịch này..."
          />
        </div>
        
        {/* Real-time Summary Footer */}
        <div style={{ background: 'rgba(255,255,255,0.03)', borderTop: '1px solid var(--surface-border)', margin: '1rem -1.5rem -1.5rem', padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottomLeftRadius: '20px', borderBottomRightRadius: '20px', flexWrap: 'wrap', gap: '1rem' }}>
          
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Tổng Doanh Thu</p>
              <div style={{ color: 'var(--revenue-color)', fontWeight: 'bold', fontSize: '1.25rem' }}>{formatCurrency(totalRevenue)}</div>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Tổng Chi Phí</p>
              <div style={{ color: 'var(--expense-color)', fontWeight: 'bold', fontSize: '1.25rem' }}>{formatCurrency(totalExpense)}</div>
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Lợi Nhuận (EBIT)</p>
              <div style={{ color: 'var(--profit-color)', fontWeight: 'bold', fontSize: '1.25rem' }}>{formatCurrency(ebit)}</div>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading || fetchingData} style={{ width: 'auto', minWidth: '150px' }}>
            {loading ? (
              <><span className="spinner" style={{width: '16px', height: '16px', marginRight: '8px', borderWidth: '2px'}}></span> Đang lưu...</>
            ) : 'Lưu Dữ Liệu'}
          </button>

        </div>
      </form>

      {successMsg && (
        <div className="toast-container">
          <div className="toast">
            <svg style={{ color: 'var(--revenue-color)' }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            <span style={{ fontWeight: 500 }}>{successMsg}</span>
          </div>
        </div>
      )}
    </div>
  );
}
