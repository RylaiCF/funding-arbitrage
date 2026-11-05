import { useState, useMemo } from 'react';
import { Layers, Flame, ShieldCheck, Zap, Award, Star } from 'lucide-react';
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
    return new Set(
      exchanges
        .filter((e) => e.is_enabled && !e.is_hard_disabled && !['mexc', 'bitget', 'kucoin'].includes(e.id))
        .map((e) => e.id)
    );
  }, [exchanges]);

  // Group by unique coin symbol and select the best pair for the active metric
  const processedCoins = useMemo(() => {
    if (!opportunities || opportunities.length === 0) return [];

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

    // Deterministic comparator to guarantee stable sort order even when scores are identical
    const compareOpportunities = (a, b) => {
      const scoreA = getMetricScore(a);
      const scoreB = getMetricScore(b);
      const diff = scoreB - scoreA;
      if (Math.abs(diff) > 0.0001) return diff;

      // Tie-breaker 1: Trimmed Mean APY
      const trimmedA = a.metrics?.trimmed?.trimmedMeanApy ?? a.trimmedMeanApy ?? 0;
      const trimmedB = b.metrics?.trimmed?.trimmedMeanApy ?? b.trimmedMeanApy ?? 0;
      const trimmedDiff = trimmedB - trimmedA;
      if (Math.abs(trimmedDiff) > 0.0001) return trimmedDiff;

      // Tie-breaker 2: Current Spread APY
      const currentA = a.currentSpreadApy ?? 0;
      const currentB = b.currentSpreadApy ?? 0;
      const currentDiff = currentB - currentA;
      if (Math.abs(currentDiff) > 0.0001) return currentDiff;

      // Tie-breaker 3: Sharpe ratio
      const sharpeA = a.metrics?.sharpe?.sharpeRatio ?? 0;
      const sharpeB = b.metrics?.sharpe?.sharpeRatio ?? 0;
      const sharpeDiff = sharpeB - sharpeA;
      if (Math.abs(sharpeDiff) > 0.0001) return sharpeDiff;

      // Tie-breaker 4: Open Interest Rank (lower rank = higher liquidity)
      const oiA = a.oiRank ?? 9999;
      const oiB = b.oiRank ?? 9999;
      if (oiA !== oiB) return oiA - oiB;

      // Tie-breaker 5: Alphabetical by symbol
      return (a.symbol || '').localeCompare(b.symbol || '');
    };

    const grouped = new Map();
    for (const item of opportunities) {
      const sym = item.symbol;
      if (!grouped.has(sym)) {
        grouped.set(sym, {
          symbol: sym,
          oiRank: item.oiRank,
          isForex: Boolean(item.isForex),
          forexMeta: item.forexMeta || null,
          isCustom: Boolean(item.isCustom),
          pairs: [],
        });
      }
      if (item.isCustom) {
        grouped.get(sym).isCustom = true;
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
        const longEx = String(p.longExchange || '').toLowerCase();
        const shortEx = String(p.shortExchange || '').toLowerCase();
        if (
          ['mexc', 'bitget', 'kucoin'].includes(longEx) ||
          ['mexc', 'bitget', 'kucoin'].includes(shortEx)
        ) {
          continue;
        }

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
        const points = stats?.dataPoints ?? p.dataPoints ?? 0;
        const minRequiredDays = timeframe === '15d' ? 9 : 18;
        const minRequiredPoints = timeframe === '15d' ? 200 : 400;

        const isCustom = Boolean(p.isCustom || coinData.isCustom);
        // Strictly eliminate short-history coins: require at least 9 days for 15d, 18 days for 30d (bypassed for user-added coins)
        if (!isCustom && (days < minRequiredDays || points < minRequiredPoints)) {
          continue;
        }

        validPairs.push({
          ...p,
          ...stats,
          symbol: sym,
          isForex: p.isForex || coinData.isForex,
          forexMeta: p.forexMeta || coinData.forexMeta,
          isCustom,
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

      // Sort pairs for this coin by the active metric with deterministic tie-breakers
      validPairs.sort(compareOpportunities);

      const topPairs = validPairs.slice(0, 4);
      const primary = topPairs[0];
      const alternatives = topPairs.slice(1);

      // Search query filtering (supports ticker and currency name e.g. "Евро", "Иена")
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const meta = primary.forexMeta || coinData.forexMeta;
        const matchesSymbol = sym.toLowerCase().includes(q);
        const matchesMeta = meta && (
          (meta.name && meta.name.toLowerCase().includes(q)) ||
          (meta.englishName && meta.englishName.toLowerCase().includes(q))
        );
        const matchesExchange = topPairs.some(
          (p) =>
            p.longExchange.toLowerCase().includes(q) ||
            p.shortExchange.toLowerCase().includes(q) ||
            (exchangeNameMap[p.longExchange] && exchangeNameMap[p.longExchange].toLowerCase().includes(q)) ||
            (exchangeNameMap[p.shortExchange] && exchangeNameMap[p.shortExchange].toLowerCase().includes(q))
        );
        if (!matchesSymbol && !matchesExchange && !matchesMeta) {
          continue;
        }
      }

      resultCoins.push({
        ...primary,
        symbol: sym,
        oiRank: coinData.oiRank,
        isForex: primary.isForex || coinData.isForex,
        forexMeta: primary.forexMeta || coinData.forexMeta,
        isCustom: Boolean(primary.isCustom || coinData.isCustom),
        allPairs: topPairs,
        alternatives,
      });
    }

    // Sort all unique coins deterministically by their primary pair's active metric score
    resultCoins.sort(compareOpportunities);

    return resultCoins;
  }, [opportunities, activeMetric, searchQuery, enabledExchangeIds, exchangeNameMap, timeframe, volatilityMap]);

  // Filter predicates for quick presets
  const presetFilters = useMemo(
    () => ({
      all: () => true,
      custom: (item) => Boolean(item.isCustom),
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
      custom: processedCoins.filter(presetFilters.custom).length,
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

  const presets = useMemo(() => {
    const list = [
      {
        id: 'all',
        label: 'Все связки',
        shortLabel: 'Все',
        icon: Layers,
        count: presetCounts.all,
        tooltip: 'Все найденные связки без пресетной фильтрации',
      },
    ];

    if (presetCounts.custom > 0) {
      list.push({
        id: 'custom',
        label: 'Мои монеты',
        shortLabel: '⭐ Мои монеты',
        icon: Star,
        count: presetCounts.custom,
        tooltip: 'Пользовательские монеты, добавленные вручную в сканер',
      });
    }

    list.push(
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
      }
    );

    return list;
  }, [presetCounts]);

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
