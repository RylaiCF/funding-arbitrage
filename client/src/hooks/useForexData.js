import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook to manage persistent Forex data:
 * cached forex scan results, currencies metadata, and loading state.
 */
export function useForexData() {
  const [forexOpportunities, setForexOpportunities] = useState([]);
  const [forexLastScannedTime, setForexLastScannedTime] = useState(null);
  const [isLoadingForexData, setIsLoadingForexData] = useState(true);
  const [forexCurrencies, setForexCurrencies] = useState([]);

  // 1. Load Forex Currencies Metadata
  const fetchCurrencies = useCallback(async () => {
    try {
      const res = await fetch('/api/forex/currencies');
      const data = await res.json();
      if (data.success && Array.isArray(data.currencies)) {
        setForexCurrencies(data.currencies);
      }
    } catch (e) {
      console.error('Failed to load forex currencies:', e);
    }
  }, []);

  // 2. Load Cached Forex Scan Results
  const fetchCachedForexScan = useCallback(async () => {
    try {
      const res = await fetch('/api/forex/scan/cached');
      const data = await res.json();
      if (data.success && data.cache) {
        setForexOpportunities(data.cache.results || []);
        setForexLastScannedTime(data.cache.timestamp);
      }
    } catch (e) {
      console.error('Failed to load cached forex scan:', e);
    }
  }, []);

  useEffect(() => {
    const initForex = async () => {
      setIsLoadingForexData(true);
      try {
        await Promise.allSettled([
          fetchCurrencies(),
          fetchCachedForexScan(),
        ]);
      } finally {
        setIsLoadingForexData(false);
      }
    };
    initForex();
  }, [fetchCurrencies, fetchCachedForexScan]);

  return {
    forexOpportunities,
    setForexOpportunities,
    forexLastScannedTime,
    setForexLastScannedTime,
    isLoadingForexData,
    forexCurrencies,
    fetchCachedForexScan,
  };
}
