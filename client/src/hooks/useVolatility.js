import { useState, useEffect } from 'react';

/**
 * Custom hook to batch fetch 24h ticker price volatility data from Binance/Bybit
 * for coins displayed in the opportunities table.
 */
export function useVolatility(coins = []) {
  const [volatilityMap, setVolatilityMap] = useState({});

  useEffect(() => {
    if (!coins || coins.length === 0) return;
    let isMounted = true;

    // Fetch up to first 30 visible coins to avoid rate limit spam
    const symbolsToFetch = coins
      .slice(0, 30)
      .map((c) => c.symbol)
      .filter((s) => !volatilityMap[s]);

    if (symbolsToFetch.length === 0) return;

    const fetchVolatilities = async () => {
      try {
        const results = await Promise.allSettled(
          symbolsToFetch.map(async (symbol) => {
            const res = await fetch(`/api/volatility/${encodeURIComponent(symbol)}`);
            const data = await res.json();
            return { symbol, data: data.success ? data.data : null };
          })
        );

        if (!isMounted) return;

        const newMap = {};
        for (const r of results) {
          if (r.status === 'fulfilled' && r.value.data) {
            newMap[r.value.symbol] = r.value.data;
          }
        }

        if (Object.keys(newMap).length > 0) {
          setVolatilityMap((prev) => ({ ...prev, ...newMap }));
        }
      } catch (e) {
        console.error('Failed to load volatility batch:', e);
      }
    };

    fetchVolatilities();

    return () => {
      isMounted = false;
    };
  }, [coins]);

  return { volatilityMap };
}
