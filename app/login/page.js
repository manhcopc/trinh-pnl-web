'use client';

import { signIn } from "next-auth/react";
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', background: 'var(--background)' }}>
      
      <div className="glass-panel interactive animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid rgba(255, 255, 255, 0.4)' }}>
        
        <div style={{ width: '60px', height: '60px', borderRadius: '15px', background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', boxShadow: '0 8px 16px rgba(56, 189, 248, 0.3)' }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
        </div>
        
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', background: 'linear-gradient(90deg, var(--text-primary), var(--text-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Đăng nhập nội bộ
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          Hệ thống Báo cáo P&L dành riêng cho quản lý Trình Cà Phê.
        </p>

        {error === 'AccessDenied' && (
          <div className="error-message" style={{ marginBottom: '1.5rem', fontSize: '0.85rem', width: '100%', padding: '0.75rem' }}>
            <strong>Truy cập bị từ chối!</strong><br />Email của bạn chưa được cấp quyền xem báo cáo.
          </div>
        )}

        <button 
          onClick={() => signIn('google', { callbackUrl: '/' })}
          className="btn btn-primary"
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', padding: '0.85rem', background: '#ffffff', color: '#333', border: '1px solid #ddd', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
          </svg>
          <span style={{ fontWeight: 600 }}>Đăng nhập với Google</span>
        </button>
        
        <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          Hệ thống lưu trữ trên Google Sheets an toàn tuyệt đối.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="spinner" style={{ margin: 'auto' }}></div>}>
      <LoginContent />
    </Suspense>
  );
}
