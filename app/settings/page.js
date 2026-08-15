'use client';
import { useState } from 'react';
import { useMasterData } from '@/hooks/useMasterData';

export default function SettingsPage() {
  const { branches, categoryGroups, loading, error, refresh, updateCacheLocally } = useMasterData();
  
  const [newBranch, setNewBranch] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatGroup, setNewCatGroup] = useState('');
  
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  const showMessage = (msg, isError = false) => {
    setMessage({ text: msg, isError });
    setTimeout(() => setMessage(''), 4000);
  };

  const handleAddBranch = async (e) => {
    e.preventDefault();
    if (!newBranch.trim()) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addBranch', name: newBranch.trim() })
      });

      if (res.ok) {
        showMessage('Đã thêm Cơ sở thành công!');
        setNewBranch('');
        // Update local cache
        updateCacheLocally({
          branches: [...branches, newBranch.trim()],
          categoryGroups
        });
      } else {
        const err = await res.json();
        showMessage(err.error || 'Lỗi khi thêm Cơ sở', true);
      }
    } catch (err) {
      showMessage('Lỗi kết nối', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim() || !newCatGroup) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addCategory', name: newCatName.trim(), groupName: newCatGroup })
      });

      if (res.ok) {
        showMessage('Đã thêm Danh mục thành công!');
        
        // Update local cache manually to avoid full reload
        const newCategoryGroups = [...categoryGroups];
        const groupIndex = newCategoryGroups.findIndex(g => g.group === newCatGroup);
        if (groupIndex >= 0) {
          newCategoryGroups[groupIndex].items.push(newCatName.trim());
        }
        
        updateCacheLocally({
          branches,
          categoryGroups: newCategoryGroups
        });
        
        setNewCatName('');
      } else {
        const err = await res.json();
        showMessage(err.error || 'Lỗi khi thêm Danh mục', true);
      }
    } catch (err) {
      showMessage('Lỗi kết nối', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleForceSync = async () => {
    await refresh();
    showMessage('Đã đồng bộ dữ liệu mới nhất từ máy chủ!');
  };

  // Lấy danh sách tên nhóm (unique)
  const groupNames = categoryGroups ? categoryGroups.map(g => g.group) : [];

  return (
    <div className="animate-fade-in" style={{ padding: '0 0.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '5rem' }}>
      <header style={{ padding: '1rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>Cấu Hình Hệ Thống</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Quản trị Cơ sở & Danh mục (Master Data)</p>
        </div>
        <button onClick={handleForceSync} className="btn btn-primary" style={{ width: 'auto' }} disabled={loading || actionLoading}>
          🔄 Đồng Bộ Dữ Liệu Mới
        </button>
      </header>

      {error && (
        <div className="error-message">{error}</div>
      )}

      {message && (
        <div className={message.isError ? "error-message" : "toast-container"}>
          {!message.isError ? (
            <div className="toast">
              <span style={{ fontWeight: 500 }}>{message.text}</span>
            </div>
          ) : message.text}
        </div>
      )}

      {loading ? (
        <div className="glass-panel" style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <div className="spinner"></div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          
          {/* Form Thêm Cơ Sở */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem' }}>Quản lý Cơ Sở</h3>
            
            <form onSubmit={handleAddBranch} style={{ marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label>Tên Cơ Sở Mới</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={newBranch} 
                    onChange={e => setNewBranch(e.target.value)} 
                    placeholder="VD: Bếp Trung Tâm"
                    disabled={actionLoading}
                  />
                  <button type="submit" className="btn btn-primary" style={{ width: 'auto' }} disabled={!newBranch.trim() || actionLoading}>
                    Thêm
                  </button>
                </div>
              </div>
            </form>

            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Các cơ sở hiện tại ({branches.length}):</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {branches.map(b => (
                  <span key={b} style={{ background: 'rgba(255,255,255,0.05)', padding: '0.25rem 0.75rem', borderRadius: '1rem', fontSize: '0.85rem' }}>
                    {b}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Form Thêm Danh Mục */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--surface-border)', paddingBottom: '0.5rem' }}>Quản lý Danh Mục Chi Phí</h3>
            
            <form onSubmit={handleAddCategory} style={{ marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label>Nhóm Chi Phí</label>
                <select 
                  className="form-control" 
                  value={newCatGroup} 
                  onChange={e => setNewCatGroup(e.target.value)}
                  disabled={actionLoading}
                >
                  <option value="" disabled>-- Chọn Nhóm --</option>
                  {groupNames.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Tên Chi Phí Mới</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={newCatName} 
                    onChange={e => setNewCatName(e.target.value)} 
                    placeholder="VD: Chi phí Bao bì"
                    disabled={actionLoading}
                  />
                  <button type="submit" className="btn btn-primary" style={{ width: 'auto' }} disabled={!newCatName.trim() || !newCatGroup || actionLoading}>
                    Thêm
                  </button>
                </div>
              </div>
            </form>
          </div>

        </div>
      )}
    </div>
  );
}
