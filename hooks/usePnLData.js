'use client';
import { useState, useEffect, useCallback } from 'react';

const PNL_CACHE_KEY = 'pnl_transaction_data';
const PNL_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export function usePnLData() {
  const [data, setData] = useState({ records: [], summary: { totalRevenue: 0, totalExpense: 0, netProfit: 0 }, lastUpdated: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFromAPI = async () => {
    try {
      const res = await fetch('/api/pnl');
      if (!res.ok) throw new Error('Failed to fetch PnL data');
      const apiData = await res.json();
      
      const now = Date.now();
      const cacheObject = {
        data: apiData,
        timestamp: now
      };
      
      // Lưu vào sessionStorage để cache theo phiên trình duyệt
      sessionStorage.setItem(PNL_CACHE_KEY, JSON.stringify(cacheObject));
      setData({ ...apiData, lastUpdated: now });
    } catch (err) {
      console.error(err);
      setError('Không thể kết nối máy chủ để lấy dữ liệu Báo cáo.');
    }
  };

  const loadData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    if (forceRefresh) {
      await fetchFromAPI();
      setLoading(false);
      return;
    }

    try {
      const cached = sessionStorage.getItem(PNL_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        const age = Date.now() - parsed.timestamp;
        
        // Sử dụng cache nếu còn hạn
        if (age < PNL_CACHE_TTL) {
          setData({ ...parsed.data, lastUpdated: parsed.timestamp });
          setLoading(false);
          return;
        }
      }
      
      // Cache hết hạn hoặc chưa có, gọi API
      await fetchFromAPI();
    } catch (err) {
      await fetchFromAPI();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Hàm xóa cache (dùng khi submit dữ liệu mới để bắt buộc tải lại)
  const invalidateCache = useCallback(() => {
    sessionStorage.removeItem(PNL_CACHE_KEY);
  }, []);

  return {
    records: data.records || [],
    summary: data.summary || { totalRevenue: 0, totalExpense: 0, netProfit: 0 },
    lastUpdated: data.lastUpdated,
    loading,
    error,
    refresh: () => loadData(true),
    invalidateCache
  };
}
