import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook to manage persistent application data:
 * settings, exchanges list, opportunities cache, and initial loading state.
 */
export function useAppData() {
  const [settings, setSettings] = useState({
    max_oi_rank: 100,
    timeframe: '30d',
    candidate_count: 25,
    active_metric: 'trimmed',
    filter_high_volatility: 'true',
    max_spread_cap: 300,
  });

  const [exchanges, setExchanges] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [lastScannedTime, setLastScannedTime] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // 1. Load Settings
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings({
          max_oi_rank: Number(data.settings.max_oi_rank || 100),
          timeframe: data.settings.timeframe || '30d',
          candidate_count: Number(data.settings.candidate_count || 25),
          active_metric: data.settings.active_metric || 'trimmed',
          filter_high_volatility: String(data.settings.filter_high_volatility ?? 'true'),
          max_spread_cap: Number(data.settings.max_spread_cap ?? 300),
        });
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }, []);

  // 2. Load Exchanges
  const fetchExchanges = useCallback(async () => {
    try {
      const res = await fetch('/api/exchanges');
      const data = await res.json();
      if (data.success && data.exchanges) {
        setExchanges(data.exchanges);
      }
    } catch (e) {
      console.error('Failed to load exchanges:', e);
    }
  }, []);

  // 3. Load Cached Scan Results
  const fetchCachedScan = useCallback(async () => {
    try {
      const res = await fetch('/api/scan/cached');
      const data = await res.json();
      if (data.success && data.cache) {
        setOpportunities(data.cache.results || []);
        setLastScannedTime(data.cache.timestamp);
      }
    } catch (e) {
      console.error('Failed to load cached scan:', e);
    }
  }, []);

  // 4. Update single setting
  const updateSetting = useCallback(async (key, value) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);

    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
    } catch (e) {
      console.error(`Failed to update setting ${key}:`, e);
    }
  }, [settings]);

  // 5. Toggle exchange
  const toggleExchange = useCallback(async (id, is_enabled) => {
    // Optimistic UI update
    setExchanges((prev) =>
      prev.map((e) => (e.id === id ? { ...e, is_enabled: is_enabled ? 1 : 0 } : e))
    );

    try {
      const res = await fetch(`/api/exchanges/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled }),
      });
      const data = await res.json();
      if (data.success && data.exchanges) {
        setExchanges(data.exchanges);
      }
    } catch (e) {
      console.error(`Failed to toggle exchange ${id}:`, e);
      fetchExchanges();
    }
  }, [fetchExchanges]);

  // 6. Batch update exchanges
  const batchUpdateExchanges = useCallback(async (updates) => {
    // updates is an array of { id, is_enabled }
    const updateMap = new Map((updates || []).map((u) => [u.id, u.is_enabled ? 1 : 0]));
    setExchanges((prev) =>
      prev.map((e) => (updateMap.has(e.id) ? { ...e, is_enabled: updateMap.get(e.id) } : e))
    );

    try {
      const res = await fetch('/api/exchanges/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updates }),
      });
      const data = await res.json();
      if (data.success && data.exchanges) {
        setExchanges(data.exchanges);
      }
    } catch (e) {
      console.error('Failed to batch update exchanges:', e);
      fetchExchanges();
    }
  }, [fetchExchanges]);

  // Initial load on mount
  useEffect(() => {
    const initData = async () => {
      setIsLoadingData(true);
      try {
        await Promise.allSettled([
          fetchSettings(),
          fetchExchanges(),
          fetchCachedScan(),
        ]);
      } finally {
        setIsLoadingData(false);
      }
    };
    initData();
  }, [fetchSettings, fetchExchanges, fetchCachedScan]);

  return {
    settings,
    updateSetting,
    exchanges,
    toggleExchange,
    batchUpdateExchanges,
    opportunities,
    setOpportunities,
    lastScannedTime,
    setLastScannedTime,
    isLoadingData,
    fetchExchanges,
  };
}
