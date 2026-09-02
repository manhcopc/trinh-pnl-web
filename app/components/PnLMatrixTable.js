'use client';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { formatCurrency } from '@/lib/utils';

export default function PnLMatrixTable({ records, mode, targetMonth, targetBranch, targetMonths, targetBranches, compareTargets, categoryGroups, masterBranches }) {
  // Mở mặc định các group Thu và COGS
  const defaultOpen = {};
  categoryGroups?.forEach(g => {
    if (g.type === 'Thu' || g.group.toUpperCase().includes('COGS')) {
      defaultOpen[g.group] = true;
    }
  });
  const [openGroups, setOpenGroups] = useState(defaultOpen);
  const [hoveredCol, setHoveredCol] = useState(null);

  const toggleGroup = (group) => {
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const [pinnedCol, setPinnedCol] = useState(null);

  // Xác định các Cột (Columns) dựa trên chế độ
  const rawColumns = useMemo(() => {
    if (mode === 'branch_compare') {
      return masterBranches;
    } else if (mode === 'trend_analysis') {
      const branchesToUse = targetBranches && targetBranches.length > 0 ? targetBranches : masterBranches;
      const monthsToUse = targetMonths && targetMonths.length > 0 ? [...targetMonths].sort() : [];
      
      const cols = [];
      monthsToUse.forEach(m => {
        branchesToUse.forEach(b => {
          cols.push(`${m}|${b}`);
        });
      });
      return cols;
    } else if (mode === 'custom_compare') {
      const cols = ['base'];
      if (compareTargets) {
        compareTargets.forEach((_, idx) => {
          cols.push(`comp_${idx}`);
        });
      }
      return cols;
    }
    return [];
  }, [mode, masterBranches, targetMonths, targetBranches, compareTargets]);

  const columns = useMemo(() => {
    if (!pinnedCol || !rawColumns.includes(pinnedCol)) return rawColumns;
    return [pinnedCol, ...rawColumns.filter(c => c !== pinnedCol)];
  }, [rawColumns, pinnedCol]);

    // Pivot Dữ liệu
  const reportData = useMemo(() => {
    // Khởi tạo ma trận rỗng
    const data = {};
    const columnTotals = { revenue: {}, expense: {}, ebit: {}, inventory: {}, boCost: {} };
    
    // Khởi tạo các tổng cho từng cột
    columns.forEach(col => {
      columnTotals.revenue[col] = 0;
      columnTotals.expense[col] = 0;
      columnTotals.ebit[col] = 0;
      columnTotals.inventory[col] = 0;
      columnTotals.boCost[col] = 0;
    });
    
    // Cột Tổng cộng cuối cùng (chỉ áp dụng cho branch_compare và trend_analysis)
    if (mode !== 'custom_compare') {
      columnTotals.revenue['Tổng'] = 0;
      columnTotals.expense['Tổng'] = 0;
      columnTotals.ebit['Tổng'] = 0;
      columnTotals.inventory['Tổng'] = 0;
      columnTotals.boCost['Tổng'] = 0;
    }

    // Build cấu trúc rỗng cho từng Category
    categoryGroups.forEach(g => {
      data[g.group] = { items: {}, type: g.type };
      // Khởi tạo total per group per column
      data[g.group].totals = {};
      if (mode !== 'custom_compare') data[g.group].totals['Tổng'] = 0;
      columns.forEach(col => data[g.group].totals[col] = 0);

      g.items.forEach(item => {
        data[g.group].items[item] = {};
        if (mode !== 'custom_compare') data[g.group].items[item]['Tổng'] = 0;
        columns.forEach(col => data[g.group].items[item][col] = 0);
      });
    });

    // Helper add amount
    const addAmountToCol = (groupObj, r, colKey, amount) => {
      // Cộng vào Item
      data[groupObj.group].items[r.category][colKey] += amount;
      if (mode !== 'custom_compare') data[groupObj.group].items[r.category]['Tổng'] += amount;
      
      // Cộng vào Group Total
      data[groupObj.group].totals[colKey] += amount;
      if (mode !== 'custom_compare') data[groupObj.group].totals['Tổng'] += amount;
      
      const isInventory = r.category.toLowerCase().includes('tồn kho');
      const isBoCost = r.category.toLowerCase().includes('chi phí bo');

      if (isInventory) {
        columnTotals.inventory[colKey] += amount;
        if (mode !== 'custom_compare') columnTotals.inventory['Tổng'] += amount;
      } else if (isBoCost) {
        columnTotals.boCost[colKey] += amount;
        if (mode !== 'custom_compare') columnTotals.boCost['Tổng'] += amount;
      } else {
        // Cộng vào Grand Total
        if (groupObj.type === 'Thu') {
          columnTotals.revenue[colKey] += amount;
          if (mode !== 'custom_compare') columnTotals.revenue['Tổng'] += amount;
          columnTotals.ebit[colKey] += amount;
          if (mode !== 'custom_compare') columnTotals.ebit['Tổng'] += amount;
        } else if (groupObj.type === 'Chi') {
          columnTotals.expense[colKey] += amount;
          if (mode !== 'custom_compare') columnTotals.expense['Tổng'] += amount;
          columnTotals.ebit[colKey] -= amount;
          if (mode !== 'custom_compare') columnTotals.ebit['Tổng'] -= amount;
        }
      }
    };

    // Fill Data
    records.forEach(r => {
      const groupObj = categoryGroups.find(g => g.items.includes(r.category));
      if (!groupObj) return;
      const amount = Number(r.amount);

      if (mode === 'branch_compare') {
        if (r.date !== targetMonth) return;
        const colKey = r.branch;
        if (columns.includes(colKey)) {
          addAmountToCol(groupObj, r, colKey, amount);
        }
      } else if (mode === 'trend_analysis') {
        if (targetBranches && targetBranches.length > 0 && !targetBranches.includes(r.branch)) return;
        if (targetMonths && targetMonths.length > 0 && !targetMonths.includes(r.date)) return;
        const colKey = `${r.date}|${r.branch}`;
        if (columns.includes(colKey)) {
          addAmountToCol(groupObj, r, colKey, amount);
        }
      } else if (mode === 'custom_compare') {
        // Check Base
        if (r.date === targetMonth && (targetBranch === 'All' || r.branch === targetBranch)) {
          addAmountToCol(groupObj, r, 'base', amount);
        }
        // Check Compare Targets
        if (compareTargets) {
          compareTargets.forEach((t, idx) => {
            if (r.date === t.month && (t.branch === 'All' || r.branch === t.branch)) {
              addAmountToCol(groupObj, r, `comp_${idx}`, amount);
            }
          });
        }
      }
    });

    return { groups: data, columnTotals };
  }, [records, mode, targetMonth, targetBranch, categoryGroups, columns, targetBranches, targetMonths, compareTargets]);

  // Format header cột
  const formatColumnHeader = (col) => {
    if (mode === 'trend_analysis') {
      const [datePart, branchPart] = col.split('|');
      if (!datePart) return col;
      const [year, month] = datePart.split('-');
      return `T${month}/${year} - ${branchPart}`;
    }
    if (mode === 'custom_compare') {
      if (col === 'base') {
        const m = targetMonth?.split('-')[1] || '';
        return `🎯 (GỐC) T${m} - ${targetBranch}`;
      }
      if (col.startsWith('comp_')) {
        const idx = parseInt(col.replace('comp_', ''), 10);
        const t = compareTargets[idx];
        if (t) {
          const m = t.month?.split('-')[1] || '';
          return `T${m} - ${t.branch}`;
        }
      }
    }
    return col;
  };

  // Tính % so với Doanh Thu
  const calcPercent = (amount, colKey) => {
    const revenue = reportData.columnTotals.revenue[colKey];
    if (!revenue || revenue === 0) return '0%';
    const pct = (amount / revenue) * 100;
    return pct.toFixed(1).replace('.0', '') + '%';
  };

  // Tính Delta
  const renderDelta = (amount, baseAmount, isExpense) => {
    if (baseAmount === 0 && amount === 0) return '-';
    let pct = 0;
    if (baseAmount === 0) {
      pct = 100;
    } else {
      pct = ((amount - baseAmount) / Math.abs(baseAmount)) * 100;
    }
    
    if (pct === 0) return <span style={{ color: 'var(--text-secondary)' }}>-</span>;

    const isGood = isExpense ? pct < 0 : pct > 0;
    const color = isGood ? 'var(--revenue-color)' : 'var(--expense-color)';
    const sign = pct > 0 ? '↑' : '↓';
    
    return (
      <span style={{ color, fontWeight: 700 }}>
        {sign}{Math.abs(pct).toFixed(1)}%
      </span>
    );
  };

  const getColSpan = (col) => {
    if (mode === 'custom_compare' && col !== 'base') return 3; // SỐ TIỀN | % DT | Δ
    return 2; // SỐ TIỀN | % DT
  };

  const headerRef = useRef(null);
  const tableWrapperRef = useRef(null);

  useEffect(() => {
    if (!headerRef.current || !tableWrapperRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.target === headerRef.current) {
          const height = entry.target.getBoundingClientRect().height;
          tableWrapperRef.current.style.setProperty('--first-row-height', `${height}px`);
        }
      }
    });
    observer.observe(headerRef.current);
    return () => observer.disconnect();
  }, [columns]);

  if (!records || records.length === 0) return null;

  const getHoverStyle = (col) => {
    const isPinned = pinnedCol === col;
    const isHovered = hoveredCol === col;
    let bgColor = 'transparent';
    if (isPinned) bgColor = 'rgba(59, 130, 246, 0.05)';
    
    return {
      backgroundColor: bgColor,
      boxShadow: isHovered ? 'inset 0 0 0 9999px rgba(0,0,0,0.03)' : 'none',
      transition: 'box-shadow 0.2s ease, background-color 0.2s ease',
    };
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header Info */}
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--surface-border)', background: 'rgba(255,255,255,0.02)' }}>
        <h2 style={{ marginBottom: '0.25rem' }}>
          {mode === 'branch_compare' && 'So Sánh Chi Nhánh'}
          {mode === 'trend_analysis' && 'Phân Tích Xu Hướng'}
          {mode === 'custom_compare' && 'So Sánh Tùy Chỉnh Đa Chiều'}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {mode === 'branch_compare' && `Tháng: ${targetMonth || 'Chưa chọn'}`}
          {mode === 'trend_analysis' && `Cơ sở: ${targetBranches?.length > 0 ? targetBranches.join(', ') : 'Toàn Hệ Thống'}`}
          {mode === 'custom_compare' && 'Hiển thị % tăng giảm so sánh với Mốc Gốc'}
        </p>
      </div>

      {/* Ma trận */}
      <div className="table-wrapper" ref={tableWrapperRef}>
        <table className={`${pinnedCol ? "has-pinned-col" : ""} ${mode === 'custom_compare' ? "is-custom-compare" : ""}`.trim()} style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: `${300 + columns.length * (mode === 'custom_compare' ? 220 : 180)}px` }}>
          <thead className="sticky-header">
            <tr ref={headerRef}>
              <th rowSpan="2" className="sticky-col sticky-corner" style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.85rem' }}>CHỈ TIÊU</th>
              {columns.map(col => (
                <th colSpan={getColSpan(col)} key={col} onMouseEnter={() => setHoveredCol(col)} onMouseLeave={() => setHoveredCol(null)} style={{ ...getHoverStyle(col), position: 'relative', height: '48px', padding: '0.75rem 2rem 0.75rem 1rem', color: col === 'base' || pinnedCol === col ? 'var(--primary-color)' : 'var(--text-secondary)', fontWeight: col === 'base' || pinnedCol === col ? 700 : 600, fontSize: '0.85rem', textAlign: 'center', borderBottom: '1px solid var(--surface-border)', borderLeft: col !== 'base' ? '1px dashed rgba(255,255,255,0.1)' : 'none' }}>
                  {formatColumnHeader(col)}
                  <button 
                    onClick={() => setPinnedCol(pinnedCol === col ? null : col)}
                    title={pinnedCol === col ? "Bỏ ghim cột này" : "Ghim cột này lên đầu"}
                    style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', opacity: pinnedCol === col ? 1 : 0.3, transition: 'opacity 0.2s', padding: '4px' }}
                  >
                    📌
                  </button>
                </th>
              ))}
              {mode !== 'custom_compare' && (
                <th colSpan="2" style={{ height: '48px', padding: '0.75rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem', textAlign: 'center', borderBottom: '1px solid var(--surface-border)', borderLeft: '1px dashed rgba(255,255,255,0.1)' }}>
                  {mode === 'branch_compare' ? 'TỔNG HỆ THỐNG' : 'TỔNG LŨY KẾ'}
                </th>
              )}
            </tr>
            <tr className="sub-header">
              {columns.map(col => (
                <React.Fragment key={`${col}-sub`}>
                  <th onMouseEnter={() => setHoveredCol(col)} onMouseLeave={() => setHoveredCol(null)} style={{ ...getHoverStyle(col), padding: '0.5rem 1rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.75rem', textAlign: 'right', width: '110px', minWidth: '110px', maxWidth: '110px', borderLeft: col !== 'base' ? '1px dashed rgba(255,255,255,0.1)' : 'none' }}>SỐ TIỀN</th>
                  <th onMouseEnter={() => setHoveredCol(col)} onMouseLeave={() => setHoveredCol(null)} style={{ ...getHoverStyle(col), padding: '0.5rem 0.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.75rem', textAlign: 'right', width: '70px', minWidth: '70px', maxWidth: '70px' }}>% DT</th>
                  {mode === 'custom_compare' && col !== 'base' && (
                    <th onMouseEnter={() => setHoveredCol(col)} onMouseLeave={() => setHoveredCol(null)} style={{ ...getHoverStyle(col), padding: '0.5rem 0.5rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textAlign: 'right', width: '80px', minWidth: '80px', maxWidth: '80px', background: 'rgba(255,255,255,0.02)' }}>Δ (%)</th>
                  )}
                </React.Fragment>
              ))}
              {mode !== 'custom_compare' && (
                <>
                  <th style={{ padding: '0.5rem 1rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.75rem', textAlign: 'right', minWidth: '110px', borderLeft: '1px dashed rgba(255,255,255,0.1)' }}>SỐ TIỀN</th>
                  <th style={{ padding: '0.5rem 1.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.75rem', textAlign: 'right', width: '80px', minWidth: '80px', maxWidth: '80px' }}>% DT</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            
            {categoryGroups.map((g) => {
              const groupData = reportData.groups[g.group];
              const isOpen = openGroups[g.group];
              const isExpenseGroup = g.type === 'Chi';
              
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
                      <React.Fragment key={col}>
                        <td onMouseEnter={() => setHoveredCol(col)} onMouseLeave={() => setHoveredCol(null)} style={{ ...getHoverStyle(col), padding: '1rem', fontWeight: 700, textAlign: 'right', color: groupColor, borderLeft: col !== 'base' ? '1px dashed rgba(0,0,0,0.05)' : 'none' }}>
                          {groupData.totals[col] !== 0 ? formatCurrency(groupData.totals[col]) : '-'}
                        </td>
                        <td onMouseEnter={() => setHoveredCol(col)} onMouseLeave={() => setHoveredCol(null)} style={{ ...getHoverStyle(col), padding: '1rem 0.5rem', fontWeight: 600, fontSize: '0.8rem', textAlign: 'right', color: groupColor, opacity: 0.7 }}>
                          {groupData.totals[col] !== 0 ? calcPercent(groupData.totals[col], col) : '-'}
                        </td>
                        {mode === 'custom_compare' && col !== 'base' && (
                          <td onMouseEnter={() => setHoveredCol(col)} onMouseLeave={() => setHoveredCol(null)} style={{ ...getHoverStyle(col), padding: '1rem 0.5rem', textAlign: 'right', background: 'rgba(0,0,0,0.015)' }}>
                            {renderDelta(groupData.totals[col], groupData.totals['base'], isExpenseGroup)}
                          </td>
                        )}
                      </React.Fragment>
                    ))}
                    
                    {mode !== 'custom_compare' && (
                      <>
                        <td style={{ padding: '1rem 1.5rem', fontWeight: 800, textAlign: 'right', color: groupColor, borderLeft: '1px dashed rgba(0,0,0,0.05)' }}>
                          {formatCurrency(groupData.totals['Tổng'])}
                        </td>
                        <td style={{ padding: '1rem 1.5rem 1rem 0.5rem', fontWeight: 700, fontSize: '0.8rem', textAlign: 'right', color: groupColor, opacity: 0.7 }}>
                          {calcPercent(groupData.totals['Tổng'], 'Tổng')}
                        </td>
                      </>
                    )}
                  </tr>
                  
                  {/* Items */}
                  {isOpen && g.items.map(item => (
                    <tr key={item} style={{ '--row-bg': '#ffffff', borderBottom: '1px solid rgba(0,0,0,0.03)', transition: 'background 0.2s' }} className="hover-row">
                      <td className="sticky-col" style={{ padding: '0.75rem 1.5rem 0.75rem 3rem', color: 'var(--text-secondary)', fontSize: '0.9rem', background: '#ffffff' }}>
                        {item}
                      </td>
                      {columns.map(col => (
                        <React.Fragment key={col}>
                          <td onMouseEnter={() => setHoveredCol(col)} onMouseLeave={() => setHoveredCol(null)} style={{ ...getHoverStyle(col), padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 500, fontSize: '0.9rem', color: groupData.items[item][col] === 0 ? 'var(--text-secondary)' : 'var(--text-primary)', opacity: groupData.items[item][col] === 0 ? 0.4 : 1, borderLeft: col !== 'base' ? '1px dashed rgba(0,0,0,0.05)' : 'none' }}>
                            {groupData.items[item][col] !== 0 ? formatCurrency(groupData.items[item][col]) : '-'}
                          </td>
                          <td onMouseEnter={() => setHoveredCol(col)} onMouseLeave={() => setHoveredCol(null)} style={{ ...getHoverStyle(col), padding: '0.75rem 0.5rem', textAlign: 'right', fontWeight: 500, fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: groupData.items[item][col] === 0 ? 0.2 : 0.8 }}>
                            {groupData.items[item][col] !== 0 ? calcPercent(groupData.items[item][col], col) : '-'}
                          </td>
                          {mode === 'custom_compare' && col !== 'base' && (
                            <td onMouseEnter={() => setHoveredCol(col)} onMouseLeave={() => setHoveredCol(null)} style={{ ...getHoverStyle(col), padding: '0.75rem 0.5rem', textAlign: 'right', fontSize: '0.8rem', background: 'rgba(0,0,0,0.015)' }}>
                              {renderDelta(groupData.items[item][col], groupData.items[item]['base'], isExpenseGroup)}
                            </td>
                          )}
                        </React.Fragment>
                      ))}
                      {mode !== 'custom_compare' && (
                        <>
                          <td style={{ padding: '0.75rem 1.5rem', textAlign: 'right', fontWeight: 600, fontSize: '0.9rem', borderLeft: '1px dashed rgba(0,0,0,0.05)' }}>
                            {formatCurrency(groupData.items[item]['Tổng'])}
                          </td>
                          <td style={{ padding: '0.75rem 1.5rem 0.75rem 0.5rem', textAlign: 'right', fontWeight: 500, fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.8 }}>
                            {calcPercent(groupData.items[item]['Tổng'], 'Tổng')}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}

            {/* TỔNG DOANH THU */}
            <tr style={{ '--row-bg': '#f8fafc', background: 'rgba(255,255,255,0.02)', borderTop: '2px solid var(--surface-border)' }}>
              <td className="sticky-col" style={{ padding: '1.25rem 1.5rem', fontWeight: 800, fontSize: '1.05rem', background: '#f8fafc' }}>TỔNG DOANH THU</td>
              {columns.map(col => (
                <React.Fragment key={col}>
                  <td onMouseEnter={() => setHoveredCol(col)} onMouseLeave={() => setHoveredCol(null)} style={{ ...getHoverStyle(col), padding: '1.25rem 1rem', textAlign: 'right', fontWeight: 800, color: 'var(--revenue-color)', borderLeft: col !== 'base' ? '1px dashed rgba(0,0,0,0.05)' : 'none' }}>
                    {formatCurrency(reportData.columnTotals.revenue[col])}
                  </td>
                  <td onMouseEnter={() => setHoveredCol(col)} onMouseLeave={() => setHoveredCol(null)} style={{ ...getHoverStyle(col), padding: '1.25rem 0.5rem', textAlign: 'right', fontWeight: 700, fontSize: '0.85rem', color: 'var(--revenue-color)' }}>
                    {reportData.columnTotals.revenue[col] > 0 ? '100%' : '0%'}
                  </td>
                  {mode === 'custom_compare' && col !== 'base' && (
                    <td onMouseEnter={() => setHoveredCol(col)} onMouseLeave={() => setHoveredCol(null)} style={{ ...getHoverStyle(col), padding: '1.25rem 0.5rem', textAlign: 'right', background: 'rgba(0,0,0,0.015)' }}>
                      {renderDelta(reportData.columnTotals.revenue[col], reportData.columnTotals.revenue['base'], false)}
                    </td>
                  )}
                </React.Fragment>
              ))}
              {mode !== 'custom_compare' && (
                <>
                  <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right', fontWeight: 800, color: 'var(--revenue-color)', borderLeft: '1px dashed rgba(0,0,0,0.05)' }}>
                    {formatCurrency(reportData.columnTotals.revenue['Tổng'])}
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem 1.25rem 0.5rem', textAlign: 'right', fontWeight: 700, fontSize: '0.85rem', color: 'var(--revenue-color)' }}>
                    {reportData.columnTotals.revenue['Tổng'] > 0 ? '100%' : '0%'}
                  </td>
                </>
              )}
            </tr>

            {/* TỔNG CHI PHÍ */}
            <tr style={{ '--row-bg': '#f8fafc', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--surface-border)' }}>
              <td className="sticky-col" style={{ padding: '1.25rem 1.5rem', fontWeight: 800, fontSize: '1.05rem', background: '#f8fafc' }}>TỔNG CHI PHÍ</td>
              {columns.map(col => (
                <React.Fragment key={col}>
                  <td onMouseEnter={() => setHoveredCol(col)} onMouseLeave={() => setHoveredCol(null)} style={{ ...getHoverStyle(col), padding: '1.25rem 1rem', textAlign: 'right', fontWeight: 800, color: 'var(--expense-color)', borderLeft: col !== 'base' ? '1px dashed rgba(0,0,0,0.05)' : 'none' }}>
                    {formatCurrency(reportData.columnTotals.expense[col])}
                  </td>
                  <td onMouseEnter={() => setHoveredCol(col)} onMouseLeave={() => setHoveredCol(null)} style={{ ...getHoverStyle(col), padding: '1.25rem 0.5rem', textAlign: 'right', fontWeight: 700, fontSize: '0.85rem', color: 'var(--expense-color)', opacity: 0.8 }}>
                    {calcPercent(reportData.columnTotals.expense[col], col)}
                  </td>
                  {mode === 'custom_compare' && col !== 'base' && (
                    <td onMouseEnter={() => setHoveredCol(col)} onMouseLeave={() => setHoveredCol(null)} style={{ ...getHoverStyle(col), padding: '1.25rem 0.5rem', textAlign: 'right', background: 'rgba(0,0,0,0.015)' }}>
                      {renderDelta(reportData.columnTotals.expense[col], reportData.columnTotals.expense['base'], true)}
                    </td>
                  )}
                </React.Fragment>
              ))}
              {mode !== 'custom_compare' && (
                <>
                  <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right', fontWeight: 800, color: 'var(--expense-color)', borderLeft: '1px dashed rgba(0,0,0,0.05)' }}>
                    {formatCurrency(reportData.columnTotals.expense['Tổng'])}
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem 1.25rem 0.5rem', textAlign: 'right', fontWeight: 700, fontSize: '0.85rem', color: 'var(--expense-color)', opacity: 0.8 }}>
                    {calcPercent(reportData.columnTotals.expense['Tổng'], 'Tổng')}
                  </td>
                </>
              )}
            </tr>

            {/* EBIT */}
            <tr style={{ '--row-bg': '#f3e8ff', background: 'rgba(168, 85, 247, 0.15)' }}>
              <td className="sticky-col" style={{ padding: '1.5rem', fontWeight: 800, fontSize: '1.1rem', color: 'var(--profit-color)', background: '#f3e8ff' }}>
                LỢI NHUẬN (EBIT)
              </td>
              {columns.map(col => (
                <React.Fragment key={col}>
                  <td onMouseEnter={() => setHoveredCol(col)} onMouseLeave={() => setHoveredCol(null)} style={{ ...getHoverStyle(col), padding: '1.5rem 1rem', textAlign: 'right', fontWeight: 800, fontSize: '1.1rem', color: 'var(--profit-color)', borderLeft: col !== 'base' ? '1px dashed rgba(168, 85, 247, 0.3)' : 'none' }}>
                    {formatCurrency(reportData.columnTotals.ebit[col])}
                  </td>
                  <td onMouseEnter={() => setHoveredCol(col)} onMouseLeave={() => setHoveredCol(null)} style={{ ...getHoverStyle(col), padding: '1.5rem 0.5rem', textAlign: 'right', fontWeight: 700, fontSize: '0.9rem', color: 'var(--profit-color)', opacity: 0.8 }}>
                    {calcPercent(reportData.columnTotals.ebit[col], col)}
                  </td>
                  {mode === 'custom_compare' && col !== 'base' && (
                    <td onMouseEnter={() => setHoveredCol(col)} onMouseLeave={() => setHoveredCol(null)} style={{ ...getHoverStyle(col), padding: '1.5rem 0.5rem', textAlign: 'right', background: 'rgba(168, 85, 247, 0.05)' }}>
                      {renderDelta(reportData.columnTotals.ebit[col], reportData.columnTotals.ebit['base'], false)}
                    </td>
                  )}
                </React.Fragment>
              ))}
              {mode !== 'custom_compare' && (
                <>
                  <td style={{ padding: '1.5rem 1.5rem', textAlign: 'right', fontWeight: 800, fontSize: '1.1rem', color: 'var(--profit-color)', borderLeft: '1px dashed rgba(168, 85, 247, 0.3)' }}>
                    {formatCurrency(reportData.columnTotals.ebit['Tổng'])}
                  </td>
                  <td style={{ padding: '1.5rem 1.5rem 1.5rem 0.5rem', textAlign: 'right', fontWeight: 700, fontSize: '0.9rem', color: 'var(--profit-color)', opacity: 0.8 }}>
                    {calcPercent(reportData.columnTotals.ebit['Tổng'], 'Tổng')}
                  </td>
                </>
              )}
            </tr>

            {/* Tồn kho & Lợi nhuận cộng tồn kho */}
            <tr style={{ '--row-bg': '#f8fafc', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid var(--surface-border)' }}>
              <td className="sticky-col" style={{ padding: '1.25rem 1.5rem', fontWeight: 700, fontSize: '1.05rem', background: '#f8fafc' }}>+ TỔNG TỒN KHO CUỐI KỲ</td>
              {columns.map(col => (
                <React.Fragment key={col}>
                  <td onMouseEnter={() => setHoveredCol(col)} onMouseLeave={() => setHoveredCol(null)} style={{ ...getHoverStyle(col), padding: '1.25rem 1rem', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)', borderLeft: col !== 'base' ? '1px dashed rgba(0,0,0,0.05)' : 'none' }}>
                    {formatCurrency(reportData.columnTotals.inventory[col])}
                  </td>
                  <td onMouseEnter={() => setHoveredCol(col)} onMouseLeave={() => setHoveredCol(null)} style={{ ...getHoverStyle(col), padding: '1.25rem 0.5rem', textAlign: 'right', fontWeight: 500, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>-</td>
                  {mode === 'custom_compare' && col !== 'base' && (
                    <td onMouseEnter={() => setHoveredCol(col)} onMouseLeave={() => setHoveredCol(null)} style={{ ...getHoverStyle(col), padding: '1.25rem 0.5rem', textAlign: 'right', background: 'rgba(0,0,0,0.015)' }}>
                      {renderDelta(reportData.columnTotals.inventory[col], reportData.columnTotals.inventory['base'], false)}
                    </td>
                  )}
                </React.Fragment>
              ))}
              {mode !== 'custom_compare' && (
                <>
                  <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)', borderLeft: '1px dashed rgba(0,0,0,0.05)' }}>
                    {formatCurrency(reportData.columnTotals.inventory['Tổng'])}
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem 1.25rem 0.5rem', textAlign: 'right', fontWeight: 500, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>-</td>
                </>
              )}
            </tr>

            <tr style={{ '--row-bg': '#eff6ff', background: 'rgba(59, 130, 246, 0.15)' }}>
              <td className="sticky-col" style={{ padding: '1.5rem', fontWeight: 800, fontSize: '1.1rem', color: '#1d4ed8', background: '#eff6ff' }}>LỢI NHUẬN NẾU CỘNG TỒN KHO</td>
              {columns.map(col => {
                const val = reportData.columnTotals.ebit[col] + reportData.columnTotals.inventory[col];
                const baseVal = reportData.columnTotals.ebit['base'] + reportData.columnTotals.inventory['base'];
                return (
                  <React.Fragment key={col}>
                    <td onMouseEnter={() => setHoveredCol(col)} onMouseLeave={() => setHoveredCol(null)} style={{ ...getHoverStyle(col), padding: '1.5rem 1rem', textAlign: 'right', fontWeight: 800, fontSize: '1.1rem', color: '#1d4ed8', borderLeft: col !== 'base' ? '1px dashed rgba(59, 130, 246, 0.3)' : 'none' }}>
                      {formatCurrency(val)}
                    </td>
                    <td onMouseEnter={() => setHoveredCol(col)} onMouseLeave={() => setHoveredCol(null)} style={{ ...getHoverStyle(col), padding: '1.5rem 0.5rem', textAlign: 'right', fontWeight: 700, fontSize: '0.9rem', color: '#1d4ed8', opacity: 0.8 }}>-</td>
                    {mode === 'custom_compare' && col !== 'base' && (
                      <td onMouseEnter={() => setHoveredCol(col)} onMouseLeave={() => setHoveredCol(null)} style={{ ...getHoverStyle(col), padding: '1.5rem 0.5rem', textAlign: 'right', background: 'rgba(59, 130, 246, 0.05)' }}>
                        {renderDelta(val, baseVal, false)}
                      </td>
                    )}
                  </React.Fragment>
                );
              })}
              {mode !== 'custom_compare' && (
                <>
                  <td style={{ padding: '1.5rem 1.5rem', textAlign: 'right', fontWeight: 800, fontSize: '1.1rem', color: '#1d4ed8', borderLeft: '1px dashed rgba(59, 130, 246, 0.3)' }}>
                    {formatCurrency(reportData.columnTotals.ebit['Tổng'] + reportData.columnTotals.inventory['Tổng'])}
                  </td>
                  <td style={{ padding: '1.5rem 1.5rem 1.5rem 0.5rem', textAlign: 'right', fontWeight: 700, fontSize: '0.9rem', color: '#1d4ed8', opacity: 0.8 }}>-</td>
                </>
              )}
            </tr>

            <tr style={{ '--row-bg': '#f8fafc', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid var(--surface-border)', borderBottom: '1px solid var(--surface-border)' }}>
              <td className="sticky-col" style={{ padding: '1.25rem 1.5rem', fontWeight: 700, fontSize: '1.05rem', background: '#f8fafc' }}>- CHI PHÍ BO CHIA CHO CỬA HÀNG</td>
              {columns.map(col => (
                <React.Fragment key={col}>
                  <td onMouseEnter={() => setHoveredCol(col)} onMouseLeave={() => setHoveredCol(null)} style={{ ...getHoverStyle(col), padding: '1.25rem 1rem', textAlign: 'right', fontWeight: 700, color: 'var(--expense-color)', borderLeft: col !== 'base' ? '1px dashed rgba(0,0,0,0.05)' : 'none' }}>
                    {formatCurrency(reportData.columnTotals.boCost[col])}
                  </td>
                  <td onMouseEnter={() => setHoveredCol(col)} onMouseLeave={() => setHoveredCol(null)} style={{ ...getHoverStyle(col), padding: '1.25rem 0.5rem', textAlign: 'right', fontWeight: 700, fontSize: '0.85rem', color: 'var(--expense-color)', opacity: 0.8 }}>
                    {calcPercent(reportData.columnTotals.boCost[col], col)}
                  </td>
                  {mode === 'custom_compare' && col !== 'base' && (
                    <td onMouseEnter={() => setHoveredCol(col)} onMouseLeave={() => setHoveredCol(null)} style={{ ...getHoverStyle(col), padding: '1.25rem 0.5rem', textAlign: 'right', background: 'rgba(0,0,0,0.015)' }}>
                      {renderDelta(reportData.columnTotals.boCost[col], reportData.columnTotals.boCost['base'], true)}
                    </td>
                  )}
                </React.Fragment>
              ))}
              {mode !== 'custom_compare' && (
                <>
                  <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right', fontWeight: 700, color: 'var(--expense-color)', borderLeft: '1px dashed rgba(0,0,0,0.05)' }}>
                    {formatCurrency(reportData.columnTotals.boCost['Tổng'])}
                  </td>
                  <td style={{ padding: '1.25rem 1.5rem 1.25rem 0.5rem', textAlign: 'right', fontWeight: 700, fontSize: '0.85rem', color: 'var(--expense-color)', opacity: 0.8 }}>
                    {calcPercent(reportData.columnTotals.boCost['Tổng'], 'Tổng')}
                  </td>
                </>
              )}
            </tr>

            <tr style={{ '--row-bg': '#ecfdf5', background: 'rgba(16, 185, 129, 0.15)' }}>
              <td className="sticky-col" style={{ padding: '1.5rem', fontWeight: 800, fontSize: '1.2rem', color: 'var(--revenue-color)', background: '#ecfdf5' }}>LỢI NHUẬN SAU BO</td>
              {columns.map(col => {
                const val = reportData.columnTotals.ebit[col] - reportData.columnTotals.boCost[col];
                const baseVal = reportData.columnTotals.ebit['base'] - reportData.columnTotals.boCost['base'];
                return (
                  <React.Fragment key={col}>
                    <td onMouseEnter={() => setHoveredCol(col)} onMouseLeave={() => setHoveredCol(null)} style={{ ...getHoverStyle(col), padding: '1.5rem 1rem', textAlign: 'right', fontWeight: 800, fontSize: '1.2rem', color: 'var(--revenue-color)', borderLeft: col !== 'base' ? '1px dashed rgba(16, 185, 129, 0.3)' : 'none' }}>
                      {formatCurrency(val)}
                    </td>
                    <td onMouseEnter={() => setHoveredCol(col)} onMouseLeave={() => setHoveredCol(null)} style={{ ...getHoverStyle(col), padding: '1.5rem 0.5rem', textAlign: 'right', fontWeight: 700, fontSize: '0.9rem', color: 'var(--revenue-color)', opacity: 0.8 }}>-</td>
                    {mode === 'custom_compare' && col !== 'base' && (
                      <td onMouseEnter={() => setHoveredCol(col)} onMouseLeave={() => setHoveredCol(null)} style={{ ...getHoverStyle(col), padding: '1.5rem 0.5rem', textAlign: 'right', background: 'rgba(16, 185, 129, 0.05)' }}>
                        {renderDelta(val, baseVal, false)}
                      </td>
                    )}
                  </React.Fragment>
                );
              })}
              {mode !== 'custom_compare' && (
                <>
                  <td style={{ padding: '1.5rem 1.5rem', textAlign: 'right', fontWeight: 800, fontSize: '1.2rem', color: 'var(--revenue-color)', borderLeft: '1px dashed rgba(16, 185, 129, 0.3)' }}>
                    {formatCurrency(reportData.columnTotals.ebit['Tổng'] - reportData.columnTotals.boCost['Tổng'])}
                  </td>
                  <td style={{ padding: '1.5rem 1.5rem 1.5rem 0.5rem', textAlign: 'right', fontWeight: 700, fontSize: '0.9rem', color: 'var(--revenue-color)', opacity: 0.8 }}>-</td>
                </>
              )}
            </tr>

            <tr style={{ '--row-bg': '#d1fae5', background: 'rgba(16, 185, 129, 0.25)' }}>
              <td className="sticky-col" style={{ padding: '1.5rem', fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary-color)', background: '#d1fae5' }}>LỢI NHUẬN SAU BO (CÓ TỒN KHO)</td>
              {columns.map(col => {
                const val = reportData.columnTotals.ebit[col] + reportData.columnTotals.inventory[col] - reportData.columnTotals.boCost[col];
                const baseVal = reportData.columnTotals.ebit['base'] + reportData.columnTotals.inventory['base'] - reportData.columnTotals.boCost['base'];
                return (
                  <React.Fragment key={col}>
                    <td onMouseEnter={() => setHoveredCol(col)} onMouseLeave={() => setHoveredCol(null)} style={{ ...getHoverStyle(col), padding: '1.5rem 1rem', textAlign: 'right', fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary-color)', borderLeft: col !== 'base' ? '1px dashed rgba(16, 185, 129, 0.3)' : 'none' }}>
                      {formatCurrency(val)}
                    </td>
                    <td onMouseEnter={() => setHoveredCol(col)} onMouseLeave={() => setHoveredCol(null)} style={{ ...getHoverStyle(col), padding: '1.5rem 0.5rem', textAlign: 'right', fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary-color)', opacity: 0.8 }}>-</td>
                    {mode === 'custom_compare' && col !== 'base' && (
                      <td onMouseEnter={() => setHoveredCol(col)} onMouseLeave={() => setHoveredCol(null)} style={{ ...getHoverStyle(col), padding: '1.5rem 0.5rem', textAlign: 'right', background: 'rgba(16, 185, 129, 0.05)' }}>
                        {renderDelta(val, baseVal, false)}
                      </td>
                    )}
                  </React.Fragment>
                );
              })}
              {mode !== 'custom_compare' && (
                <>
                  <td style={{ padding: '1.5rem 1.5rem', textAlign: 'right', fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary-color)', borderLeft: '1px dashed rgba(16, 185, 129, 0.3)' }}>
                    {formatCurrency(reportData.columnTotals.ebit['Tổng'] + reportData.columnTotals.inventory['Tổng'] - reportData.columnTotals.boCost['Tổng'])}
                  </td>
                  <td style={{ padding: '1.5rem 1.5rem 1.5rem 0.5rem', textAlign: 'right', fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary-color)', opacity: 0.8 }}>-</td>
                </>
              )}
            </tr>

          </tbody>
        </table>
      </div>
    </div>
  );
}
