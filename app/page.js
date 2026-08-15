'use client';
import { useState, useEffect, useCallback } from 'react';
import { formatCurrency } from '@/lib/utils';
import { usePnLData } from '@/hooks/usePnLData';

export default function Home() {
  const { records, summary, loading, error, refresh } = usePnLData();


  return (
    <div className="container">
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 className="animate-fade-in" style={{ marginBottom: '0.5rem' }}>Báo Cáo Hoạt Động (P&L)</h1>
        <p className="slogan animate-fade-in" style={{ animationDelay: '0.1s' }}>Sống tươi mỗi ngày</p>
      </div>
      
      {error && (
        <div className="glass-panel" style={{ borderColor: 'var(--expense-color)', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg style={{ color: 'var(--expense-color)' }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <p style={{ color: 'var(--expense-color)', margin: 0 }}>Lỗi: {error}</p>
          </div>
          <button onClick={refresh} className="btn" style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'var(--expense-color)', border: '1px solid var(--expense-color)', width: 'auto', padding: '0.5rem 1rem' }}>
            Thử lại
          </button>
        </div>
      )}
      
      {loading && !records.length ? (
        <div className="animate-fade-in">
          <div className="summary-cards" style={{ marginBottom: '2.5rem' }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="glass-panel summary-card">
                <div className="summary-card-header">
                  <div className="skeleton skeleton-icon"></div>
                  <div className="skeleton skeleton-text short" style={{ margin: 0, width: '40%' }}></div>
                </div>
                <div className="skeleton skeleton-title" style={{ margin: 0 }}></div>
              </div>
            ))}
          </div>
          <div className="dashboard-grid">
            <div className="glass-panel" style={{ padding: '1.5rem', height: '400px' }}>
              <div className="skeleton skeleton-title"></div>
              <div className="skeleton skeleton-text"></div>
              <div className="skeleton skeleton-text"></div>
              <div className="skeleton skeleton-text short"></div>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem', height: '400px' }}>
              <div className="skeleton skeleton-title"></div>
              <div className="skeleton skeleton-text"></div>
              <div className="skeleton skeleton-text"></div>
              <div className="skeleton skeleton-text"></div>
              <div className="skeleton skeleton-text"></div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="summary-cards animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="glass-panel interactive summary-card revenue">
              <div className="summary-card-header">
                <div className="summary-card-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                </div>
                <p>Tổng Doanh Thu</p>
              </div>
              <h3>{formatCurrency(summary.totalRevenue)}</h3>
            </div>
            
            <div className="glass-panel interactive summary-card expense">
              <div className="summary-card-header">
                <div className="summary-card-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>
                </div>
                <p>Tổng Chi Phí</p>
              </div>
              <h3>{formatCurrency(summary.totalExpense)}</h3>
            </div>
            
            <div className="glass-panel interactive summary-card profit">
              <div className="summary-card-header">
                <div className="summary-card-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                </div>
                <p>Lợi Nhuận (EBIT)</p>
              </div>
              <h3>{formatCurrency(summary.netProfit)}</h3>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
