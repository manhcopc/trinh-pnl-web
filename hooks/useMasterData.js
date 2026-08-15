'use client';
import { useState, useEffect, useCallback } from 'react';

const CACHE_KEY = 'pnl_master_data';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export function useMasterData() {
  const [data, setData] = useState({ branches: [], categoryGroups: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFromAPI = async () => {
    try {
      const res = await fetch('/api/master');
      if (!res.ok) throw new Error('Failed to fetch master data');
      const apiData = await res.json();
      
      const cacheObject = {
        data: apiData,
        timestamp: Date.now()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheObject));
      setData(apiData);
    } catch (err) {
      console.error(err);
      setError('Không thể kết nối máy chủ để lấy Cấu hình.');
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
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        const age = Date.now() - parsed.timestamp;
        
        // Use cache if within TTL
        if (age < CACHE_TTL) {
          setData(parsed.data);
          setLoading(false);
          return;
        }
      }
      
      // No cache or expired, fetch from API
      await fetchFromAPI();
    } catch (err) {
      // JSON parse error or something else, fallback to API
      await fetchFromAPI();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Expose a method to manually update cache (used after adding a new branch/category locally)
  const updateCacheLocally = (newData) => {
    const cacheObject = {
      data: newData,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheObject));
    setData(newData);
  };

  return {
    branches: data.branches,
    categoryGroups: data.categoryGroups,
    loading,
    error,
    refresh: () => loadData(true), // Force refresh
    updateCacheLocally
  };
}
