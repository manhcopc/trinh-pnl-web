'use client';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function PnLTable({ records }) {
  if (!records || records.length === 0) {
    return (
      <div className="glass-panel interactive animate-fade-in" style={{ textAlign: 'center', padding: '4rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', height: '100%', animationDelay: '0.2s' }}>
        <div style={{ padding: '1.25rem', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.03)', color: 'var(--text-secondary)' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', margin: 0 }}>Chưa có giao dịch nào.<br/><span style={{fontSize: '0.9rem', opacity: 0.8}}>Hãy thêm giao dịch ở form bên cạnh để bắt đầu.</span></p>
      </div>
    );
  }


  return (
    <div className="glass-panel interactive animate-fade-in" style={{ animationDelay: '0.2s', padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '1.5rem 1.5rem 0' }}>
        <h2>Transaction History</h2>
      </div>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Cơ sở</th>
              <th>Category</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, index) => {
              const isRevenue = record.type.toLowerCase() === 'revenue' || record.type.toLowerCase() === 'thu';
              return (
                <tr key={record.id || index}>
                  <td>{formatDate(record.date)}</td>
                  <td>{record.branch}</td>
                  <td style={{ fontWeight: 500 }}>{record.category}</td>
                  <td>
                    <span className={`badge ${isRevenue ? 'badge-revenue' : 'badge-expense'}`}>
                      {record.type}
                    </span>
                  </td>
                  <td className={`amount ${isRevenue ? 'positive' : 'negative'}`}>
                    {isRevenue ? '+' : '-'}{formatCurrency(record.amount)}
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    {record.note}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
