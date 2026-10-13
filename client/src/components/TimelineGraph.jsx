import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  Calendar,
  ExternalLink,
  Layers,
  Activity,
} from 'lucide-react';
import { getExchangeLinkInfo } from '../utils/exchangeUrls';

export default function TimelineGraph({
  symbol,
  activeItem,
  chartData,
  timeframe,
  viewMode,
  onChangeViewMode,
  longDisplayName,
  shortDisplayName,
}) {
  return (
    <div className="space-y-4">
      {/* Chart Header with Mode Switcher & Dynamic Legend */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 text-xs pt-2 border-t border-slate-800/80">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-slate-300 font-medium">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span>
              Динамика фандинга за {activeItem.totalDays || (timeframe === '15d' ? 15 : 30)} дн. (
              {new Date(activeItem.startDate).toLocaleDateString()} — {new Date(activeItem.endDate).toLocaleDateString()}, {activeItem.dataPoints} точек)
            </span>
          </div>

          {(() => {
            const tokenParam = activeItem.contractSymbol || symbol;
            return (
              <a
                href={`https://loris.tools/backtester?token=${encodeURIComponent(tokenParam)}&longToken=${encodeURIComponent(tokenParam)}&shortToken=${encodeURIComponent(tokenParam)}&exchange1=${encodeURIComponent(activeItem.longExchange)}&exchange2=${encodeURIComponent(activeItem.shortExchange)}&timeframe=${timeframe}&unit=APY&position=2000&execution=10`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold transition-all hover:scale-[1.02] shadow-sm"
                title={`Открыть эту связку в бэктестере на loris.tools с APY за ${timeframe === '15d' ? '15 дней' : '30 дней'}`}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Бэктест на Loris ({timeframe} APY)</span>
              </a>
            );
          })()}

          {activeItem.isForex && (
            <div className="flex items-center gap-2 flex-wrap">
              {activeItem.sources?.hasDirect ? (
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-semibold shadow-sm cursor-help"
                  title={`Прямое официальное подключение к CEX: ${[activeItem.sources.long.isDirect ? activeItem.sources.long.sourceName : null, activeItem.sources.short.isDirect ? activeItem.sources.short.sourceName : null].filter(Boolean).join(', ')}`}
                >
                  ⚡ Direct CEX API
                </span>
              ) : (
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[11px] font-semibold shadow-sm cursor-help"
                  title="Данные получены через стандартный агрегированный поток Loris.tools"
                >
                  🌐 Loris Feed
                </span>
              )}

              {activeItem.isWeekendClose && (
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-medium shadow-sm cursor-help"
                  title="Пятничные торги на форексе завершены, ставки зафиксированы до воскресенья 21:00 UTC"
                >
                  ⏸ Рынок закрыт на выходные (до вс. 21:00 UTC)
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Display Mode Switcher */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-xl border border-slate-800 text-[11px]">
            <button
              type="button"
              onClick={() => onChangeViewMode('full')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
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
              onClick={() => onChangeViewMode('delta')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                viewMode === 'delta'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3 h-3" />
              <span>Только дельта по фандингу</span>
            </button>
          </div>

          {/* Dynamic Legend with Exchange Links */}
          <div className="flex items-center gap-3 text-xs text-slate-400">
            {viewMode === 'delta' ? (
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                Дельта по фандингу (Спред APY %)
              </span>
            ) : (
              <>
                {(() => {
                  const longLink = getExchangeLinkInfo(activeItem.longExchange, symbol);
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
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
                      <span>Long ({longDisplayName})</span>
                    </span>
                  );
                })()}

                {(() => {
                  const shortLink = getExchangeLinkInfo(activeItem.shortExchange, symbol);
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
                    <span className="flex items-center gap-1.5 text-slate-300">
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

      {/* Recharts Chart Area */}
      <div className="h-64 sm:h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient
                id={`spreadGrad-${activeItem.symbol}-${activeItem.longExchange}-${activeItem.shortExchange}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
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
                  const spreadVal =
                    payload.find((p) => p.dataKey === 'spreadApy')?.value ?? payload[0]?.value;
                  const shortVal = payload.find((p) => p.dataKey === 'shortRateApy')?.value;
                  const longVal = payload.find((p) => p.dataKey === 'longRateApy')?.value;

                  const itemData = payload[0]?.payload;
                  const displayDate = itemData?.fullDate || label;

                  return (
                    <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-xl shadow-xl text-xs space-y-1">
                      <div className="font-semibold text-slate-200 border-b border-slate-800 pb-1">
                        {displayDate}
                      </div>
                      {viewMode === 'delta' ? (
                        <div className="flex items-center justify-between gap-4 text-emerald-400 font-bold">
                          <span>Дельта фандинга (Спред):</span>
                          <span>{spreadVal}%</span>
                        </div>
                      ) : (
                        <>
                          {shortVal !== undefined && (
                            <div className="flex items-center justify-between gap-4 text-amber-300 font-medium">
                              <span>Short {shortDisplayName}:</span>
                              <span>{shortVal}%</span>
                            </div>
                          )}
                          {longVal !== undefined && (
                            <div className="flex items-center justify-between gap-4 text-indigo-300 font-medium">
                              <span>Long {longDisplayName}:</span>
                              <span>{longVal}%</span>
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
