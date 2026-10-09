import { useState, useMemo } from 'react';
import { Layers, Flame, ShieldCheck, Zap, Award } from 'lucide-react';
import { getBreakEven, getTrend } from '../utils/metricsHelper';
import { evaluateRisk } from '../utils/riskEvaluator';
import { evaluateEntryScore } from '../utils/entryScoreEvaluator';

/**
 * Custom hook to encapsulate opportunities filtering, preset management,
 * sorting by active stability metric, and row expansion state.
 */
export function useOpportunities({
  opportunities = [],
  activeMetric = 'score',
  searchQuery = '',
  exchanges = [],
  timeframe = '30d',
  volatilityMap = {},
}) {
  const [activePreset, setActivePreset] = useState('all');
  const [expandedSymbol, setExpandedSymbol] = useState(null);

  const toggleExpandSymbol = (symbol) => {
    setExpandedSymbol((prev) => (prev === symbol ? null : symbol));
  };

  const exchangeNameMap = useMemo(() => {
    const map = {};
    for (const ex of exchanges) {
      map[ex.id] = ex.display_name;
    }
    return map;
  }, [exchanges]);

  const enabledExchangeIds = useMemo(() => {
    return new Set(exchanges.filter((e) => e.is_enabled).map((e) => e.id));
  }, [exchanges]);

  // Helper to score opportunity by selected metric
  const getMetricScore = (item) => {
    if (activeMetric === 'score') {
      const vol = volatilityMap[item.symbol] || item.priceVolatility;
      return evaluateEntryScore(item, vol).score;
    }
    if (activeMetric === 'median') {
      return item.metrics?.median?.medianApy ?? 0;
    }
    if (activeMetric === 'sharpe') {
      return item.metrics?.sharpe?.sharpeRatio ?? 0;
    }
    if (activeMetric === 'current') {
      return item.currentSpreadApy ?? 0;
    }
    return item.metrics?.trimmed?.trimmedMeanApy ?? 0;
  };

  // Group by unique coin symbol and select the best pair for the active metric
  const processedCoins = useMemo(() => {
    if (!opportunities || opportunities.length === 0) return [];

    const grouped = new Map();
    for (const item of opportunities) {
      const sym = item.symbol;
      if (!grouped.has(sym)) {
        grouped.set(sym, {
          symbol: sym,
          oiRank: item.oiRank,
          pairs: [],
        });
      }
      grouped.get(sym).pairs.push(item);
      if (item.allPairs && Array.isArray(item.allPairs)) {
        for (const sub of item.allPairs) {
          grouped.get(sym).pairs.push(sub);
        }
      }
    }

    const resultCoins = [];

    for (const [sym, coinData] of grouped.entries()) {
      const seenCombo = new Set();
      const validPairs = [];

      for (const p of coinData.pairs) {
        const comboKey = `${p.longExchange}->${p.shortExchange}`;
        if (seenCombo.has(comboKey)) continue;
        seenCombo.add(comboKey);

        if (enabledExchangeIds.size > 0) {
          if (!enabledExchangeIds.has(p.longExchange) || !enabledExchangeIds.has(p.shortExchange)) {
            continue;
          }
        }

        const stats = (timeframe === '15d' && p.stats15d) ? p.stats15d : (p.stats30d || p);
        const days = stats?.totalDays ?? p.totalDays ?? 0;
        if (days < 10) {
          continue;
        }

        validPairs.push({
          ...p,
          ...stats,
          symbol: sym,
          longExchange: p.longExchange,
          shortExchange: p.shortExchange,
          oiRank: coinData.oiRank,
          currentSpreadApy: p.currentSpreadApy,
          currentRateLongApy: p.currentRateLongApy,
          currentRateShortApy: p.currentRateShortApy,
          stats15d: p.stats15d,
          stats30d: p.stats30d,
        });
      }

      if (validPairs.length === 0) continue;

      // Sort pairs for this coin by the active metric
      validPairs.sort((a, b) => getMetricScore(b) - getMetricScore(a));

      const topPairs = validPairs.slice(0, 4);
      const primary = topPairs[0];
      const alternatives = topPairs.slice(1);

      // Search query filtering
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const matchesSymbol = sym.toLowerCase().includes(q);
        const matchesExchange = topPairs.some(
          (p) =>
            p.longExchange.toLowerCase().includes(q) ||
            p.shortExchange.toLowerCase().includes(q) ||
            (exchangeNameMap[p.longExchange] && exchangeNameMap[p.longExchange].toLowerCase().includes(q)) ||
            (exchangeNameMap[p.shortExchange] && exchangeNameMap[p.shortExchange].toLowerCase().includes(q))
        );
        if (!matchesSymbol && !matchesExchange) {
          continue;
        }
      }

      resultCoins.push({
        ...primary,
        symbol: sym,
        oiRank: coinData.oiRank,
        allPairs: topPairs,
        alternatives,
      });
    }

    // Sort all unique coins by their primary pair's active metric score
    resultCoins.sort((a, b) => getMetricScore(b) - getMetricScore(a));

    return resultCoins;
  }, [opportunities, activeMetric, searchQuery, enabledExchangeIds, exchangeNameMap, timeframe, volatilityMap]);

  // Filter predicates for quick presets
  const presetFilters = useMemo(
    () => ({
      all: () => true,
      top_rated: (item) => {
        const scoreObj = evaluateEntryScore(item, volatilityMap[item.symbol] || item.priceVolatility);
        return scoreObj.score >= 70;
      },
      hot: (item) => {
        const trend = getTrend(item);
        const be = getBreakEven(item, activeMetric);
        const apy = item.metrics?.trimmed?.trimmedMeanApy ?? item.currentSpreadApy ?? 0;
        const isExpanding = trend?.direction === 'expanding' || trend?.label === 'Растущий';
        const isFastBe = be?.days !== null && be?.days <= 2.5 && be?.status !== 'negative';
        return isExpanding && isFastBe && apy > 0;
      },
      conservative: (item) => {
        const risk = evaluateRisk(item, volatilityMap[item.symbol] || item.priceVolatility);
        const sharpe = item.metrics?.sharpe?.sharpeRatio ?? 0;
        const oiRank = item.oiRank ?? 999;
        return risk.level === 'low' && sharpe >= 1.2 && oiRank <= 150;
      },
      high_yield: (item) => {
        const apy = item.metrics?.trimmed?.trimmedMeanApy ?? item.currentSpreadApy ?? 0;
        const be = getBreakEven(item, activeMetric);
        const isHighApy = apy >= 50;
        const isFastBe = be?.days !== null && be?.days <= 2.5 && be?.status !== 'negative';
        return isHighApy && isFastBe;
      },
    }),
    [activeMetric, volatilityMap]
  );

  // Dynamic counts for each preset
  const presetCounts = useMemo(() => {
    return {
      all: processedCoins.length,
      top_rated: processedCoins.filter(presetFilters.top_rated).length,
      hot: processedCoins.filter(presetFilters.hot).length,
      conservative: processedCoins.filter(presetFilters.conservative).length,
      high_yield: processedCoins.filter(presetFilters.high_yield).length,
    };
  }, [processedCoins, presetFilters]);

  // Filtered coins based on activePreset
  const filteredCoins = useMemo(() => {
    if (activePreset === 'all') return processedCoins;
    const filterFn = presetFilters[activePreset];
    return filterFn ? processedCoins.filter(filterFn) : processedCoins;
  }, [processedCoins, activePreset, presetFilters]);

  const presets = useMemo(() => [
    {
      id: 'all',
      label: 'Все связки',
      shortLabel: 'Все',
      icon: Layers,
      count: presetCounts.all,
      tooltip: 'Все найденные связки без пресетной фильтрации',
    },
    {
      id: 'top_rated',
      label: 'Топ рейтинг',
      shortLabel: '🏆 Топ рейтинг',
      icon: Award,
      count: presetCounts.top_rated,
      tooltip: 'Сводный рейтинг входа ≥ 70 (Ранги S и A: высокая надежность и быстрая окупаемость)',
    },
    {
      id: 'hot',
      label: 'Горячие связки',
      shortLabel: '🔥 Горячие',
      icon: Flame,
      count: presetCounts.hot,
      tooltip: 'Тренд: Растущий ↗ + Окупаемость комиссии < 2.5 дней',
    },
    {
      id: 'conservative',
      label: 'Консервативные',
      shortLabel: '🛡️ Консервативные',
      icon: ShieldCheck,
      count: presetCounts.conservative,
      tooltip: 'Низкий риск + Шарп ≥ 1.2 + Топ 150 по открытому интересу',
    },
    {
      id: 'high_yield',
      label: 'Сверхдоходные',
      shortLabel: '⚡ Сверхдоходные',
      icon: Zap,
      count: presetCounts.high_yield,
      tooltip: 'Доходность > 50% APY + Окупаемость комиссии < 2.5 дней',
    },
  ], [presetCounts]);

  return {
    processedCoins,
    filteredCoins,
    activePreset,
    setActivePreset,
    presets,
    expandedSymbol,
    setExpandedSymbol,
    toggleExpandSymbol,
    exchangeNameMap,
  };
}
