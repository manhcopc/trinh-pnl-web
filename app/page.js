'use client';
import { useState, useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';
import { usePnLData } from '@/hooks/usePnLData';
import { useMasterData } from '@/hooks/useMasterData';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

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
    return Array.from(mSet).sort().reverse(); // Từ mới nhất đến cũ nhất
  }, [records]);

  // Hiển thị thời gian cập nhật
  const timeAgo = useMemo(() => {
    if (!lastUpdated) return '';
    const diff = Math.floor((Date.now() - lastUpdated) / 60000);
    if (diff < 1) return 'Vừa xong';
    return `${diff} phút trước`;
  }, [lastUpdated]);

  const getPreviousMonthRaw = (monthStr) => {
    if (!monthStr) return null;
    const [year, month] = monthStr.split('-');
    let m = parseInt(month, 10) - 1;
    let y = parseInt(year, 10);
    if (m === 0) { m = 12; y -= 1; }
    return `${y}-${m.toString().padStart(2, '0')}`;
  };

  // Logic chuyển tháng động
  const currentMonthIndex = availableMonths.indexOf(targetMonth);
  const hasNextMonth = currentMonthIndex > 0;
  const hasPrevMonth = currentMonthIndex !== -1 && currentMonthIndex < availableMonths.length - 1;

  const nextMonth = hasNextMonth ? availableMonths[currentMonthIndex - 1] : null;
  const prevMonth = hasPrevMonth ? availableMonths[currentMonthIndex + 1] : null;

  const handlePrevMonth = () => { if (hasPrevMonth) setTargetMonth(prevMonth); };
  const handleNextMonth = () => { if (hasNextMonth) setTargetMonth(nextMonth); };

  // Tính toán dữ liệu tổng hợp
  const dashboardData = useMemo(() => {
    let rev = 0, exp = 0;
    let prevRev = 0, prevExp = 0;
    let nextRev = 0, nextExp = 0;
    
    const expenseByCategory = {};
    const revenueByBranchOrCat = {};
    const monthlyTrend = {}; 

    const last6Months = [];
    let currM = targetMonth;
    for (let i = 0; i < 6; i++) {
      if (currM) {
        last6Months.unshift(currM);
        monthlyTrend[currM] = { month: currM, rev: 0, exp: 0, ebit: 0 };
        currM = getPreviousMonthRaw(currM);
      }
    }

    records.forEach(r => {
      if (targetBranch !== 'All' && r.branch !== targetBranch) return;

      const amt = Number(r.amount);
      const isCurrentMonth = r.date === targetMonth;
      const isPrevMonth = r.date === prevMonth;
      const isNextMonth = r.date === nextMonth;
      
      const group = categoryGroups?.find(g => g.items.includes(r.category));
      if (!group) return;

      // Dữ liệu cho biểu đồ (6 tháng gần nhất)
      if (monthlyTrend[r.date]) {
        if (group.type === 'Thu') {
          monthlyTrend[r.date].rev += amt;
          monthlyTrend[r.date].ebit += amt;
        } else if (group.type === 'Chi') {
          monthlyTrend[r.date].exp += amt;
          monthlyTrend[r.date].ebit -= amt;
        }
      }

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
      } else if (isNextMonth) {
        if (group.type === 'Thu') nextRev += amt;
        else if (group.type === 'Chi') nextExp += amt;
      }
    });

    const ebit = rev - exp;
    const prevEbit = prevRev - prevExp;
    const nextEbit = nextRev - nextExp;

    const calcDelta = (cur, compareTo) => {
      if (compareTo === 0 && cur === 0) return 0;
      if (compareTo === 0) return 100;
      return ((cur - compareTo) / Math.abs(compareTo)) * 100;
    };

    return {
      rev, exp, ebit,
      deltaRevPrev: prevMonth ? calcDelta(rev, prevRev) : 0,
      deltaExpPrev: prevMonth ? calcDelta(exp, prevExp) : 0,
      deltaEbitPrev: prevMonth ? calcDelta(ebit, prevEbit) : 0,
      
      deltaRevNext: nextMonth ? calcDelta(rev, nextRev) : 0,
      deltaExpNext: nextMonth ? calcDelta(exp, nextExp) : 0,
      deltaEbitNext: nextMonth ? calcDelta(ebit, nextEbit) : 0,
      
      margin: rev > 0 ? (ebit / rev) * 100 : 0,
      expenseByCategory: Object.entries(expenseByCategory).sort((a,b) => b[1] - a[1]).slice(0, 5),
      revenueByBranchOrCat: Object.entries(revenueByBranchOrCat).sort((a,b) => b[1] - a[1]).slice(0, 5),
      chartData: last6Months.map(m => ({
        name: m,
        'Doanh Thu': monthlyTrend[m].rev,
        'Chi Phí': monthlyTrend[m].exp,
        'EBIT': monthlyTrend[m].ebit
      }))
    };
  }, [records, targetBranch, targetMonth, categoryGroups, prevMonth, nextMonth]);

  // Cảnh báo (Alerts)
  const alerts = useMemo(() => {
    const list = [];
    if (!records.length || !categoryGroups) return list;

    const m1 = getPreviousMonthRaw(targetMonth);
    const m2 = getPreviousMonthRaw(m1);
    const m3 = getPreviousMonthRaw(m2);
    
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

    if (dashboardData.deltaEbitPrev < 0 && dashboardData.ebit > 0) {
      list.push({ type: 'warning', msg: `Lợi nhuận (EBIT) sụt giảm ${Math.abs(dashboardData.deltaEbitPrev).toFixed(1)}% so với tháng trước.` });
    }

    return list;
  }, [records, targetBranch, targetMonth, categoryGroups, dashboardData.deltaEbitPrev, dashboardData.ebit]);

  const renderDelta = (delta, isExpense = false, label) => {
    if (delta === 0) return null;
    const isGood = isExpense ? delta < 0 : delta > 0;
    const color = isGood ? 'var(--revenue-color)' : 'var(--expense-color)';
    const sign = delta > 0 ? '↑' : '↓';
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem', paddingTop: '0.4rem', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ color, fontSize: '0.85rem', fontWeight: 600 }}>
          {sign} {Math.abs(delta).toFixed(1)}%
        </span>
      </div>
    );
  };

  const customTooltipFormatter = (value) => {
    return [formatCurrency(value), ''];
  };

  return (
    <div className="container" style={{ paddingBottom: '5rem' }}>
      <header style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <h1 className="animate-fade-in" style={{ fontSize: '1.75rem', fontWeight: 700 }}>Dashboard Tổng Quan</h1>
        <p className="slogan animate-fade-in" style={{ animationDelay: '0.1s' }}>Sống tươi mỗi ngày qua tách cà phê</p>
      </header>
      
      {/* Tầng 1: Context Bar */}
      <div className="glass-panel animate-fade-in" style={{ padding: '0.75rem 1.5rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <select 
            value={targetBranch} 
            onChange={e => setTargetBranch(e.target.value)}
            className="form-control" style={{ width: 'auto', minWidth: '150px', padding: '0.5rem' }}
          >
            <option value="All">-- Tất cả cơ sở --</option>
            {branches?.map(b => <option key={b} value={b}>{b}</option>)}
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button 
              onClick={handlePrevMonth} 
              disabled={!hasPrevMonth}
              className="btn" 
              style={{ padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.1)', opacity: hasPrevMonth ? 1 : 0.3 }}
            >
              &lt; Trước
            </button>
            <select 
              value={targetMonth} 
              onChange={e => setTargetMonth(e.target.value)}
              className="form-control" style={{ width: 'auto', minWidth: '130px', padding: '0.5rem', textAlign: 'center' }}
            >
              {availableMonths.length === 0 && <option value={currentMonth}>Tháng {currentMonth}</option>}
              {availableMonths.map(m => <option key={m} value={m}>Tháng {m}</option>)}
            </select>
            <button 
              onClick={handleNextMonth} 
              disabled={!hasNextMonth}
              className="btn" 
              style={{ padding: '0.4rem 0.8rem', background: 'rgba(255,255,255,0.1)', opacity: hasNextMonth ? 1 : 0.3 }}
            >
              Sau &gt;
            </button>
          </div>
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
          {/* Tầng 2: KPI Cards */}
          <div className="summary-cards animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="glass-panel summary-card revenue" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>TỔNG DOANH THU</p>
              <h3 style={{ fontSize: '1.75rem', margin: '0.5rem 0', color: 'var(--revenue-color)' }}>
                {formatCurrency(dashboardData.rev)}
              </h3>
              <div style={{ marginTop: 'auto' }}>
                {prevMonth && renderDelta(dashboardData.deltaRevPrev, false, `So với T${prevMonth.split('-')[1]}`)}
                {nextMonth && renderDelta(dashboardData.deltaRevNext, false, `So với T${nextMonth.split('-')[1]}`)}
                {!prevMonth && !nextMonth && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem', display: 'block' }}>Không có data so sánh</span>}
              </div>
            </div>
            
            <div className="glass-panel summary-card expense" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600 }}>TỔNG CHI PHÍ</p>
              <h3 style={{ fontSize: '1.75rem', margin: '0.5rem 0', color: 'var(--expense-color)' }}>
                {formatCurrency(dashboardData.exp)}
              </h3>
              <div style={{ marginTop: 'auto' }}>
                {prevMonth && renderDelta(dashboardData.deltaExpPrev, true, `So với T${prevMonth.split('-')[1]}`)}
                {nextMonth && renderDelta(dashboardData.deltaExpNext, true, `So với T${nextMonth.split('-')[1]}`)}
                {!prevMonth && !nextMonth && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem', display: 'block' }}>Không có data so sánh</span>}
              </div>
            </div>
            
            <div className="glass-panel summary-card profit" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                <span>LỢI NHUẬN (EBIT)</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--profit-color)', background: 'rgba(56, 189, 248, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                  Biên: {dashboardData.margin.toFixed(1)}%
                </span>
              </p>
              <h3 style={{ fontSize: '1.75rem', margin: '0.5rem 0', color: 'var(--profit-color)' }}>
                {formatCurrency(dashboardData.ebit)}
              </h3>
              <div style={{ marginTop: 'auto' }}>
                {prevMonth && renderDelta(dashboardData.deltaEbitPrev, false, `So với T${prevMonth.split('-')[1]}`)}
                {nextMonth && renderDelta(dashboardData.deltaEbitNext, false, `So với T${nextMonth.split('-')[1]}`)}
                {!prevMonth && !nextMonth && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem', display: 'block' }}>Không có data so sánh</span>}
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

          {/* Tầng 4: Biểu đồ xu hướng */}
          <div className="animate-fade-in glass-panel" style={{ animationDelay: '0.3s', marginTop: '1.5rem', padding: '1.5rem' }}>
             <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', fontWeight: 600 }}>Biểu đồ Xu hướng (6 Tháng gần nhất)</h3>
             {dashboardData.chartData.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>Chưa đủ dữ liệu biểu đồ</p> : (
               <div style={{ width: '100%', height: '350px' }}>
                 <ResponsiveContainer width="100%" height="100%">
                   <ComposedChart data={dashboardData.chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                     <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                     <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} axisLine={false} tickLine={false} />
                     <YAxis yAxisId="left" stroke="var(--text-secondary)" fontSize={12} axisLine={false} tickLine={false} tickFormatter={(val) => (val/1000000).toFixed(0) + 'tr'} />
                     <Tooltip 
                       formatter={customTooltipFormatter}
                       contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                       itemStyle={{ fontSize: '0.9rem' }}
                     />
                     <Legend wrapperStyle={{ paddingTop: '20px' }} />
                     <Bar yAxisId="left" dataKey="Doanh Thu" fill="var(--revenue-color)" radius={[4, 4, 0, 0]} maxBarSize={50} />
                     <Bar yAxisId="left" dataKey="Chi Phí" fill="var(--expense-color)" radius={[4, 4, 0, 0]} maxBarSize={50} />
                     <Line yAxisId="left" type="monotone" dataKey="EBIT" stroke="var(--profit-color)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                   </ComposedChart>
                 </ResponsiveContainer>
               </div>
             )}
          </div>

          {/* Tầng 5: Alerts */}
          {alerts.length > 0 && (
            <div className="animate-fade-in" style={{ animationDelay: '0.4s', marginTop: '1.5rem' }}>
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
