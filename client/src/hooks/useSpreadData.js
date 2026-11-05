import { useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Custom hook for Price & Spread Arbitrage (Apparatura-based)
 * Fetches full market constructions and provides instantaneous reactive filtering
 */
export function useSpreadData() {
  const [rawOpportunities, setRawOpportunities] = useState([]);
  const [serverStats, setServerStats] = useState({
    gradeACount: 0,
    gradeBCount: 0,
    gradeCCount: 0,
    maxNetSpread: 0,
    avgNetSpread: 0,
    perpCount: 0,
    spotCount: 0,
    totalScanned: 0,
    totalProfitable: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedTime, setLastScannedTime] = useState(null);
  const [error, setError] = useState(null);

  // Filters state
  const [mode, setMode] = useState('all'); // 'all', 'perp', 'spot'
  const [maxRisk, setMaxRisk] = useState('B'); // 'A', 'B', 'all'
  const [minNetSpread, setMinNetSpread] = useState(0.2); // 0.2%
  const [minVolume, setMinVolume] = useState(50000); // $50k
  const [depositSize, setDepositSize] = useState(1000); // $1000
  const [searchQuery, setSearchQuery] = useState('');
  const [onePairPerSymbol, setOnePairPerSymbol] = useState(true);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [countdown, setCountdown] = useState(30);

  const fetchOpportunities = useCallback(async (params = {}) => {
    setIsScanning(true);
    setError(null);
    try {
      const q = new URLSearchParams({
        mode: 'all',
        maxRisk: 'all',
        minNetSpread: '0.1',
        minVolume: '10000',
        depositSize: String(params.depositSize ?? depositSize),
        onePairPerSymbol: String(params.onePairPerSymbol ?? onePairPerSymbol),
        forceRefresh: params.forceRefresh ? 'true' : 'false'
      });

      const res = await fetch(`/api/spread/opportunities?${q.toString()}`);
      const data = await res.json();

      if (data && data.opportunities) {
        setRawOpportunities(data.opportunities);
        if (data.stats) {
          setServerStats(data.stats);
        }
        setLastScannedTime(data.timestamp || new Date().toISOString());
      } else if (data && data.error) {
        setError(data.error);
      }
    } catch (err) {
      console.error('[useSpreadData] Fetch error:', err);
      setError(err.message);
    } finally {
      setIsScanning(false);
      setIsLoading(false);
      setCountdown(30);
    }
  }, [depositSize, onePairPerSymbol]);

  // Initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOpportunities();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchOpportunities]);

  // Auto-refresh timer countdown (30s)
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchOpportunities({ forceRefresh: true });
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefreshEnabled, fetchOpportunities]);

  const handleManualScan = () => {
    fetchOpportunities({ forceRefresh: true });
  };

  // Instant reactive client-side filtering: NEVER desyncs with UI controls!
  const filteredOpportunities = useMemo(() => {
    if (!rawOpportunities || rawOpportunities.length === 0) return [];

    return rawOpportunities.filter((opp) => {
      // 1. Risk Level Filter:
      if (maxRisk === 'A' && opp.grade !== 'A') return false;
      if (maxRisk === 'B' && opp.grade !== 'A' && opp.grade !== 'B') return false;

      // 2. Strategy Mode Filter:
      if (mode === 'perp' && opp.strategyMode !== 'perp-perp') return false;
      if (mode === 'spot' && opp.strategyMode !== 'spot-perp') return false;

      // 3. Min Net Spread Filter:
      if (minNetSpread && (opp.spreads?.netSpread ?? 0) < minNetSpread) return false;

      // 4. Min Volume Filter:
      if (minVolume) {
        const vLong = opp.long?.volume24h || 0;
        const vShort = opp.short?.volume24h || 0;
        if (vLong < minVolume || vShort < minVolume) return false;
      }

      // 5. Search Query Filter:
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const matchSym = (opp.symbol || '').toLowerCase().includes(q) || (opp.canonicalSymbol || '').toLowerCase().includes(q);
        const matchLong = (opp.long?.exchange || '').toLowerCase().includes(q);
        const matchShort = (opp.short?.exchange || '').toLowerCase().includes(q);
        if (!matchSym && !matchLong && !matchShort) return false;
      }

      return true;
    });
  }, [rawOpportunities, maxRisk, mode, minNetSpread, minVolume, searchQuery]);

  // Derived stats reflecting active filtered opportunities
  const derivedStats = useMemo(() => {
    const list = filteredOpportunities;
    const gradeACount = list.filter(o => o.grade === 'A').length;
    const gradeBCount = list.filter(o => o.grade === 'B').length;
    const gradeCCount = list.filter(o => o.grade === 'C').length;
    const maxNetSpread = list.length > 0 ? Math.max(...list.map(o => o.spreads?.netSpread || 0)) : 0;
    const avgNetSpread = list.length > 0
      ? Number((list.reduce((acc, o) => acc + (o.spreads?.netSpread || 0), 0) / list.length).toFixed(2))
      : 0;

    return {
      gradeACount,
      gradeBCount,
      gradeCCount,
      maxNetSpread,
      avgNetSpread,
      totalProfitable: list.length,
      totalScanned: serverStats.totalScanned || list.length
    };
  }, [filteredOpportunities, serverStats]);

  return {
    opportunities: filteredOpportunities,
    stats: derivedStats,
    isLoading,
    isScanning,
    lastScannedTime,
    error,
    countdown,
    autoRefreshEnabled,
    setAutoRefreshEnabled,
    mode,
    setMode,
    maxRisk,
    setMaxRisk,
    minNetSpread,
    setMinNetSpread,
    minVolume,
    setMinVolume,
    depositSize,
    setDepositSize,
    searchQuery,
    setSearchQuery,
    onePairPerSymbol,
    setOnePairPerSymbol,
    fetchOpportunities,
    handleManualScan,
  };
}
