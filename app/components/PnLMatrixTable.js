'use client';
import React, { useState, useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';

export default function PnLMatrixTable({ records, mode, targetMonth, targetBranch, targetMonths, categoryGroups, masterBranches }) {
  // Mở mặc định các group Thu và COGS
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

  // Xác định các Cột (Columns) dựa trên chế độ
  const columns = useMemo(() => {
    if (mode === 'branch_compare') {
      // Tìm các cơ sở có dữ liệu trong tháng này, hoặc dùng masterBranches
      return masterBranches;
    } else if (mode === 'trend_analysis') {
      if (targetMonths && targetMonths.length > 0) {
        // Chỉ lấy các tháng người dùng đã tick chọn
        return [...targetMonths].sort();
      }
      
      // Fallback: Tìm các tháng duy nhất có trong dữ liệu
      const months = new Set();
      records.forEach(r => {
        if (targetBranch === 'All' || r.branch === targetBranch) {
          if (r.date) months.add(r.date);
        }
      });
      // Sắp xếp thời gian tăng dần
      return Array.from(months).sort();
    }
    return [];
  }, [mode, masterBranches, records, targetBranch]);

  // Pivot Dữ liệu
  const reportData = useMemo(() => {
    // Khởi tạo ma trận rỗng
    const data = {};
    const columnTotals = { revenue: {}, expense: {}, ebit: {} };
    
    // Khởi tạo các tổng cho từng cột
    columns.forEach(col => {
      columnTotals.revenue[col] = 0;
      columnTotals.expense[col] = 0;
      columnTotals.ebit[col] = 0;
    });
    
    // Cột Tổng cộng cuối cùng
    columnTotals.revenue['Tổng'] = 0;
    columnTotals.expense['Tổng'] = 0;
    columnTotals.ebit['Tổng'] = 0;

    // Build cấu trúc rỗng cho từng Category
    categoryGroups.forEach(g => {
      data[g.group] = { items: {}, type: g.type };
      // Khởi tạo total per group per column
      data[g.group].totals = { 'Tổng': 0 };
      columns.forEach(col => data[g.group].totals[col] = 0);

      g.items.forEach(item => {
        data[g.group].items[item] = { 'Tổng': 0 };
        columns.forEach(col => data[g.group].items[item][col] = 0);
      });
    });

    // Fill Data
    records.forEach(r => {
      let colKey = null;
      
      if (mode === 'branch_compare') {
        if (r.date !== targetMonth) return; // Chỉ lấy tháng được chọn
        colKey = r.branch;
      } else if (mode === 'trend_analysis') {
        if (targetBranch !== 'All' && r.branch !== targetBranch) return; // Chỉ lấy cơ sở được chọn
        colKey = r.date;
      }

      // Nếu cột không tồn tại trong columns (ví dụ branch bị xóa nhưng còn data cũ), ta có thể bỏ qua hoặc gom vào Khác
      if (!colKey || !columns.includes(colKey)) return;

      const group = categoryGroups.find(g => g.items.includes(r.category));
      if (group) {
        const amount = Number(r.amount);
        
        // Cộng vào Item
        data[group.group].items[r.category][colKey] += amount;
        data[group.group].items[r.category]['Tổng'] += amount;
        
        // Cộng vào Group Total
        data[group.group].totals[colKey] += amount;
        data[group.group].totals['Tổng'] += amount;
        
        // Cộng vào Grand Total
        if (group.type === 'Thu') {
          columnTotals.revenue[colKey] += amount;
          columnTotals.revenue['Tổng'] += amount;
          columnTotals.ebit[colKey] += amount;
          columnTotals.ebit['Tổng'] += amount;
        } else if (group.type === 'Chi') {
          columnTotals.expense[colKey] += amount;
          columnTotals.expense['Tổng'] += amount;
          columnTotals.ebit[colKey] -= amount;
          columnTotals.ebit['Tổng'] -= amount;
        }
      }
    });

    return { groups: data, columnTotals };
  }, [records, mode, targetMonth, targetBranch, categoryGroups, columns]);

  // Format header cột
  const formatColumnHeader = (col) => {
    if (mode === 'trend_analysis') {
      const [year, month] = col.split('-');
      return `T${month}/${year}`;
    }
    return col;
  };

  return (
    <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header Info */}
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--surface-border)', background: 'rgba(255,255,255,0.02)' }}>
        <h2 style={{ marginBottom: '0.25rem' }}>
          {mode === 'branch_compare' ? 'So Sánh Chi Nhánh' : 'Phân Tích Xu Hướng'}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {mode === 'branch_compare' 
            ? `Tháng: ${targetMonth || 'Chưa chọn'}` 
            : `Cơ sở: ${targetBranch === 'All' ? 'Toàn Hệ Thống' : targetBranch}`}
        </p>
      </div>

      {/* Ma trận */}
      <div className="table-wrapper">
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: `${300 + columns.length * 130}px` }}>
          <thead className="sticky-header">
            <tr>
              <th className="sticky-col sticky-corner" style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem' }}>CHỈ TIÊU</th>
              {columns.map(col => (
                <th key={col} style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem', textAlign: 'right', minWidth: '120px' }}>
                  {formatColumnHeader(col)}
                </th>
              ))}
              <th style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem', textAlign: 'right', minWidth: '140px' }}>
                {mode === 'branch_compare' ? 'TỔNG HỆ THỐNG' : 'TỔNG LŨY KẾ'}
              </th>
            </tr>
          </thead>
          <tbody>
            
            {categoryGroups.map((g) => {
              const groupData = reportData.groups[g.group];
              const isOpen = openGroups[g.group];
              
              const groupColor = g.type === 'Thu' ? 'var(--revenue-color)' : (g.type === 'Chi' ? 'var(--expense-color)' : 'var(--text-primary)');
              // Dùng mã màu nền solid nhạt cho group để text khi cuộn không đâm xuyên
              const bgSolid = g.type === 'Thu' ? '#f0fdf4' : (g.type === 'Chi' ? '#fff1f2' : '#f8fafc');
              const bgOpacity = g.type === 'Thu' ? 'rgba(16, 185, 129, 0.1)' : (g.type === 'Chi' ? 'rgba(244, 63, 94, 0.1)' : 'rgba(255,255,255,0.05)');
              
              return (
                <React.Fragment key={g.group}>
                  {/* Group Header */}
                  <tr 
                    onClick={() => toggleGroup(g.group)}
                    style={{ background: bgOpacity, cursor: 'pointer', borderTop: '1px solid var(--surface-border)', borderBottom: '1px solid var(--surface-border)' }}
                  >
                    <td className="sticky-col" style={{ padding: '1rem 1.5rem', fontWeight: 700, color: groupColor, display: 'flex', alignItems: 'center', gap: '0.5rem', background: bgSolid }}>
                      <svg 
                        width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" 
                        style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                      >
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                      {g.group}
                    </td>
                    {columns.map(col => (
                      <td key={col} style={{ padding: '1rem', fontWeight: 700, textAlign: 'right', color: groupColor }}>
                        {groupData.totals[col] !== 0 ? formatCurrency(groupData.totals[col]) : '-'}
                      </td>
                    ))}
                    <td style={{ padding: '1rem 1.5rem', fontWeight: 800, textAlign: 'right', color: groupColor }}>
                      {formatCurrency(groupData.totals['Tổng'])}
                    </td>
                  </tr>
                  
                  {/* Items */}
                  {isOpen && g.items.map(item => (
                    <tr key={item} style={{ borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
                      <td className="sticky-col" style={{ padding: '0.75rem 1.5rem 0.75rem 3rem', color: 'var(--text-secondary)', fontSize: '0.9rem', background: '#ffffff' }}>
                        {item}
                      </td>
                      {columns.map(col => (
                        <td key={col} style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 500, fontSize: '0.9rem', color: groupData.items[item][col] === 0 ? 'var(--text-secondary)' : 'var(--text-primary)', opacity: groupData.items[item][col] === 0 ? 0.4 : 1 }}>
                          {groupData.items[item][col] !== 0 ? formatCurrency(groupData.items[item][col]) : '-'}
                        </td>
                      ))}
                      <td style={{ padding: '0.75rem 1.5rem', textAlign: 'right', fontWeight: 600, fontSize: '0.9rem' }}>
                        {formatCurrency(groupData.items[item]['Tổng'])}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}

            {/* TỔNG DOANH THU */}
            <tr style={{ background: 'rgba(255,255,255,0.02)', borderTop: '2px solid var(--surface-border)' }}>
              <td className="sticky-col" style={{ padding: '1.25rem 1.5rem', fontWeight: 800, fontSize: '1.05rem', background: '#f8fafc' }}>TỔNG DOANH THU</td>
              {columns.map(col => (
                <td key={col} style={{ padding: '1.25rem 1rem', textAlign: 'right', fontWeight: 800, color: 'var(--revenue-color)' }}>
                  {formatCurrency(reportData.columnTotals.revenue[col])}
                </td>
              ))}
              <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right', fontWeight: 800, color: 'var(--revenue-color)' }}>
                {formatCurrency(reportData.columnTotals.revenue['Tổng'])}
              </td>
            </tr>

            {/* TỔNG CHI PHÍ */}
            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--surface-border)' }}>
              <td className="sticky-col" style={{ padding: '1.25rem 1.5rem', fontWeight: 800, fontSize: '1.05rem', background: '#f8fafc' }}>TỔNG CHI PHÍ</td>
              {columns.map(col => (
                <td key={col} style={{ padding: '1.25rem 1rem', textAlign: 'right', fontWeight: 800, color: 'var(--expense-color)' }}>
                  {formatCurrency(reportData.columnTotals.expense[col])}
                </td>
              ))}
              <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right', fontWeight: 800, color: 'var(--expense-color)' }}>
                {formatCurrency(reportData.columnTotals.expense['Tổng'])}
              </td>
            </tr>

            {/* EBIT */}
            <tr style={{ background: 'rgba(168, 85, 247, 0.15)' }}>
              <td className="sticky-col" style={{ padding: '1.5rem', fontWeight: 800, fontSize: '1.1rem', color: 'var(--profit-color)', background: '#f3e8ff' }}>
                LỢI NHUẬN (EBIT)
              </td>
              {columns.map(col => (
                <td key={col} style={{ padding: '1.5rem 1rem', textAlign: 'right', fontWeight: 800, fontSize: '1.1rem', color: 'var(--profit-color)' }}>
                  {formatCurrency(reportData.columnTotals.ebit[col])}
                </td>
              ))}
              <td style={{ padding: '1.5rem', textAlign: 'right', fontWeight: 800, fontSize: '1.1rem', color: 'var(--profit-color)' }}>
                {formatCurrency(reportData.columnTotals.ebit['Tổng'])}
              </td>
            </tr>

          </tbody>
        </table>
      </div>
    </div>
  );
}
