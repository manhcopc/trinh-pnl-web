'use client';
import React, { useState, useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';

export default function PnLReportTable({ records, filters, categoryGroups }) {
  // Mở mặc định một số group dựa trên keyword
  const defaultOpen = {};
  categoryGroups?.forEach(g => {
    if (g.type === 'Thu' || g.group.toUpperCase().includes('COGS')) {
      defaultOpen[g.group] = true;
    }
  });
  
  const [openGroups, setOpenGroups] = useState(defaultOpen);

  const toggleGroup = (group) => {
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const getPreviousMonth = (monthStr) => {
    if (!monthStr) return null;
    const [year, month] = monthStr.split('-');
    let m = parseInt(month, 10);
    let y = parseInt(year, 10);
    m -= 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
    return `${y}-${m.toString().padStart(2, '0')}`;
  };

  // Tính toán dữ liệu báo cáo
  const reportData = useMemo(() => {
    const prevMonth = filters.month ? getPreviousMonth(filters.month) : null;
    const data = {};
    let totalRevenue = 0;
    let totalExpense = 0;
    let prevTotalRevenue = 0;
    let prevTotalExpense = 0;
    
    // Khởi tạo map cho tất cả categories
    categoryGroups.forEach(g => {
      data[g.group] = { total: 0, prevTotal: 0, items: {}, prevItems: {}, type: g.type };
      g.items.forEach(item => {
        data[g.group].items[item] = 0;
        data[g.group].prevItems[item] = 0;
      });
    });

    // Cộng dồn records vào map
    records.forEach(r => {
      if (filters.branch && filters.branch !== 'All' && r.branch !== filters.branch) return;

      const isCurrentMonth = !filters.month || r.date === filters.month;
      const isPrevMonth = prevMonth && r.date === prevMonth;
      
      if (!isCurrentMonth && !isPrevMonth) return;

      // Tìm category group
      const group = categoryGroups.find(g => g.items.includes(r.category));
      if (group) {
        if (isCurrentMonth) {
          data[group.group].items[r.category] += Number(r.amount);
          data[group.group].total += Number(r.amount);
          
          if (group.type === 'Thu') totalRevenue += Number(r.amount);
          else if (group.type === 'Chi') totalExpense += Number(r.amount);
        } else if (isPrevMonth) {
          data[group.group].prevItems[r.category] += Number(r.amount);
          data[group.group].prevTotal += Number(r.amount);
          
          if (group.type === 'Thu') prevTotalRevenue += Number(r.amount);
          else if (group.type === 'Chi') prevTotalExpense += Number(r.amount);
        }
      }
    });

    return {
      groups: data,
      totalRevenue,
      totalExpense,
      ebit: totalRevenue - totalExpense,
      prevTotalRevenue,
      prevTotalExpense,
      prevEbit: prevTotalRevenue - prevTotalExpense
    };
  }, [records, filters, categoryGroups]);

  // Hàm tính phần trăm
  const calculatePercent = (amount) => {
    if (reportData.totalRevenue === 0) return '0.0%';
    const percent = (amount / reportData.totalRevenue) * 100;
    return `${percent.toFixed(1)}%`;
  };

  const calculateDelta = (current, prev) => {
    if (prev === 0 && current === 0) return '-';
    if (prev === 0) return '+100%';
    const delta = ((current - prev) / prev) * 100;
    const sign = delta > 0 ? '+' : '';
    return `${sign}${delta.toFixed(1)}%`;
  };

  const getDeltaColor = (current, prev, isExpense = false) => {
    if (prev === 0 && current === 0) return 'var(--text-secondary)';
    const delta = current - prev;
    if (delta === 0) return 'var(--text-secondary)';
    
    if (isExpense) {
      return delta > 0 ? 'var(--expense-color)' : 'var(--revenue-color)';
    } else {
      return delta > 0 ? 'var(--revenue-color)' : 'var(--expense-color)';
    }
  };

  return (
    <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
        <div>
          <h2 style={{ marginBottom: '0.25rem' }}>Báo Cáo P&L</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {filters.branch === 'All' ? 'Toàn Hệ Thống' : `Cơ sở: ${filters.branch}`} 
            {filters.month ? ` • Tháng: ${filters.month}` : ' • Tất cả các tháng'}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Lợi Nhuận (EBIT)</p>
          <div style={{ color: 'var(--profit-color)', fontWeight: 'bold', fontSize: '1.5rem' }}>
            {formatCurrency(reportData.ebit)}
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="table-wrapper">
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead className="sticky-header">
            <tr>
              <th className="sticky-col sticky-corner" style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem' }}>CHỈ TIÊU</th>
              <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem', textAlign: 'right', width: '200px' }}>SỐ TIỀN (VNĐ)</th>
              <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem', textAlign: 'right', width: '100px' }}>% DT</th>
              <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem', textAlign: 'right', width: '150px' }}>SO VỚI THÁNG TRƯỚC</th>
            </tr>
          </thead>
          <tbody>
            
            {/* Vòng lặp hiển thị từng Group theo thứ tự chuẩn */}
            {categoryGroups.map((g) => {
              const groupData = reportData.groups[g.group];
              const isOpen = openGroups[g.group];
              
              // Màu nền của Group Header
              const groupColor = g.type === 'Thu' ? 'var(--revenue-color)' : (g.type === 'Chi' ? 'var(--expense-color)' : 'var(--text-primary)');
              const bgOpacity = g.type === 'Thu' ? 'rgba(16, 185, 129, 0.1)' : (g.type === 'Chi' ? 'rgba(244, 63, 94, 0.1)' : 'rgba(255,255,255,0.05)');
              
              return (
                <React.Fragment key={g.group}>
                  {/* Dòng Header của Group */}
                  <tr 
                    onClick={() => toggleGroup(g.group)}
                    style={{ background: bgOpacity, cursor: 'pointer', transition: 'background 0.2s', borderTop: '1px solid var(--surface-border)', borderBottom: '1px solid var(--surface-border)' }}
                  >
                    <td className="sticky-col" style={{ padding: '1rem 1.5rem', fontWeight: 600, color: groupColor, display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc' }}>
                      <svg 
                        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" 
                        style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                      >
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                      {g.group}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: 700, textAlign: 'right', color: groupColor }}>
                      {formatCurrency(groupData.total)}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: 700, textAlign: 'right', color: groupColor, opacity: 0.8 }}>
                      {g.type !== 'Thu' ? calculatePercent(groupData.total) : (groupData.total > 0 ? '100%' : '0%')}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: 700, textAlign: 'right', color: getDeltaColor(groupData.total, groupData.prevTotal, g.type === 'Chi') }}>
                      {calculateDelta(groupData.total, groupData.prevTotal)}
                    </td>
                  </tr>
                  
                  {/* Dòng chi tiết (Items) */}
                  {isOpen && g.items.map(item => (
                    <tr key={item} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td className="sticky-col" style={{ padding: '0.75rem 1.5rem 0.75rem 3rem', color: 'var(--text-secondary)', fontSize: '0.9rem', background: '#ffffff' }}>
                        {item}
                      </td>
                      <td style={{ padding: '0.75rem 1.5rem', textAlign: 'right', fontWeight: 500 }}>
                        {formatCurrency(groupData.items[item])}
                      </td>
                      <td style={{ padding: '0.75rem 1.5rem', textAlign: 'right', fontWeight: 500, color: 'var(--text-secondary)' }}>
                        {calculatePercent(groupData.items[item])}
                      </td>
                      <td style={{ padding: '0.75rem 1.5rem', textAlign: 'right', fontWeight: 600, fontSize: '0.85rem', color: getDeltaColor(groupData.items[item], groupData.prevItems[item], g.type === 'Chi') }}>
                        {calculateDelta(groupData.items[item], groupData.prevItems[item])}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}

            {/* Dòng Tóm tắt cuối bảng */}
            <tr style={{ background: 'rgba(255,255,255,0.02)', borderTop: '2px solid var(--surface-border)' }}>
              <td className="sticky-col" style={{ padding: '1.25rem 1.5rem', fontWeight: 700, fontSize: '1.1rem', background: '#f8fafc' }}>TỔNG DOANH THU</td>
              <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right', fontWeight: 700, fontSize: '1.1rem', color: 'var(--revenue-color)' }}>{formatCurrency(reportData.totalRevenue)}</td>
              <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right', fontWeight: 700, fontSize: '1.1rem', color: 'var(--revenue-color)' }}>{reportData.totalRevenue > 0 ? '100%' : '0%'}</td>
              <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right', fontWeight: 700, fontSize: '1.1rem', color: getDeltaColor(reportData.totalRevenue, reportData.prevTotalRevenue, false) }}>{calculateDelta(reportData.totalRevenue, reportData.prevTotalRevenue)}</td>
            </tr>
            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--surface-border)' }}>
              <td className="sticky-col" style={{ padding: '1.25rem 1.5rem', fontWeight: 700, fontSize: '1.1rem', background: '#f8fafc' }}>TỔNG CHI PHÍ</td>
              <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right', fontWeight: 700, fontSize: '1.1rem', color: 'var(--expense-color)' }}>{formatCurrency(reportData.totalExpense)}</td>
              <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right', fontWeight: 700, fontSize: '1.1rem', color: 'var(--expense-color)' }}>{calculatePercent(reportData.totalExpense)}</td>
              <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right', fontWeight: 700, fontSize: '1.1rem', color: getDeltaColor(reportData.totalExpense, reportData.prevTotalExpense, true) }}>{calculateDelta(reportData.totalExpense, reportData.prevTotalExpense)}</td>
            </tr>
            <tr style={{ background: 'rgba(168, 85, 247, 0.15)' }}>
              <td className="sticky-col" style={{ padding: '1.5rem', fontWeight: 800, fontSize: '1.2rem', color: 'var(--profit-color)', background: '#f3e8ff' }}>LỢI NHUẬN TRƯỚC THUẾ (EBIT)</td>
              <td style={{ padding: '1.5rem', textAlign: 'right', fontWeight: 800, fontSize: '1.2rem', color: 'var(--profit-color)' }}>{formatCurrency(reportData.ebit)}</td>
              <td style={{ padding: '1.5rem', textAlign: 'right', fontWeight: 800, fontSize: '1.2rem', color: 'var(--profit-color)' }}>{calculatePercent(reportData.ebit)}</td>
              <td style={{ padding: '1.5rem', textAlign: 'right', fontWeight: 800, fontSize: '1.2rem', color: getDeltaColor(reportData.ebit, reportData.prevEbit, false) }}>{calculateDelta(reportData.ebit, reportData.prevEbit)}</td>
            </tr>

          </tbody>
        </table>
      </div>
    </div>
  );
}
