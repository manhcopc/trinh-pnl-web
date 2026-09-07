'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

export default function LockScreen() {
  const { data: session, status } = useSession();
  const [isLocked, setIsLocked] = useState(true); // Mặc định khoá khi mới load
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const timerRef = useRef(null);

  const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

  useEffect(() => {
    // Kiểm tra trạng thái đã mở khoá từ sessionStorage khi load trang
    if (typeof window !== 'undefined') {
      const unlocked = sessionStorage.getItem('pinUnlocked');
      if (unlocked === 'true') {
        setIsLocked(false);
      }
      setIsInitialized(true);
    }
  }, []);

  const resetTimer = () => {
    if (isLocked) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    
    timerRef.current = setTimeout(() => {
      setIsLocked(true);
      sessionStorage.removeItem('pinUnlocked'); // Xoá trạng thái mở khoá
    }, IDLE_TIMEOUT_MS);
  };

  useEffect(() => {
    if (status !== 'authenticated' || !isInitialized) return;

    if (!isLocked) {
      resetTimer();
    }

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const handleActivity = () => {
      if (!isLocked) resetTimer();
    };

    events.forEach(e => window.addEventListener(e, handleActivity));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(e => window.removeEventListener(e, handleActivity));
    };
  }, [status, isLocked, isInitialized]);

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
        sessionStorage.setItem('pinUnlocked', 'true'); // Lưu trạng thái
        setPin('');
      } else {
        setError(data.error || 'Mã PIN không đúng');
      }
    } catch (err) {
      setError('Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  };

  if (status !== 'authenticated' || !isInitialized) return null;
  if (!isLocked) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div className="glass-panel animate-fade-in" style={{ padding: '3rem 2rem', textAlign: 'center', maxWidth: '400px', width: '90%', border: '1px solid rgba(255,255,255,0.1)', background: 'var(--card-bg)' }}>
        <div style={{ width: '60px', height: '60px', borderRadius: '15px', background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', boxShadow: '0 8px 16px rgba(56, 189, 248, 0.3)' }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
        </div>
        
        <h2 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Bảo Mật Lớp 2</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          Vui lòng nhập Mã PIN ứng dụng (6 số) để truy cập hệ thống.
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
            {loading ? 'Đang xác thực...' : 'Mở khoá'}
          </button>
        </form>
      </div>
    </div>
  );
}
