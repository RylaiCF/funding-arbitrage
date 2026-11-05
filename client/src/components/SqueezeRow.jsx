import React, { useState } from 'react';
import {
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Flame,
  Zap,
  Activity,
  AlertTriangle,
  AlertCircle,
  Info,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calculator,
  ShieldCheck,
  ShieldAlert,
  Layers,
} from 'lucide-react';
import ExchangeBadge from './ExchangeBadge';

export default function SqueezeRow({ item, idx, isExpanded, onToggleExpand }) {
  const [calcDeposit, setCalcDeposit] = useState(5000);
  const [activeTab, setActiveTab] = useState('calc'); // 'calc' | 'risk' | 'guide' | 'exchanges'

  // Calculator computations
  const periodYieldUsd = Number((calcDeposit * (Math.abs(item.ratePerPeriodPercent) / 100)).toFixed(2));
  const dailyYieldUsd = Number((calcDeposit * (item.dailyYieldLongPercent / 100)).toFixed(2));
  const threeDaysYieldUsd = Number((dailyYieldUsd * 3).toFixed(2));
  const roundtripFeesUsd = Number((calcDeposit * 0.0015).toFixed(2)); // ~0.15% total taker entry/exit
  const netThreeDaysProfitUsd = Number((threeDaysYieldUsd - roundtripFeesUsd).toFixed(2));

  // Squeeze Severity Badges (Intensity of funding payout to longs)
  let severityBadge = null;
  if (item.severity === 'extreme') {
    severityBadge = (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 shadow-sm shadow-rose-500/10">
        <Flame className="w-3.5 h-3.5 text-rose-400 fill-current" />
        <span>Сверхсквиз</span>
      </span>
    );
  } else if (item.severity === 'high') {
    severityBadge = (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 shadow-sm shadow-amber-500/10">
        <Zap className="w-3.5 h-3.5 text-amber-400 fill-current" />
        <span>Высокий</span>
      </span>
    );
  } else if (item.severity === 'moderate') {
    severityBadge = (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center gap-1 shadow-sm shadow-sky-500/10">
        <Activity className="w-3.5 h-3.5 text-sky-400" />
        <span>Умеренный</span>
      </span>
    );
  } else {
    severityBadge = (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
        <Info className="w-3 h-3 text-slate-400" />
        <span>Минус</span>
      </span>
    );
  }

  // Trading / Liquidation Risk Badge
  const riskInfo = item.risk || {
    level: 'low',
    score: 2,
    label: 'Низкий риск',
    badgeColor: 'emerald',
    warnings: [],
    factors: [],
  };

  let riskBadge = null;
  if (riskInfo.level === 'critical') {
    riskBadge = (
      <span
        title={riskInfo.warnings?.[0] || 'Экстремальный риск выноса шорта'}
        className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-950/60 text-rose-300 border border-rose-500/50 flex items-center gap-1 shadow-sm shadow-rose-500/20"
      >
        <Flame className="w-3 h-3 text-rose-400 animate-pulse" />
        <span>Экстрем ({riskInfo.score}/10)</span>
      </span>
    );
  } else if (riskInfo.level === 'high') {
    riskBadge = (
      <span
        title={riskInfo.warnings?.[0] || 'Высокий риск ликвидации шорта при пампе'}
        className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-500/15 text-orange-300 border border-orange-500/35 flex items-center gap-1 shadow-sm shadow-orange-500/10"
      >
        <AlertTriangle className="w-3 h-3 text-orange-400" />
        <span>Памп / Выс ({riskInfo.score}/10)</span>
      </span>
    );
  } else if (riskInfo.level === 'medium') {
    riskBadge = (
      <span
        title={riskInfo.warnings?.[0] || 'Умеренная волатильность'}
        className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1"
      >
        <AlertCircle className="w-3 h-3 text-amber-400" />
        <span>Умеренный ({riskInfo.score}/10)</span>
      </span>
    );
  } else {
    riskBadge = (
      <span
        title={riskInfo.factors?.[0] || 'Спокойная монета, минимальный риск'}
        className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1"
      >
        <ShieldCheck className="w-3 h-3 text-emerald-400" />
        <span>Низкий ({riskInfo.score}/10)</span>
      </span>
    );
  }

  return (
    <React.Fragment>
      <tr
        onClick={onToggleExpand}
        className={`cursor-pointer transition-colors ${
          isExpanded ? 'bg-slate-800/80' : 'hover:bg-slate-800/40'
        }`}
      >
        {/* 1. Index */}
        <td className="py-3 px-2 text-center font-mono text-slate-500 text-xs">
          {idx + 1}
        </td>

        {/* 2. Squeeze Intensity Badge */}
        <td className="py-3 px-2 text-center whitespace-nowrap">
          {severityBadge}
        </td>

        {/* 3. Symbol & Price / OI */}
        <td className="py-3 px-2 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-sm tracking-wide">
                  {item.symbol}
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  OI #{item.oiRank}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                {item.price !== null && (
                  <span className="font-mono text-slate-300 font-medium">
                    ${item.price < 0.01 ? item.price.toFixed(6) : item.price.toFixed(4)}
                  </span>
                )}
              </div>
            </div>
            <a
              href={`https://loris.tools/backtester?token=${encodeURIComponent(item.symbol)}&exchange1=${encodeURIComponent(item.squeezedExchange)}&timeframe=30d`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
              title="Открыть монету на Loris.tools"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </td>

        {/* 4. 24h Price Change & Risk Badge */}
        <td className="py-3 px-2 whitespace-nowrap">
          <div className="flex flex-col items-start gap-1">
            <div className="flex items-center gap-1.5">
              {item.priceChange24h !== null ? (
                <span
                  className={`flex items-center font-mono font-bold text-xs ${
                    item.priceChange24h >= 20
                      ? 'text-rose-400'
                      : item.priceChange24h >= 0
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {item.priceChange24h >= 20 ? (
                    <Flame className="w-3.5 h-3.5 mr-0.5 inline fill-current" />
                  ) : item.priceChange24h >= 0 ? (
                    <TrendingUp className="w-3.5 h-3.5 mr-0.5 inline" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 mr-0.5 inline" />
                  )}
                  {item.priceChange24h >= 0 ? `+${item.priceChange24h}%` : `${item.priceChange24h}%`}
                </span>
              ) : (
                <span className="text-slate-500 text-xs">—</span>
              )}
              {item.highLowRangePercent && (
                <span className="text-[10px] text-slate-500 font-mono" title="Размах High/Low за 24ч">
                  HL:{item.highLowRangePercent}%
                </span>
              )}
            </div>
            <div>{riskBadge}</div>
          </div>
        </td>

        {/* 5. Squeezed Exchange */}
        <td className="py-3 px-2 whitespace-nowrap">
          <div className="flex items-center gap-1.5">
            <ExchangeBadge
              exchangeId={item.squeezedExchange}
              displayName={item.squeezedDisplayName}
              symbol={item.symbol}
              isLong={true}
            />
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
              {item.intervalHours}ч
            </span>
          </div>
        </td>

        {/* 5. Period Rate & APY */}
        <td className="py-3 px-2 text-right whitespace-nowrap">
          <div className="font-mono font-bold text-rose-400 text-sm">
            {item.ratePerPeriodPercent}%
            <span className="text-[10px] text-slate-400 font-normal ml-1">
              /{item.intervalHours}ч
            </span>
          </div>
          <div className="text-[10px] text-rose-400/80 font-mono">
            {item.squeezedApy}% APY
          </div>
        </td>

        {/* 6. PRIMARY METRIC: Daily Yield to Long (% in 24h) */}
        <td className="py-3 px-2 text-right whitespace-nowrap">
          <div className="inline-block bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-xl shadow-inner">
            <div className="font-mono font-bold text-emerald-400 text-sm tracking-tight flex items-center justify-end gap-1">
              <span>+{item.dailyYieldLongPercent}%</span>
              <span className="text-[10px] text-emerald-400/70 font-normal">/день</span>
            </div>
            <div className="text-[9px] text-emerald-400/80 uppercase font-semibold text-right">
              Шорты платят Long
            </div>
          </div>
        </td>

        {/* 7. Setup 1: Spot-Margin Yield & Borrow Status */}
        <td className="py-3 px-2 text-right whitespace-nowrap">
          <div className="font-mono font-bold text-teal-300 text-xs">
            +{item.strategies.spotMargin.netDailyYield}%
            <span className="text-[10px] text-slate-400 font-normal ml-0.5">/день</span>
          </div>
          {item.borrowInfo && (
            <div className="mt-1 flex justify-end">
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-medium inline-flex items-center gap-1 ${
                  item.borrowInfo.badgeColor === 'emerald'
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : item.borrowInfo.badgeColor === 'amber'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
                title={`Доступность спотового заема: Binance: ${item.borrowInfo.details.binance ? 'ДА' : 'НЕТ'}, Bybit: ${item.borrowInfo.details.bybit ? 'ДА' : 'НЕТ'}, OKX: ${item.borrowInfo.details.okx ? 'ДА' : 'НЕТ'}`}
              >
                {item.borrowInfo.badgeText}
              </span>
            </div>
          )}
        </td>

        {/* 8. Setup 2: Cross-Exchange Hedge */}
        <td className="py-3 px-2 text-right whitespace-nowrap">
          {item.strategies.crossExchange ? (
            <div>
              <div className="flex items-center justify-end gap-1 font-mono font-bold text-cyan-300 text-xs">
                <span>+{item.strategies.crossExchange.netDailySpread}%</span>
                <span className="text-[10px] text-slate-400 font-normal">/день</span>
              </div>
              <div className="text-[10px] text-slate-400">
                Хедж: {item.strategies.crossExchange.shortDisplayName}
              </div>
            </div>
          ) : (
            <span className="text-xs text-slate-500">Спот-Хедж</span>
          )}
        </td>

        {/* 9. Expand Icon */}
        <td className="py-3 px-2 text-center w-7">
          <button
            type="button"
            className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-rose-400" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </td>
      </tr>

      {/* Expanded Details Row */}
      {isExpanded && (
        <tr className="bg-slate-900/95 border-b border-slate-800">
          <td colSpan="10" className="p-4 sm:p-6">
            <div className="space-y-5 max-w-[1400px] mx-auto">
              {/* Tabs Switcher for details */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3 flex-wrap">
                <button
                  onClick={() => setActiveTab('calc')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeTab === 'calc'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Калькулятор прибыли в $</span>
                </button>

                <button
                  onClick={() => setActiveTab('risk')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeTab === 'risk'
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-orange-400" />
                  <span>🛡️ Оценка риска и ликвидация</span>
                  {item.risk?.level === 'critical' || item.risk?.level === 'high' ? (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse ml-0.5" />
                  ) : null}
                </button>

                <button
                  onClick={() => setActiveTab('guide')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeTab === 'guide'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Пошаговый чеклист исполнения</span>
                </button>

                <button
                  onClick={() => setActiveTab('exchanges')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    activeTab === 'exchanges'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Все биржи монеты ({item.allExchangeRates?.length || 0})</span>
                </button>
              </div>

              {/* Tab 1: Interactive Profit Calculator */}
              {activeTab === 'calc' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {/* Left: Input parameters */}
                  <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 space-y-3.5">
                    <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      <span>Параметры позиции</span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] text-slate-400">
                        Выделенный депозит ($):
                      </label>
                      <input
                        type="number"
                        min="100"
                        step="500"
                        value={calcDeposit}
                        onChange={(e) => setCalcDeposit(Math.max(10, Number(e.target.value) || 0))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    {/* Quick amount presets */}
                    <div className="flex items-center gap-1.5">
                      {[1000, 2500, 5000, 10000].map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setCalcDeposit(amt)}
                          className={`flex-1 py-1 text-[10px] font-mono rounded border transition-colors ${
                            calcDeposit === amt
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          ${amt.toLocaleString()}
                        </button>
                      ))}
                    </div>

                    <div className="text-[11px] text-slate-500 pt-1 leading-relaxed">
                      * Депозит делится 50/50: половина идет в обеспечение спотового шорта/займа, вторая половина — в Long Perp на фьючерсах (плечо 1x).
                    </div>
                  </div>

                  {/* Center & Right: Profit Breakdown */}
                  <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
                      <div className="text-[11px] text-slate-400">
                        За 1 клиринг ({item.intervalHours}ч)
                      </div>
                      <div className="text-xl font-bold font-mono text-emerald-400 my-1">
                        +${periodYieldUsd}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {Math.abs(item.ratePerPeriodPercent)}% от номинала
                      </div>
                    </div>

                    <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
                      <div className="text-[11px] text-slate-400">
                        За 24 часа (сутки)
                      </div>
                      <div className="text-xl font-bold font-mono text-emerald-400 my-1">
                        +${dailyYieldUsd}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {item.settlementsPerDay} выплат в сутки
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-950/30 to-slate-950/80 border border-emerald-500/30 rounded-xl p-3.5 flex flex-col justify-between">
                      <div className="text-[11px] font-semibold text-emerald-300">
                        Чистыми за 3 дня (с вычетом комиссий)
                      </div>
                      <div className="text-2xl font-extrabold font-mono text-emerald-400 my-1">
                        +${netThreeDaysProfitUsd}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Комиссии входа/выхода: -${roundtripFeesUsd}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Risk & Liquidation Assessment */}
              {activeTab === 'risk' && (
                <div className="space-y-4">
                  {/* Top Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    {/* 1. Risk Score Card */}
                    <div
                      className={`p-4 rounded-xl border flex flex-col justify-between ${
                        item.risk?.level === 'critical'
                          ? 'bg-rose-950/30 border-rose-500/40'
                          : item.risk?.level === 'high'
                          ? 'bg-orange-950/30 border-orange-500/40'
                          : item.risk?.level === 'medium'
                          ? 'bg-amber-950/20 border-amber-500/30'
                          : 'bg-emerald-950/20 border-emerald-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Оценка риска позиции
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            item.risk?.level === 'critical'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : item.risk?.level === 'high'
                              ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                              : item.risk?.level === 'medium'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {item.risk?.label || 'Низкий риск'}
                        </span>
                      </div>
                      <div className="my-2 flex items-baseline gap-2">
                        <span className="text-3xl font-extrabold font-mono text-white">
                          {item.risk?.score || 2}
                        </span>
                        <span className="text-sm text-slate-400 font-mono">/ 10</span>
                      </div>
                      {/* Progress meter */}
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            (item.risk?.score || 2) >= 8
                              ? 'bg-rose-500'
                              : (item.risk?.score || 2) >= 6
                              ? 'bg-orange-500'
                              : (item.risk?.score || 2) >= 4
                              ? 'bg-amber-400'
                              : 'bg-emerald-400'
                          }`}
                          style={{ width: `${Math.min(100, (item.risk?.score || 2) * 10)}%` }}
                        />
                      </div>
                    </div>

                    {/* 2. Price Momentum & Volatility Card */}
                    <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Динамика цены и размах
                      </span>
                      <div className="my-2 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Изменение за 24ч:</span>
                          <span
                            className={`font-mono font-bold ${
                              (item.priceChange24h ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {(item.priceChange24h ?? 0) >= 0
                              ? `+${item.priceChange24h}%`
                              : `${item.priceChange24h}%`}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Размах High/Low 24ч:</span>
                          <span className="font-mono font-bold text-slate-200">
                            {item.highLowRangePercent ? `${item.highLowRangePercent}%` : '—'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400">Суточный объем:</span>
                          <span className="font-mono text-slate-300">
                            {item.volumeUsd ? `$${(item.volumeUsd / 1_000_000).toFixed(1)}M` : '—'}
                          </span>
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        * Высокий размах High/Low означает резкие свечи и опасность выноса стопов.
                      </div>
                    </div>

                    {/* 3. Spot Margin Safety Status */}
                    <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Защита от ликвидации (Спот-Маржа)
                      </span>
                      <div className="my-2">
                        {item.borrowInfo?.isBorrowable ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span>Заем доступен ({item.borrowInfo.availableExchanges?.length || 0} бирж)</span>
                            </div>
                            <p className="text-[11px] text-slate-300 leading-snug">
                              На Unified Margin прибыль от Long Perp компенсирует убыток от Spot Short — риск ликвидации минимален!
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                              <span>Заема нет на споте</span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-snug">
                              Хеджирование возможно только через фьючерсы (Кросс-Перп). Контролируйте шорт-ногу!
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {item.borrowInfo?.availableExchanges?.length > 0
                          ? `Биржи с займом: ${item.borrowInfo.availableExchanges.join(', ')}`
                          : 'Только Perp-хедж'}
                      </div>
                    </div>
                  </div>

                  {/* Liquidation Thresholds Table / Cards */}
                  {item.risk?.liquidation && (
                    <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                          <span>Точки ликвидации шорт-ноги (Perp Short) при пампе цены ${item.symbol}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Текущая цена: ${item.price}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {/* 1x Leverage */}
                        <div className="p-3 rounded-lg border bg-emerald-950/20 border-emerald-500/30">
                          <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                            <span>Плечо 1x</span>
                            <span className="text-[10px] uppercase bg-emerald-500/20 px-1.5 py-0.2 rounded">Сверхбезопасно</span>
                          </div>
                          <div className="my-2">
                            <div className="text-lg font-mono font-bold text-white">
                              ${item.risk.liquidation.price1x}
                            </div>
                            <div className="text-[11px] text-emerald-400 font-mono font-medium">
                              Запас роста: {item.risk.liquidation.buffer1x}
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Цена должна вырасти в 2 раза от текущей, чтобы выбить позицию.
                          </div>
                        </div>

                        {/* 2x Leverage */}
                        <div className="p-3 rounded-lg border bg-amber-950/20 border-amber-500/30">
                          <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                            <span>Плечо 2x</span>
                            <span className="text-[10px] uppercase bg-amber-500/20 px-1.5 py-0.2 rounded">Умеренный запас</span>
                          </div>
                          <div className="my-2">
                            <div className="text-lg font-mono font-bold text-white">
                              ${item.risk.liquidation.price2x}
                            </div>
                            <div className="text-[11px] text-amber-400 font-mono font-medium">
                              Запас роста: {item.risk.liquidation.buffer2x}
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Допустим рост еще на +45%. При сильном шорт-сквизе требует внимания.
                          </div>
                        </div>

                        {/* 3x Leverage */}
                        <div className="p-3 rounded-lg border bg-orange-950/20 border-orange-500/30">
                          <div className="flex items-center justify-between text-xs font-bold text-orange-300">
                            <span>Плечо 3x</span>
                            <span className="text-[10px] uppercase bg-orange-500/20 px-1.5 py-0.2 rounded">Высокий риск</span>
                          </div>
                          <div className="my-2">
                            <div className="text-lg font-mono font-bold text-white">
                              ${item.risk.liquidation.price3x}
                            </div>
                            <div className="text-[11px] text-orange-400 font-mono font-medium">
                              Запас роста: {item.risk.liquidation.buffer3x}
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Ликвидация при росте всего на +28%. На пампе выбивает очень быстро!
                          </div>
                        </div>

                        {/* 5x Leverage */}
                        <div className="p-3 rounded-lg border bg-rose-950/30 border-rose-500/40">
                          <div className="flex items-center justify-between text-xs font-bold text-rose-300">
                            <span>Плечо 5x</span>
                            <span className="text-[10px] uppercase bg-rose-500/20 px-1.5 py-0.2 rounded">Критично</span>
                          </div>
                          <div className="my-2">
                            <div className="text-lg font-mono font-bold text-white">
                              ${item.risk.liquidation.price5x}
                            </div>
                            <div className="text-[11px] text-rose-400 font-mono font-medium">
                              Запас роста: {item.risk.liquidation.buffer5x}
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Ликвидация при +16%. Категорически запрещено использовать на сквизах!
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Risk factors and mitigation checklist */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Warnings & Risk Factors */}
                    <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 space-y-2.5">
                      <div className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Факторы риска монеты:</span>
                      </div>
                      <ul className="text-xs text-slate-300 space-y-1.5">
                        {item.risk?.warnings?.length > 0 ? (
                          item.risk.warnings.map((w, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-rose-400 shrink-0">•</span>
                              <span>{w}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-slate-400">Критических факторов риска не обнаружено.</li>
                        )}
                      </ul>
                    </div>

                    {/* Safety Mitigations & Golden Rules */}
                    <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 space-y-2.5">
                      <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Защитные правила арбитража:</span>
                      </div>
                      <ul className="text-xs text-slate-300 space-y-1.5">
                        {item.risk?.factors?.length > 0 &&
                          item.risk.factors.map((f, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-emerald-400 shrink-0">•</span>
                              <span>{f}</span>
                            </li>
                          ))}
                        <li className="flex items-start gap-1.5">
                          <span className="text-emerald-400 shrink-0">•</span>
                          <span>
                            <strong>Золотое правило:</strong> На сквизовых монетах держите плечо на фьючерсах не выше 1x-2x и выставляйте стоп-лосс на шорт-ногу на уровне нового дневного максимума.
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Execution Step-by-Step Guide */}
              {activeTab === 'guide' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Scheme A: Spot Margin */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center text-[10px] font-bold">
                        A
                      </span>
                      <span>Схема 1: Спот-Маржа (Внутри биржи {item.squeezedDisplayName})</span>
                    </div>

                    {/* Borrow Availability Box across 6 CEXes */}
                    {item.borrowInfo && (
                      <div className="p-2.5 rounded-lg border bg-slate-900/90 border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Пул спотовых займов (6 CEX):</span>
                          <span className={`font-semibold ${item.borrowInfo.isBorrowable ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {item.borrowInfo.onTargetExchange
                              ? `Доступен на ${item.squeezedDisplayName} ✅`
                              : item.borrowInfo.availableExchanges.length > 0
                              ? `Доступен на ${item.borrowInfo.availableExchanges.join(', ')} 🟡`
                              : 'Недоступен на споте ❌'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center text-[10px] font-mono">
                          <div className={`py-1 px-1 rounded border ${
                            item.borrowInfo.details.binance
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-bold'
                              : 'bg-slate-950 border-slate-800 text-slate-500'
                          }`}>
                            Binance: {item.borrowInfo.details.binance ? 'ДА ✅' : 'НЕТ ❌'}
                          </div>
                          <div className={`py-1 px-1 rounded border ${
                            item.borrowInfo.details.gateio
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-bold'
                              : 'bg-slate-950 border-slate-800 text-slate-500'
                          }`}>
                            Gate.io: {item.borrowInfo.details.gateio ? 'ДА ✅' : 'НЕТ ❌'}
                          </div>
                          <div className={`py-1 px-1 rounded border ${
                            item.borrowInfo.details.bybit
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-bold'
                              : 'bg-slate-950 border-slate-800 text-slate-500'
                          }`}>
                            Bybit: {item.borrowInfo.details.bybit ? 'ДА ✅' : 'НЕТ ❌'}
                          </div>
                          <div className={`py-1 px-1 rounded border ${
                            item.borrowInfo.details.okx
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-bold'
                              : 'bg-slate-950 border-slate-800 text-slate-500'
                          }`}>
                            OKX: {item.borrowInfo.details.okx ? 'ДА ✅' : 'НЕТ ❌'}
                          </div>
                        </div>
                        {item.borrowInfo.isNoSpotMarginExchange && (
                          <div className="text-[10px] text-slate-400 italic">
                            * {item.squeezedDisplayName} не поддерживает спотовый заем (деривативы). Займите токен на другой бирже ({item.borrowInfo.availableExchanges.join(', ') || 'нет пула'}) или используйте Схему 2 (Кросс-Перп).
                          </div>
                        )}
                      </div>
                    )}

                    <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                      <li>
                        Перейди в раздел <strong>Cross Margin</strong> на бирже {item.squeezedDisplayName}.
                      </li>
                      <li>
                        Возьми токен <strong>${item.symbol}</strong> в займ (Borrow) под залог USDT.
                      </li>
                      <li>
                        Продай взятые токены по рынку на споте (получишь USDT обратно).
                      </li>
                      <li>
                        На фьючерсах ({item.squeezedDisplayName} Futures) открой позицию <strong>Long Perp</strong> на то же количество токенов.
                      </li>
                      <li>
                        Каждые {item.intervalHours}ч собирай выплату фандинга. При схлопывании сквиза закрой обе ноги одновременно.
                      </li>
                    </ol>
                  </div>

                  {/* Scheme B: Cross-Exchange Arb */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-[10px] font-bold">
                        B
                      </span>
                      <span>Схема 2: Кросс-биржа (Long + Short)</span>
                    </div>
                    {item.strategies.crossExchange ? (
                      <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                        <li>
                          Открой <strong>Long Perp</strong> на бирже <strong>{item.squeezedDisplayName}</strong> (получаешь {Math.abs(item.ratePerPeriodPercent)}% за период).
                        </li>
                        <li>
                          Открой <strong>Short Perp</strong> на бирже <strong>{item.strategies.crossExchange.shortDisplayName}</strong> (ставка: {item.strategies.crossExchange.hedgeRatePerPeriod}%).
                        </li>
                        <li>
                          Дельта полностью закрыта (Long = Short). Твой чистый спред: <strong>+{item.strategies.crossExchange.netDailySpread}% в сутки</strong>!
                        </li>
                        <li>
                          Следи за маржинальным балансом на обеих биржах, чтобы не словить ликвидацию при сильном пампе.
                        </li>
                      </ol>
                    ) : (
                      <div className="text-xs text-slate-400 py-3">
                        Для данной монеты нет второй биржи со стабильной ставкой. Рекомендуется использовать Схему 1 (Спот-Маржа).
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: All Exchanges Comparison */}
              {activeTab === 'exchanges' && (
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
                  <div className="text-xs font-bold text-slate-300">
                    Ставки фандинга по всем биржам для {item.symbol}:
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 pt-1">
                    {item.allExchangeRates?.map((ex) => (
                      <div
                        key={ex.exchange}
                        className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between ${
                          ex.isSqueezed
                            ? 'bg-rose-950/40 border-rose-500/50 shadow-sm shadow-rose-500/20'
                            : ex.isHedge
                            ? 'bg-cyan-950/40 border-cyan-500/40'
                            : 'bg-slate-900/60 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-white capitalize truncate">
                            {ex.displayName}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {ex.intervalHours}ч
                          </span>
                        </div>
                        <div className="mt-1 flex items-baseline justify-between">
                          <span
                            className={`font-mono font-bold ${
                              ex.ratePercent < 0 ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                          >
                            {ex.ratePercent >= 0 ? `+${ex.ratePercent}%` : `${ex.ratePercent}%`}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {ex.rateApy}%
                          </span>
                        </div>
                        {ex.isSqueezed && (
                          <div className="text-[9px] text-rose-300 font-bold uppercase tracking-wider mt-1 text-center bg-rose-500/20 rounded py-0.5">
                            Вход Long 🔥
                          </div>
                        )}
                        {ex.isHedge && (
                          <div className="text-[9px] text-cyan-300 font-bold uppercase tracking-wider mt-1 text-center bg-cyan-500/20 rounded py-0.5">
                            Хедж Short 🛡️
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
}
