import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook to manage Squeeze Radar persistent data:
 * cached squeeze scan results, last scanned timestamp, and loading states.
 */
export function useSqueezeData() {
  const [squeezeOpportunities, setSqueezeOpportunities] = useState([]);
  const [squeezeLastScannedTime, setSqueezeLastScannedTime] = useState(null);
  const [isLoadingSqueezeData, setIsLoadingSqueezeData] = useState(true);

  // Load Cached Squeeze Scan Results
  const fetchCachedSqueezeScan = useCallback(async () => {
    try {
      const res = await fetch('/api/squeeze/cached');
      const data = await res.json();
      if (data.success && data.cache) {
        setSqueezeOpportunities(data.cache.results || []);
        setSqueezeLastScannedTime(data.cache.timestamp);
      }
    } catch (e) {
      console.error('Failed to load cached squeeze scan:', e);
    }
  }, []);

  useEffect(() => {
    const initSqueeze = async () => {
      setIsLoadingSqueezeData(true);
      try {
        await fetchCachedSqueezeScan();
      } finally {
        setIsLoadingSqueezeData(false);
      }
    };
    initSqueeze();
  }, [fetchCachedSqueezeScan]);

  return {
    squeezeOpportunities,
    setSqueezeOpportunities,
    squeezeLastScannedTime,
    setSqueezeLastScannedTime,
    isLoadingSqueezeData,
    fetchCachedSqueezeScan,
  };
}
