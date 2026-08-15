'use client';
import { useState, useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';
import { usePnLData } from '@/hooks/usePnLData';
import { useMasterData } from '@/hooks/useMasterData';

export default function Home() {
  const { records, lastUpdated, loading, error, refresh } = usePnLData();
  const { branches, categoryGroups, loading: masterLoading } = useMasterData();

  const currentMonth = new Date().toISOString().slice(0, 7);
  const [targetBranch, setTargetBranch] = useState('All');
  const [targetMonth, setTargetMonth] = useState(currentMonth);

  // Mảng các tháng có dữ liệu
  const availableMonths = useMemo(() => {
    const mSet = new Set();
    records.forEach(r => { if (r.date) mSet.add(r.date) });
    return Array.from(mSet).sort().reverse();
  }, [records]);

  // Hiển thị thời gian cập nhật
  const timeAgo = useMemo(() => {
    if (!lastUpdated) return '';
    const diff = Math.floor((Date.now() - lastUpdated) / 60000);
    if (diff < 1) return 'Vừa xong';
    return `${diff} phút trước`;
  }, [lastUpdated]);

  const getPreviousMonth = (monthStr) => {
    if (!monthStr) return null;
    const [year, month] = monthStr.split('-');
    let m = parseInt(month, 10) - 1;
    let y = parseInt(year, 10);
    if (m === 0) { m = 12; y -= 1; }
    return `${y}-${m.toString().padStart(2, '0')}`;
  };

  const prevMonth = getPreviousMonth(targetMonth);

  // Tính toán dữ liệu tổng hợp
  const dashboardData = useMemo(() => {
    let rev = 0, exp = 0, prevRev = 0, prevExp = 0;
    const expenseByCategory = {};
    const revenueByBranchOrCat = {};
    const monthlyTrend = {}; 

    const last6Months = [];
    let currM = targetMonth;
    for (let i = 0; i < 6; i++) {
      if (currM) {
        last6Months.unshift(currM);
        monthlyTrend[currM] = { rev: 0, exp: 0, ebit: 0 };
        currM = getPreviousMonth(currM);
      }
    }

    records.forEach(r => {
      if (targetBranch !== 'All' && r.branch !== targetBranch) return;

      const amt = Number(r.amount);
      const isCurrentMonth = r.date === targetMonth;
      const isPrevMonth = r.date === prevMonth;
      
      const group = categoryGroups?.find(g => g.items.includes(r.category));
      if (!group) return;

      // Sparkline (6 tháng)
      if (monthlyTrend[r.date]) {
        if (group.type === 'Thu') {
          monthlyTrend[r.date].rev += amt;
          monthlyTrend[r.date].ebit += amt;
        } else if (group.type === 'Chi') {
          monthlyTrend[r.date].exp += amt;
          monthlyTrend[r.date].ebit -= amt;
        }
      }

      // Tháng hiện tại & Tháng trước
      if (isCurrentMonth) {
        if (group.type === 'Thu') {
          rev += amt;
          if (targetBranch === 'All') {
            revenueByBranchOrCat[r.branch] = (revenueByBranchOrCat[r.branch] || 0) + amt;
          } else {
            revenueByBranchOrCat[r.category] = (revenueByBranchOrCat[r.category] || 0) + amt;
          }
        } else if (group.type === 'Chi') {
          exp += amt;
          expenseByCategory[r.category] = (expenseByCategory[r.category] || 0) + amt;
        }
      } else if (isPrevMonth) {
        if (group.type === 'Thu') prevRev += amt;
        else if (group.type === 'Chi') prevExp += amt;
      }
    });

    const ebit = rev - exp;
    const prevEbit = prevRev - prevExp;

    const calcDelta = (cur, prev) => {
      if (prev === 0 && cur === 0) return 0;
      if (prev === 0) return 100;
      return ((cur - prev) / prev) * 100;
    };

    return {
      rev, exp, ebit,
      deltaRev: calcDelta(rev, prevRev),
      deltaExp: calcDelta(exp, prevExp),
      deltaEbit: calcDelta(ebit, prevEbit),
      margin: rev > 0 ? (ebit / rev) * 100 : 0,
      expenseByCategory: Object.entries(expenseByCategory).sort((a,b) => b[1] - a[1]).slice(0, 5),
      revenueByBranchOrCat: Object.entries(revenueByBranchOrCat).sort((a,b) => b[1] - a[1]).slice(0, 5),
      sparkline: last6Months.map(m => monthlyTrend[m]),
      sparklineMonths: last6Months
    };
  }, [records, targetBranch, targetMonth, categoryGroups, prevMonth]);

  // Cảnh báo (Alerts)
  const alerts = useMemo(() => {
    const list = [];
    if (!records.length || !categoryGroups) return list;

    const m1 = getPreviousMonth(targetMonth);
    const m2 = getPreviousMonth(m1);
    const m3 = getPreviousMonth(m2);
    
    const catStats = {};
    records.forEach(r => {
      if (targetBranch !== 'All' && r.branch !== targetBranch) return;
      if (!categoryGroups.find(g => g.type === 'Chi' && g.items.includes(r.category))) return;
      
      const amt = Number(r.amount);
      if (!catStats[r.category]) catStats[r.category] = { current: 0, past: 0 };
      
      if (r.date === targetMonth) catStats[r.category].current += amt;
      else if (r.date === m1 || r.date === m2 || r.date === m3) {
        catStats[r.category].past += amt;
      }
    });

    Object.entries(catStats).forEach(([cat, stats]) => {
      const avg = stats.past / 3;
      if (avg > 0 && stats.current > avg * 1.2) {
        const pct = ((stats.current - avg) / avg * 100).toFixed(0);
        list.push({ type: 'warning', msg: `Chi phí ${cat} tăng đột biến: ${formatCurrency(stats.current)} (+${pct}% so với TB 3 tháng)` });
      }
      if (stats.current < 0) {
        list.push({ type: 'error', msg: `Phát hiện chi phí âm ở hạng mục ${cat}: ${formatCurrency(stats.current)}` });
      }
    });

    if (dashboardData.deltaEbit < 0 && dashboardData.ebit > 0) {
      list.push({ type: 'warning', msg: `Lợi nhuận (EBIT) sụt giảm ${Math.abs(dashboardData.deltaEbit).toFixed(1)}% so với tháng trước.` });
    }

    return list;
  }, [records, targetBranch, targetMonth, categoryGroups, dashboardData.deltaEbit, dashboardData.ebit]);

  // Component Sparkline
  const renderSparkline = (dataArr, key, color) => {
    if (dataArr.length === 0) return null;
    const values = dataArr.map(d => d[key]);
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;
    const height = 40;
    const width = 120;
    
    const points = values.map((val, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((val - min) / range) * height * 0.8 - height * 0.1;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ marginTop: '0.5rem', overflow: 'visible' }}>
        <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Điểm nhấn ở cuối */}
        <circle cx={width} cy={height - ((values[values.length-1] - min) / range) * height * 0.8 - height * 0.1} r="3" fill={color} />
      </svg>
    );
  };

  const renderDelta = (delta, isExpense = false) => {
    if (delta === 0) return null;
    const isGood = isExpense ? delta < 0 : delta > 0;
    const color = isGood ? 'var(--revenue-color)' : 'var(--expense-color)';
    const sign = delta > 0 ? '↑' : '↓';
    return (
      <span style={{ color, fontSize: '0.85rem', fontWeight: 600, marginLeft: '0.5rem' }}>
        {sign} {Math.abs(delta).toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="container" style={{ paddingBottom: '5rem' }}>
      <header style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <h1 className="animate-fade-in" style={{ fontSize: '1.75rem', fontWeight: 700 }}>Dashboard Tổng Quan</h1>
        <p className="slogan animate-fade-in" style={{ animationDelay: '0.1s' }}>Sống tươi mỗi ngày qua tách cà phê</p>
      </header>
      
      {/* Tầng 1: Context Bar */}
      <div className="glass-panel animate-fade-in" style={{ padding: '0.75rem 1.5rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <select 
            value={targetBranch} 
            onChange={e => setTargetBranch(e.target.value)}
            className="form-control" style={{ width: 'auto', minWidth: '150px', padding: '0.5rem' }}
          >
            <option value="All">-- Tất cả cơ sở --</option>
            {branches?.map(b => <option key={b} value={b}>{b}</option>)}
          </select>

          <select 
            value={targetMonth} 
            onChange={e => setTargetMonth(e.target.value)}
            className="form-control" style={{ width: 'auto', minWidth: '150px', padding: '0.5rem' }}
          >
            <option value={currentMonth}>Tháng {currentMonth}</option>
            {availableMonths.map(m => m !== currentMonth && <option key={m} value={m}>Tháng {m}</option>)}
          </select>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Cập nhật: {timeAgo}</span>
          <button onClick={refresh} className="btn btn-primary" style={{ padding: '0.4rem 1rem' }} disabled={loading}>
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message" style={{ marginBottom: '1.5rem' }}>Lỗi: {error}</div>
      )}

      {loading && !records.length ? (
        <div className="spinner" style={{ margin: '3rem auto' }}></div>
      ) : (
        <>
          {/* Tầng 2 & 4: KPI Cards + Sparkline */}
          <div className="summary-cards animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="glass-panel summary-card revenue" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>TỔNG DOANH THU</p>
              <h3 style={{ fontSize: '1.75rem', margin: '0.5rem 0', color: 'var(--revenue-color)' }}>
                {formatCurrency(dashboardData.rev)}
              </h3>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>So với T{prevMonth ? prevMonth.split('-')[1] : 'trước'}</span>
                {renderDelta(dashboardData.deltaRev, false)}
              </div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, opacity: 0.4 }}>
                {renderSparkline(dashboardData.sparkline, 'rev', 'var(--revenue-color)')}
              </div>
            </div>
            
            <div className="glass-panel summary-card expense" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>TỔNG CHI PHÍ</p>
              <h3 style={{ fontSize: '1.75rem', margin: '0.5rem 0', color: 'var(--expense-color)' }}>
                {formatCurrency(dashboardData.exp)}
              </h3>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>So với T{prevMonth ? prevMonth.split('-')[1] : 'trước'}</span>
                {renderDelta(dashboardData.deltaExp, true)}
              </div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, opacity: 0.3 }}>
                {renderSparkline(dashboardData.sparkline, 'exp', 'var(--expense-color)')}
              </div>
            </div>
            
            <div className="glass-panel summary-card profit" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>LỢI NHUẬN (EBIT)</p>
              <h3 style={{ fontSize: '1.75rem', margin: '0.5rem 0', color: 'var(--profit-color)' }}>
                {formatCurrency(dashboardData.ebit)}
              </h3>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Biên LN: <strong style={{ color: 'var(--profit-color)' }}>{dashboardData.margin.toFixed(1)}%</strong></span>
                {renderDelta(dashboardData.deltaEbit, false)}
              </div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, opacity: 0.4 }}>
                {renderSparkline(dashboardData.sparkline, 'ebit', 'var(--profit-color)')}
              </div>
            </div>
          </div>

          {/* Tầng 3: Phân bổ nhanh */}
          <div className="dashboard-grid animate-fade-in" style={{ animationDelay: '0.2s', marginTop: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', fontWeight: 600 }}>Chi phí theo hạng mục</h3>
              {dashboardData.expenseByCategory.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>Chưa có dữ liệu chi phí</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {dashboardData.expenseByCategory.map(([cat, amt]) => {
                    const pct = dashboardData.exp > 0 ? (amt / dashboardData.exp * 100) : 0;
                    return (
                      <div key={cat}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                          <span>{cat}</span>
                          <span style={{ fontWeight: 600 }}>{formatCurrency(amt)} <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>({pct.toFixed(0)}%)</span></span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: 'var(--surface-border)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--expense-color)', borderRadius: '4px' }}></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', fontWeight: 600 }}>
                {targetBranch === 'All' ? 'Doanh thu theo cơ sở' : 'Doanh thu theo hạng mục'}
              </h3>
              {dashboardData.revenueByBranchOrCat.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>Chưa có dữ liệu doanh thu</p> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {dashboardData.revenueByBranchOrCat.map(([key, amt]) => {
                    const pct = dashboardData.rev > 0 ? (amt / dashboardData.rev * 100) : 0;
                    return (
                      <div key={key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                          <span>{key}</span>
                          <span style={{ fontWeight: 600 }}>{formatCurrency(amt)} <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>({pct.toFixed(0)}%)</span></span>
                        </div>
                        <div style={{ width: '100%', height: '8px', background: 'var(--surface-border)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${pct}%`, height: '100%', background: 'var(--revenue-color)', borderRadius: '4px' }}></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Tầng 5: Alerts */}
          {alerts.length > 0 && (
            <div className="animate-fade-in" style={{ animationDelay: '0.3s', marginTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--expense-color)' }}>⚠️</span> Cảnh báo & Việc cần chú ý
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {alerts.map((alert, idx) => (
                  <div key={idx} className="glass-panel" style={{ 
                    padding: '1rem', 
                    borderLeft: `4px solid ${alert.type === 'error' ? 'var(--expense-color)' : '#f59e0b'}`,
                    background: alert.type === 'error' ? 'rgba(244, 63, 94, 0.05)' : 'rgba(245, 158, 11, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={alert.type === 'error' ? 'var(--expense-color)' : '#f59e0b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                      <line x1="12" y1="9" x2="12" y2="13"></line>
                      <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    <p style={{ margin: 0, fontWeight: 500 }}>{alert.msg}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
