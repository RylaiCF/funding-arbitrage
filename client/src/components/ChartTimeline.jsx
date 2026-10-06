import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { Calendar, BarChart2, ShieldAlert, Award, ArrowUpRight, ArrowDownRight, Layers, Activity, ExternalLink, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { getExchangeLinkInfo } from '../utils/exchangeUrls';
import RiskBadge from './RiskBadge';
import { getBreakEven, getTrend } from '../utils/metricsHelper';

export default function ChartTimeline({ item, exchangeNameMap = {}, timeframe = '30d', volatilityData = null }) {
  const [viewMode, setViewMode] = useState('full'); // 'full' = Проценты Long/Short (default), 'delta' = Только дельта
  const [selectedPairIndex, setSelectedPairIndex] = useState(0);

  // Reset selected pair index if coin symbol changes
  useEffect(() => {
    setSelectedPairIndex(0);
  }, [item?.symbol]);

  const pairs = item?.allPairs && item.allPairs.length > 0 ? item.allPairs : [item];
  const activeItem = pairs[selectedPairIndex] || item;

  if (!activeItem || !activeItem.timeline || activeItem.timeline.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-slate-500">
        Нет исторических данных для построения графика
      </div>
    );
  }

  const longDisplayName = exchangeNameMap[activeItem.longExchange] || activeItem.longExchange;
  const shortDisplayName = exchangeNameMap[activeItem.shortExchange] || activeItem.shortExchange;

  // Format data for Recharts
  const chartData = activeItem.timeline.map((pt) => ({
    date: new Date(pt.timestamp).toLocaleDateString([], { month: 'numeric', day: 'numeric', hour: '2-digit' }),
    spreadApy: pt.spreadApy,
    longRateApy: pt.rateLongApy,
    shortRateApy: pt.rateShortApy,
    spreadBps: pt.spreadBps,
  }));

  const hasHighSpike = activeItem.maxSpikeApy > (activeItem.metrics?.trimmed?.trimmedMeanApy || 0) * 2.5;
  const activeBreakEven = getBreakEven(activeItem);
  const activeTrend = getTrend(activeItem);

  return (
    <div className="bg-slate-950/80 p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-5">
      {/* Alternative Pairs Selector Strip */}
      {pairs.length > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-300">
              Прибыльные связки для {item.symbol}:
            </span>
            <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              {pairs.length} связок
            </span>
            <RiskBadge item={activeItem} volatilityData={volatilityData} />
            <div
              className={`font-mono font-bold text-xs px-2 py-0.5 rounded-lg border inline-flex items-center gap-1 shadow-sm ${
                activeBreakEven.status === 'fast'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : activeBreakEven.status === 'normal'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
              title={`Время окупаемости комиссий: ${activeBreakEven.text} (round-trip ~0.18%)`}
            >
              <Clock className="w-3 h-3 shrink-0" />
              <span>{activeBreakEven.text}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {pairs.map((p, pIdx) => {
              const isSelected = pIdx === selectedPairIndex;
              const lName = exchangeNameMap[p.longExchange] || p.longExchange;
              const sName = exchangeNameMap[p.shortExchange] || p.shortExchange;
              const apy = p.metrics?.trimmed?.trimmedMeanApy ?? p.currentSpreadApy;
              const pBreakEven = getBreakEven(p);

              return (
                <button
                  key={`${p.longExchange}-${p.shortExchange}`}
                  type="button"
                  onClick={() => setSelectedPairIndex(pIdx)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {pIdx === 0 && (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1 py-0.2 rounded border border-amber-400/20">
                      ТОП 1
                    </span>
                  )}
                  <span className="capitalize">{lName}</span>
                  <span className="text-slate-500 text-[10px]">➔</span>
                  <span className="capitalize">{sName}</span>
                  <span className={`font-mono font-bold ml-0.5 ${isSelected ? 'text-emerald-300' : 'text-slate-400'}`}>
                    +{apy}%
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    • {pBreakEven.text}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
          <div className="text-[11px] text-slate-400 font-medium">Очищенный APY</div>
          <div className="text-base font-bold text-emerald-400 mt-0.5">
            +{activeItem.metrics?.trimmed?.trimmedMeanApy || 0}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Без 5% спайков</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
          <div className="text-[11px] text-slate-400 font-medium">Медианный APY</div>
          <div className="text-base font-bold text-teal-400 mt-0.5">
            +{activeItem.metrics?.median?.medianApy || 0}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">50-й перцентиль</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
          <div className="text-[11px] text-slate-400 font-medium">Шарп фандинга</div>
          <div className="text-base font-bold text-cyan-400 mt-0.5">
            {activeItem.metrics?.sharpe?.sharpeRatio || 0}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Волатильность: ±{activeItem.metrics?.sharpe?.volatilityStdDev || 0}%</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
          <div className="text-[11px] text-slate-400 font-medium">Вин-Рейт (Часы/Дни)</div>
          <div className="text-base font-bold text-slate-200 mt-0.5">
            {activeItem.winRateHoursPercent}% / {activeItem.dailyWinRatePercent}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{activeItem.profitableDays} из {activeItem.totalDays} дней в плюс</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
          <div className="text-[11px] text-slate-400 font-medium">Неочищенный средний</div>
          <div className="text-base font-bold text-slate-300 mt-0.5">
            {activeItem.rawMeanApy}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">С учетом выбросов</div>
        </div>

        <div className={`p-2.5 rounded-xl border ${hasHighSpike ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-900/80 border-slate-800'}`}>
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
            <span>Макс. Спайк</span>
            {hasHighSpike && <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />}
          </div>
          <div className={`text-base font-bold mt-0.5 ${hasHighSpike ? 'text-amber-400' : 'text-slate-300'}`}>
            +{activeItem.maxSpikeApy}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {hasHighSpike ? 'Выброс нейтрализован' : 'Без аномалий'}
          </div>
        </div>

        <div className={`p-2.5 rounded-xl border ${
          activeBreakEven.status === 'fast'
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : activeBreakEven.status === 'normal'
            ? 'bg-amber-500/10 border-amber-500/30'
            : 'bg-rose-500/10 border-rose-500/30'
        }`}>
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
            <span>Окупаемость</span>
            <Clock className={`w-3.5 h-3.5 ${
              activeBreakEven.status === 'fast' ? 'text-emerald-400' : activeBreakEven.status === 'normal' ? 'text-amber-400' : 'text-rose-400'
            }`} />
          </div>
          <div className={`text-base font-bold mt-0.5 ${
            activeBreakEven.status === 'fast' ? 'text-emerald-300' : activeBreakEven.status === 'normal' ? 'text-amber-300' : 'text-rose-300'
          }`}>
            {activeBreakEven.text}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Round-trip ~0.18%</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-400">
            <span>Тренд фандинга</span>
            {activeTrend.direction === 'expanding' && <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />}
            {activeTrend.direction === 'decaying' && <TrendingDown className="w-3.5 h-3.5 text-rose-400" />}
          </div>
          <div className={`text-base font-bold mt-0.5 ${
            activeTrend.spread24hApy >= 0 ? 'text-slate-200' : 'text-rose-400'
          }`}>
            {activeTrend.spread24hApy >= 0 ? `+${activeTrend.spread24hApy}%` : `${activeTrend.spread24hApy}%`}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            7д: {activeTrend.spread7dApy >= 0 ? `+${activeTrend.spread7dApy}%` : `${activeTrend.spread7dApy}%`} ({activeTrend.label})
          </div>
        </div>
      </div>

      {/* Chart Header with Mode Switcher & Legend */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 text-xs pt-2 border-t border-slate-800/80">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-slate-300 font-medium">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span>Динамика фандинга за {activeItem.totalDays || (timeframe === '15d' ? 15 : 30)} дн. ({new Date(activeItem.startDate).toLocaleDateString()} — {new Date(activeItem.endDate).toLocaleDateString()}, {activeItem.dataPoints} точек)</span>
          </div>

          <a
            href={`https://loris.tools/backtester?token=${encodeURIComponent(item.symbol)}&longToken=${encodeURIComponent(item.symbol)}&shortToken=${encodeURIComponent(item.symbol)}&exchange1=${encodeURIComponent(activeItem.longExchange)}&exchange2=${encodeURIComponent(activeItem.shortExchange)}&timeframe=${timeframe}&unit=APY&position=2000&execution=10`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold transition-all hover:scale-[1.02] shadow-sm"
            title={`Открыть эту связку в бэктестере на loris.tools с APY за ${timeframe === '15d' ? '15 дней' : '30 дней'}`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Бэктест на Loris ({timeframe} APY)</span>
          </a>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Display Mode Switcher */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-800 text-[11px]">
            <button
              type="button"
              onClick={() => setViewMode('full')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all ${
                viewMode === 'full'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Проценты Long / Short</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('delta')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all ${
                viewMode === 'delta'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3 h-3" />
              <span>Только дельта по фандингу</span>
            </button>
          </div>

          {/* Dynamic Legend */}
          <div className="flex items-center gap-3 text-xs text-slate-400">
            {viewMode === 'delta' ? (
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                Дельта по фандингу (Спред APY %)
              </span>
            ) : (
              <>
                {(() => {
                  const longLink = getExchangeLinkInfo(activeItem.longExchange, item.symbol);
                  return longLink ? (
                    <a
                      href={longLink.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-slate-300 hover:text-indigo-300 transition-colors group cursor-pointer"
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
                      <span>Long ({longDisplayName})</span>
                      {longLink.isDirectInstrument && (
                        <ExternalLink className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                      )}
                    </a>
                  ) : (
                    <span
                      className="flex items-center gap-1.5 text-slate-300"
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
                      <span>Long ({longDisplayName})</span>
                    </span>
                  );
                })()}

                {(() => {
                  const shortLink = getExchangeLinkInfo(activeItem.shortExchange, item.symbol);
                  return shortLink ? (
                    <a
                      href={shortLink.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-slate-300 hover:text-amber-300 transition-colors group cursor-pointer"
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                      <span>Short ({shortDisplayName})</span>
                      {shortLink.isDirectInstrument && (
                        <ExternalLink className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                      )}
                    </a>
                  ) : (
                    <span
                      className="flex items-center gap-1.5 text-slate-300"
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                      <span>Short ({shortDisplayName})</span>
                    </span>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Recharts Container */}
      <div className="h-64 sm:h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`spreadGrad-${activeItem.symbol}-${activeItem.longExchange}-${activeItem.shortExchange}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const spreadVal = payload.find(p => p.dataKey === 'spreadApy')?.value ?? payload[0]?.value;
                  const shortVal = payload.find(p => p.dataKey === 'shortRateApy')?.value;
                  const longVal = payload.find(p => p.dataKey === 'longRateApy')?.value;

                  return (
                    <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl shadow-xl text-xs space-y-1">
                      <div className="font-semibold text-slate-200 border-b border-slate-800 pb-1">{label}</div>
                      {viewMode === 'delta' ? (
                        <div className="flex items-center justify-between gap-4 text-emerald-400 font-bold">
                          <span>Дельта фандинга (Спред):</span>
                          <span>{spreadVal}%</span>
                        </div>
                      ) : (
                        <>
                          {longVal !== undefined && (
                            <div className="flex items-center justify-between gap-4 text-indigo-300 font-medium">
                              <span>Long {longDisplayName}:</span>
                              <span>{longVal}%</span>
                            </div>
                          )}
                          {shortVal !== undefined && (
                            <div className="flex items-center justify-between gap-4 text-amber-300 font-medium">
                              <span>Short {shortDisplayName}:</span>
                              <span>{shortVal}%</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine y={0} stroke="#475569" strokeDasharray="2 2" />
            {viewMode === 'delta' ? (
              <Area
                type="monotone"
                dataKey="spreadApy"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill={`url(#spreadGrad-${activeItem.symbol}-${activeItem.longExchange}-${activeItem.shortExchange})`}
                name="Дельта по фандингу"
              />
            ) : (
              <>
                <Line
                  type="monotone"
                  dataKey="longRateApy"
                  stroke="#818cf8"
                  strokeWidth={2}
                  dot={false}
                  name={`Long ${longDisplayName}`}
                />
                <Line
                  type="monotone"
                  dataKey="shortRateApy"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  name={`Short ${shortDisplayName}`}
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
