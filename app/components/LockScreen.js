'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

export default function LockScreen() {
  const { data: session, status } = useSession();
  const [isLocked, setIsLocked] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

  const resetTimer = () => {
    if (isLocked) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    
    timerRef.current = setTimeout(() => {
      setIsLocked(true);
    }, IDLE_TIMEOUT_MS);
  };

  useEffect(() => {
    // Only monitor if logged in
    if (status !== 'authenticated') return;

    // Start timer initially
    resetTimer();

    // Reset timer on user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const handleActivity = () => resetTimer();

    events.forEach(e => window.addEventListener(e, handleActivity));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(e => window.removeEventListener(e, handleActivity));
    };
  }, [status, isLocked]);

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (pin.length !== 6) {
      setError('Vui lòng nhập đủ 6 số');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', pin })
      });
      
      const data = await res.json();
      if (data.success) {
        setIsLocked(false);
        setPin('');
        resetTimer();
      } else {
        setError(data.error || 'Mã PIN không đúng');
      }
    } catch (err) {
      setError('Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  };

  if (!isLocked || status !== 'authenticated') return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div className="glass-panel animate-fade-in" style={{ padding: '3rem 2rem', textAlign: 'center', maxWidth: '400px', width: '90%', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ width: '60px', height: '60px', borderRadius: '15px', background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', boxShadow: '0 8px 16px rgba(56, 189, 248, 0.3)' }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
        </div>
        
        <h2 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Màn Hình Khoá</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          Tài khoản tạm khoá do không có hoạt động trong 30 phút. Vui lòng nhập mã PIN 6 số để tiếp tục.
        </p>

        <form onSubmit={handleUnlock}>
          <input 
            type="password" 
            maxLength="6"
            placeholder="••••••"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            style={{ 
              width: '100%', 
              textAlign: 'center', 
              fontSize: '2rem', 
              letterSpacing: '0.5rem',
              padding: '1rem',
              borderRadius: '12px',
              border: '1px solid var(--surface-border)',
              background: 'var(--background)',
              color: 'var(--text-primary)',
              marginBottom: '1rem'
            }}
            autoFocus
          />
          
          {error && (
            <div style={{ color: 'var(--expense-color)', fontSize: '0.85rem', marginBottom: '1rem', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '6px' }}>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary"
            style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}
            disabled={loading || pin.length !== 6}
          >
            {loading ? 'Đang mở khoá...' : 'Mở khoá'}
          </button>
        </form>
      </div>
    </div>
  );
}
