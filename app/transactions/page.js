'use client';

import { usePnLData } from '@/hooks/usePnLData';
import PnLTable from '../components/PnLTable';

export default function TransactionsPage() {
  const { records, loading, error, refresh } = usePnLData();

  return (
    <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', paddingTop: '2rem' }}>
      
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
        <div className="dashboard-grid animate-fade-in" style={{ gridTemplateColumns: '1fr' }}>
          <div className="glass-panel" style={{ padding: '1.5rem', height: '600px' }}>
            <div className="skeleton skeleton-title"></div>
            <div className="skeleton skeleton-text"></div>
            <div className="skeleton skeleton-text"></div>
            <div className="skeleton skeleton-text"></div>
            <div className="skeleton skeleton-text short"></div>
          </div>
        </div>
      ) : (
        <div className="animate-fade-in">
          <PnLTable records={records} />
        </div>
      )}
    </div>
  );
}
