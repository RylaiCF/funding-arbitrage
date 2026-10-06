import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown, ChevronUp, ArrowRight, Sparkles, HelpCircle, ExternalLink, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import ChartTimeline from './ChartTimeline';
import ExchangeBadge from './ExchangeBadge';
import RiskBadge from './RiskBadge';
import { getBreakEven, getTrend } from '../utils/metricsHelper';

export default function OpportunitiesTable({
  opportunities,
  activeMetric,
  searchQuery,
  exchanges = [],
  timeframe = '30d',
}) {
  const [expandedSymbol, setExpandedSymbol] = useState(null);
  const [volatilityMap, setVolatilityMap] = useState({});

  // Fetch 30d price volatility in batch for visible coins
  useEffect(() => {
    if (!opportunities || opportunities.length === 0) return;
    const symbolsToFetch = Array.from(new Set(opportunities.map((o) => o.symbol))).filter(
      (s) => !volatilityMap[s]
    );
    if (symbolsToFetch.length === 0) return;

    fetch('/api/volatility/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols: symbolsToFetch }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.results) {
          setVolatilityMap((prev) => ({ ...prev, ...d.results }));
        }
      })
      .catch(() => {});
  }, [opportunities]);

  const exchangeNameMap = useMemo(() => {
    const map = {};
    if (Array.isArray(exchanges)) {
      for (const ex of exchanges) {
        if (ex && ex.id) map[ex.id] = ex.display_name;
      }
    }
    return map;
  }, [exchanges]);

  // Set of active/enabled exchange IDs
  const enabledExchangeIds = useMemo(() => {
    if (!Array.isArray(exchanges)) return new Set();
    return new Set(exchanges.filter((e) => e.is_enabled).map((e) => e.id));
  }, [exchanges]);

  // Group opportunities by coin symbol so each coin appears strictly once in the table.
  // The best exchange pair for each coin is shown in the table, while alternative pairs
  // can be explored in the expanded details view.
  const processedCoins = useMemo(() => {
    const coinsMap = new Map();

    for (const item of opportunities) {
      if (!item || !item.symbol) continue;
      const sym = item.symbol;

      if (!coinsMap.has(sym)) {
        coinsMap.set(sym, {
          symbol: sym,
          oiRank: item.oiRank ?? 999,
          rawPairs: [],
        });
      }

      const coinGroup = coinsMap.get(sym);
      if (item.oiRank !== undefined && item.oiRank < coinGroup.oiRank) {
        coinGroup.oiRank = item.oiRank;
      }

      if (Array.isArray(item.allPairs) && item.allPairs.length > 0) {
        for (const p of item.allPairs) {
          coinGroup.rawPairs.push(p);
        }
      } else {
        coinGroup.rawPairs.push(item);
      }
    }

    const getMetricScore = (entry) => {
      if (!entry) return -Infinity;
      if (activeMetric === 'trimmed') {
        return entry.metrics?.trimmed?.score ?? entry.metrics?.trimmed?.trimmedMeanApy ?? 0;
      }
      if (activeMetric === 'median') {
        return entry.metrics?.median?.score ?? entry.metrics?.median?.medianApy ?? 0;
      }
      if (activeMetric === 'sharpe') {
        return entry.metrics?.sharpe?.score ?? entry.metrics?.sharpe?.sharpeRatio ?? 0;
      }
      if (activeMetric === 'current') {
        return entry.currentSpreadApy ?? 0;
      }
      return 0;
    };

    const resultCoins = [];

    for (const [sym, coinData] of coinsMap.entries()) {
      const seenCombo = new Set();
      const validPairs = [];

      for (const p of coinData.rawPairs) {
        if (!p.longExchange || !p.shortExchange) continue;
        const comboKey = `${p.longExchange}->${p.shortExchange}`;
        if (seenCombo.has(comboKey)) continue;
        seenCombo.add(comboKey);

        if (enabledExchangeIds.size > 0) {
          if (!enabledExchangeIds.has(p.longExchange) || !enabledExchangeIds.has(p.shortExchange)) {
            continue;
          }
        }

        const stats = (timeframe === '15d' && p.stats15d) ? p.stats15d : (p.stats30d || p);
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
  }, [opportunities, activeMetric, searchQuery, enabledExchangeIds, exchangeNameMap, timeframe]);

  if (opportunities.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center shadow-xl space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
          <Sparkles className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-200">Связки еще не рассчитаны</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Нажмите кнопку «Сканировать связки» вверху, чтобы получить актуальный срез рынка с loris.tools и рассчитать показатели устойчивости.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Table Title and Count */}
      <div className="p-4 sm:px-6 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-white tracking-tight">
            Лучшие арбитражные связки
          </h2>
          <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
            {processedCoins.length} {processedCoins.length === 1 ? 'монета' : 'монет'}
          </span>
        </div>
        <div className="text-xs text-slate-400 hidden sm:block">
          Нажмите на строку, чтобы раскрыть детали и альтернативные связки
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold tracking-wider uppercase text-[10px]">
              <th className="py-3 px-4">#</th>
              <th className="py-3 px-4">Монета & OI</th>
              <th className="py-3 px-4">Связка (Long → Short)</th>
              <th className="py-3 px-4 text-right">Текущий APY</th>
              <th className={`py-3 px-4 text-right ${activeMetric === 'trimmed' ? 'text-emerald-400 font-bold' : ''}`}>
                Очищенный APY
              </th>
              <th className={`py-3 px-4 text-right ${activeMetric === 'median' ? 'text-teal-400 font-bold' : ''}`}>
                Медианный APY
              </th>
              <th className={`py-3 px-4 text-right ${activeMetric === 'sharpe' ? 'text-cyan-400 font-bold' : ''}`}>
                <div className="inline-flex items-center justify-end gap-1 group relative cursor-help">
                  <span>Шарп фандинга</span>
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition-colors" />

                  {/* Tooltip Popup on Hover */}
                  <div className="absolute right-0 top-full mt-2 w-72 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl text-[11px] text-slate-300 font-normal normal-case leading-relaxed pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 z-50 text-left">
                    <div className="font-semibold text-cyan-400 text-xs mb-1 flex items-center gap-1.5">
                      <span>Коэффициент Шарпа фандинга</span>
                    </div>
                    <p className="mb-1.5">
                      Отношение средней доходности спреда к его волатильности (стандартному отклонению &sigma;).
                    </p>
                    <ul className="space-y-1 text-slate-300">
                      <li>&bull; <strong className="text-emerald-400">Высокий Шарп (&gt;1.5)</strong>: стабильный предсказуемый плюс на дистанции.</li>
                      <li>&bull; <strong className="text-amber-400">Штраф за спайки</strong>: случайный выброс (+1000%) раздувает дисперсию и обрушивает Шарп почти до нуля.</li>
                    </ul>
                  </div>
                </div>
              </th>
              <th className="py-3 px-4 text-right">
                <div className="inline-flex items-center justify-end gap-1 group relative cursor-help">
                  <span>Окупаемость</span>
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400 transition-colors" />

                  {/* Tooltip Popup on Hover */}
                  <div className="absolute right-0 top-full mt-2 w-72 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl text-[11px] text-slate-300 font-normal normal-case leading-relaxed pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 z-50 text-left">
                    <div className="font-semibold text-emerald-400 text-xs mb-1 flex items-center gap-1.5">
                      <span>Время окупаемости комиссий (Break-even)</span>
                    </div>
                    <p className="mb-1.5">
                      Срок удержания связки, необходимый для покрытия торговых комиссий входа и выхода доходом от спреда.
                    </p>
                    <ul className="space-y-1 text-slate-300">
                      <li>&bull; Базовый расчет: <strong>~0.18% на круг</strong> (вход + выход тейкером на 2 биржах).</li>
                      <li>&bull; <strong className="text-emerald-400">&lt; 2 дней (или часы)</strong>: быстрая окупаемость, отличный потенциал.</li>
                      <li>&bull; <strong className="text-amber-400">2–5 дней</strong>: нормальный рабочий горизонт.</li>
                      <li>&bull; <strong className="text-rose-400">&gt; 5 дней / Убыток</strong>: долгая окупаемость, комиссии съедают профит.</li>
                    </ul>
                  </div>
                </div>
              </th>
              <th className="py-3 px-4 text-right">
                <div className="inline-flex items-center justify-end gap-1 group relative cursor-help">
                  <span>Тренд (24ч / 7д)</span>
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition-colors" />

                  {/* Tooltip Popup on Hover */}
                  <div className="absolute right-0 top-full mt-2 w-72 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl text-[11px] text-slate-300 font-normal normal-case leading-relaxed pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 z-50 text-left">
                    <div className="font-semibold text-cyan-400 text-xs mb-1 flex items-center gap-1.5">
                      <span>Динамика и моментум фандинга</span>
                    </div>
                    <p className="mb-1.5">
                      Сравнение средней доходности спреда за 24 часа и 7 дней:
                    </p>
                    <ul className="space-y-1 text-slate-300">
                      <li>&bull; <strong className="text-emerald-400">Растущий ↗</strong>: приток ликвидности, спред прямо сейчас выше недельного.</li>
                      <li>&bull; <strong className="text-teal-300">Стабильный ➔</strong>: устойчивый ровный спред без резких перекосов.</li>
                      <li>&bull; <strong className="text-rose-400">Угасающий ↘</strong>: спред за последние сутки схлопнулся или инвертировался.</li>
                    </ul>
                  </div>
                </div>
              </th>
              <th className="py-3 px-4 text-center">График</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {processedCoins.map((item, idx) => {
              const isExpanded = expandedSymbol === item.symbol;
              const breakEven = getBreakEven(item, activeMetric);
              const trend = getTrend(item);

              return (
                <React.Fragment key={item.symbol}>
                  <tr
                    onClick={() => setExpandedSymbol(isExpanded ? null : item.symbol)}
                    className={`cursor-pointer transition-colors hover:relative hover:z-20 ${
                      isExpanded ? 'bg-slate-800/70 z-10' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Index */}
                    <td className="py-3.5 px-4 font-mono text-slate-500 font-medium">
                      {idx + 1}
                    </td>

                    {/* Symbol, OI Rank & Risk Badge */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <div className="font-bold text-white text-sm tracking-wide">
                          {item.symbol}
                        </div>
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                          title="Open Interest Rank: чем меньше, тем выше ликвидность"
                        >
                          OI #{item.oiRank}
                        </span>
                        <RiskBadge
                          item={item}
                          volatilityData={volatilityMap[item.symbol] || item.priceVolatility}
                        />
                        <a
                          href={`https://loris.tools/backtester?token=${encodeURIComponent(item.symbol)}&longToken=${encodeURIComponent(item.symbol)}&shortToken=${encodeURIComponent(item.symbol)}&exchange1=${encodeURIComponent(item.longExchange)}&exchange2=${encodeURIComponent(item.shortExchange)}&timeframe=${timeframe}&unit=APY&position=2000&execution=10`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded text-slate-500 hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors"
                          title={`Открыть связку в бэктестере Loris (${timeframe} APY, position=$2,000)`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>

                    {/* Long -> Short exchanges */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <ExchangeBadge
                          exchangeId={item.longExchange}
                          displayName={exchangeNameMap[item.longExchange]}
                          symbol={item.symbol}
                          isLong={true}
                        />
                        <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                        <ExchangeBadge
                          exchangeId={item.shortExchange}
                          displayName={exchangeNameMap[item.shortExchange]}
                          symbol={item.symbol}
                          isShort={true}
                        />
                      </div>
                    </td>

                    {/* Current Spread APY */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-bold font-mono text-slate-200">
                        +{item.currentSpreadApy}%
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {item.currentRateLongApy}% / {item.currentRateShortApy}%
                      </div>
                    </td>

                    {/* Trimmed Mean APY */}
                    <td className="py-3.5 px-4 text-right">
                      <div className={`font-mono font-bold ${activeMetric === 'trimmed' ? 'text-emerald-400 text-sm' : 'text-slate-300'}`}>
                        +{item.metrics?.trimmed?.trimmedMeanApy || 0}%
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Вин-рейт {item.winRateHoursPercent}%
                      </div>
                    </td>

                    {/* Median APY */}
                    <td className="py-3.5 px-4 text-right">
                      <div className={`font-mono font-bold ${activeMetric === 'median' ? 'text-teal-400 text-sm' : 'text-slate-300'}`}>
                        +{item.metrics?.median?.medianApy || 0}%
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {item.profitableDays}/{item.totalDays} дней в +
                      </div>
                    </td>

                    {/* Sharpe Ratio */}
                    <td className="py-3.5 px-4 text-right">
                      <div className={`font-mono font-bold ${activeMetric === 'sharpe' ? 'text-cyan-400 text-sm' : 'text-slate-300'}`}>
                        {item.metrics?.sharpe?.sharpeRatio || 0}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        σ = {item.metrics?.sharpe?.volatilityStdDev || 0}%
                      </div>
                    </td>

                    {/* Break-even Payback Time */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex flex-col items-end">
                        <div className={`font-mono font-bold text-xs px-2 py-0.5 rounded-lg border inline-flex items-center gap-1 ${
                          breakEven.status === 'fast'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : breakEven.status === 'normal'
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                        }`}>
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>{breakEven.text}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Round-trip ~0.18%
                        </div>
                      </div>
                    </td>

                    {/* Funding Trend & Momentum (24h / 7d) */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1 font-mono font-bold text-xs">
                          <span className={trend.spread24hApy >= 0 ? 'text-slate-200' : 'text-rose-400'}>
                            {trend.spread24hApy >= 0 ? `+${trend.spread24hApy}%` : `${trend.spread24hApy}%`}
                          </span>
                          {trend.direction === 'expanding' && (
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          )}
                          {trend.direction === 'stable' && (
                            <span className="text-slate-500 text-xs">➔</span>
                          )}
                          {trend.direction === 'decaying' && (
                            <TrendingDown className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                          <span>7д:</span>
                          <span className="text-slate-400 font-mono">
                            {trend.spread7dApy >= 0 ? `+${trend.spread7dApy}%` : `${trend.spread7dApy}%`}
                          </span>
                          <span className={`px-1 py-0.2 rounded text-[9px] font-semibold ${
                            trend.direction === 'expanding'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : trend.direction === 'decaying'
                              ? 'bg-rose-500/10 text-rose-400'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {trend.label}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Expand icon */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Row with Timeline Chart */}
                  {isExpanded && (
                    <tr className="bg-slate-900/90">
                      <td colSpan="10" className="p-4 sm:p-6 border-b border-slate-800">
                        <ChartTimeline
                          item={item}
                          exchangeNameMap={exchangeNameMap}
                          timeframe={timeframe}
                          volatilityData={volatilityMap[item.symbol] || item.priceVolatility}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
