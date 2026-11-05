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

  // Custom user-added coins state
  const [customCoins, setCustomCoins] = useState([]);
  const [allSymbols, setAllSymbols] = useState([]);
  const [isAddingCoin, setIsAddingCoin] = useState(false);
  const [addCoinError, setAddCoinError] = useState(null);

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

  // 1.5 Load Custom Coins
  const fetchCustomCoins = useCallback(async () => {
    try {
      const res = await fetch('/api/custom-coins');
      const data = await res.json();
      if (data.success && Array.isArray(data.customCoins)) {
        setCustomCoins(data.customCoins);
      }
    } catch (e) {
      console.error('Failed to load custom coins:', e);
    }
  }, []);

  // 1.6 Load All Loris Symbols (for autocomplete)
  const fetchAllSymbols = useCallback(async () => {
    try {
      const res = await fetch('/api/symbols');
      const data = await res.json();
      if (data.success && Array.isArray(data.symbols)) {
        setAllSymbols(data.symbols);
      }
    } catch (e) {
      console.error('Failed to load symbols:', e);
    }
  }, []);

  // Add / Analyze Custom Coin On-Demand
  const addCustomCoin = useCallback(async (symbol) => {
    const sym = String(symbol || '').trim().toUpperCase();
    if (!sym) return { success: false, error: 'Введите символ монеты' };

    setIsAddingCoin(true);
    setAddCoinError(null);
    try {
      const res = await fetch('/api/custom-coins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: sym, timeframe: settings.timeframe }),
      });
      const data = await res.json();
      if (data.success) {
        if (Array.isArray(data.customCoins)) {
          setCustomCoins(data.customCoins);
        }
        if (data.opportunity) {
          setOpportunities((prev) => [
            data.opportunity,
            ...prev.filter((c) => c.symbol !== sym),
          ]);
          setLastScannedTime(new Date().toISOString());
        }
        return { success: true, opportunity: data.opportunity };
      } else {
        const errMsg = data.error || 'Не удалось проанализировать монету';
        setAddCoinError(errMsg);
        return { success: false, error: errMsg };
      }
    } catch (e) {
      const errMsg = e.message || 'Ошибка соединения с сервером';
      setAddCoinError(errMsg);
      return { success: false, error: errMsg };
    } finally {
      setIsAddingCoin(false);
    }
  }, [settings.timeframe]);

  // Remove Custom Coin
  const removeCustomCoin = useCallback(async (symbol) => {
    const sym = String(symbol || '').trim().toUpperCase();
    if (!sym) return;

    try {
      const res = await fetch(`/api/custom-coins/${encodeURIComponent(sym)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        if (Array.isArray(data.customCoins)) {
          setCustomCoins(data.customCoins);
        }
        setOpportunities((prev) => prev.filter((c) => c.symbol !== sym));
        return { success: true };
      }
    } catch (e) {
      console.error('Failed to remove custom coin:', e);
    }
  }, []);

  // Re-analyze specific custom coin
  const reanalyzeCustomCoin = useCallback(async (symbol) => {
    const sym = String(symbol || '').trim().toUpperCase();
    if (!sym) return;

    setIsAddingCoin(true);
    try {
      const res = await fetch(`/api/custom-coins/${encodeURIComponent(sym)}/reanalyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeframe: settings.timeframe }),
      });
      const data = await res.json();
      if (data.success && data.opportunity) {
        setOpportunities((prev) => [
          data.opportunity,
          ...prev.filter((c) => c.symbol !== sym),
        ]);
        return { success: true, opportunity: data.opportunity };
      } else {
        return { success: false, error: data.error };
      }
    } catch (e) {
      return { success: false, error: e.message };
    } finally {
      setIsAddingCoin(false);
    }
  }, [settings.timeframe]);

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
    if (['mexc', 'bitget', 'kucoin'].includes(String(id || '').toLowerCase())) {
      return; // MEXC, Bitget, KuCoin are hard-disabled
    }

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
    const sanitizedUpdates = (updates || []).map((u) => ({
      ...u,
      is_enabled: ['mexc', 'bitget', 'kucoin'].includes(String(u.id || '').toLowerCase()) ? 0 : u.is_enabled,
    }));

    const updateMap = new Map(sanitizedUpdates.map((u) => [u.id, u.is_enabled ? 1 : 0]));
    setExchanges((prev) =>
      prev.map((e) => (updateMap.has(e.id) ? { ...e, is_enabled: updateMap.get(e.id) } : e))
    );

    try {
      const res = await fetch('/api/exchanges/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: sanitizedUpdates }),
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
          fetchCustomCoins(),
          fetchAllSymbols(),
        ]);
      } finally {
        setIsLoadingData(false);
      }
    };
    initData();
  }, [fetchSettings, fetchExchanges, fetchCachedScan, fetchCustomCoins, fetchAllSymbols]);

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
    customCoins,
    allSymbols,
    isAddingCoin,
    addCoinError,
    setAddCoinError,
    addCustomCoin,
    removeCustomCoin,
    reanalyzeCustomCoin,
    fetchCustomCoins,
  };
}
