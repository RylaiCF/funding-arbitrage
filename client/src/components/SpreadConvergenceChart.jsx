import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Loader2,
} from 'lucide-react';

const TIMEFRAMES = [
  { id: '24h', label: '24ч', hours: 24, interval: '24H', step: '3600' },
  { id: '48h', label: '48ч', hours: 48, interval: '48H', step: '3600' },
  { id: '72h', label: '72ч', hours: 72, interval: '72H', step: '3600' },
  { id: '7d', label: '7д', hours: 168, interval: '7D', step: '3600' },
  { id: '30d', label: '30д', hours: 720, interval: '30D', step: '14400' }
];

export default function SpreadConvergenceChart({ opportunity }) {
  const [historyData, setHistoryData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTf, setSelectedTf] = useState('72h'); // 72 hours default

  const currentTf = TIMEFRAMES.find(t => t.id === selectedTf) || TIMEFRAMES[2];

  useEffect(() => {
    let isMounted = true;

    const fetchHistory = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const tf = TIMEFRAMES.find(t => t.id === selectedTf) || TIMEFRAMES[2];
        const q = new URLSearchParams({
          symbol: opportunity.canonicalSymbol?.split('/')[0] || opportunity.symbol || '',
          longExchange: opportunity.long.exchange,
          longMarketType: opportunity.long.marketType,
          longSymbol: opportunity.canonicalSymbol?.split('/')[0] || opportunity.symbol,
          longNativeSymbol: opportunity.long.nativeSymbol || '',
          longExchangeSymbol: opportunity.long.exchangeSymbol || opportunity.long.nativeSymbol || '',
          longInstrumentId: opportunity.long.instrumentId ? String(opportunity.long.instrumentId) : '',
          longAskPrice: String(opportunity.long.askPrice),
          shortExchange: opportunity.short.exchange,
          shortMarketType: opportunity.short.marketType,
          shortSymbol: opportunity.canonicalSymbol?.split('/')[0] || opportunity.symbol,
          shortNativeSymbol: opportunity.short.nativeSymbol || '',
          shortExchangeSymbol: opportunity.short.exchangeSymbol || opportunity.short.nativeSymbol || '',
          shortInstrumentId: opportunity.short.instrumentId ? String(opportunity.short.instrumentId) : '',
          shortBidPrice: String(opportunity.short.bidPrice),
          currentSpread: String(opportunity.spreads.grossEntrySpread),
          limit: String(tf.hours),
          interval: tf.interval,
          step: tf.step
        });

        const res = await fetch(`/api/spread/history?${q.toString()}`);
        const data = await res.json();

        if (isMounted) {
          if (data && data.history) {
            setHistoryData(data.history);
          } else {
            setError(data?.error || 'Не удалось загрузить историю цен');
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchHistory();

    return () => {
      isMounted = false;
    };
  }, [opportunity, selectedTf]);

  if (isLoading) {
    return (
      <div className="p-8 bg-slate-900 border border-slate-800 rounded-xl flex flex-col items-center justify-center text-center">
        <Loader2 className="w-6 h-6 animate-spin text-violet-400 mb-2" />
        <span className="text-xs text-slate-400">Сбор свечей и построение графика схождения спреда...</span>
      </div>
    );
  }

  if (error || !historyData) {
    return (
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl text-center text-xs text-slate-400">
        <AlertTriangle className="w-5 h-5 text-amber-400 mx-auto mb-2" />
        <span>{error || 'Не удалось загрузить данные схождения'}</span>
      </div>
    );
  }

  // Case A: Real convergence history unavailable (e.g. WEEX or DEX without public candles)
  if (!historyData.hasRealHistory || !historyData.timeline || historyData.timeline.length === 0) {
    const missingExchanges = historyData.unavailableExchanges || [];
    const singleLeg = historyData.singleLeg;

    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
        {/* Warning & Transparency Notice */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                История схождения спреда недоступна
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/30">
                Нет публичных свечей
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Площадка {missingExchanges.map(e => e.toUpperCase()).join(', ') || 'одна из бирж'} не отдает открытый REST API для свечей (kline). Искусственная генерация синусоиды отключена во избежание ложных выводов.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-violet-500/10 text-violet-300 border border-violet-500/30">
              Стакан сейчас: +{opportunity.spreads.grossEntrySpread}%
            </span>
          </div>
        </div>

        {/* If one exchange has real candles, show its price chart as a reference */}
        {singleLeg && singleLeg.points && singleLeg.points.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 font-medium text-slate-300">
                <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                Динамика цены на {singleLeg.exchange.toUpperCase()} ({opportunity.canonicalSymbol}) за {currentTf.label}:
              </span>
              <span className="text-[11px] text-slate-400">Ориентир волатильности монеты</span>
            </div>

            <div className="h-44 sm:h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={singleLeg.points} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} axisLine={{ stroke: '#334155' }} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={{ stroke: '#334155' }} domain={['auto', 'auto']} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-lg shadow-xl text-xs space-y-1">
                            <div className="text-[11px] text-slate-400">{d.time}</div>
                            <div className="flex justify-between gap-3">
                              <span className="text-cyan-400">{singleLeg.exchange.toUpperCase()}:</span>
                              <strong className="text-white font-mono">${d.price}</strong>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line type="monotone" dataKey="price" stroke="#06b6d4" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-950/60 border border-slate-800/80 rounded-lg text-xs text-slate-400 space-y-1.5">
            <div className="text-slate-300 font-medium">Почему график не отображается?</div>
            <div>
              Для редких или недавно залистенных монет на площадках вроде WEEX или DEX открытая история минутных/часовых свечей не предоставляется через публичный REST API.
            </div>
            <div className="text-amber-300/90 text-[11px]">
              Рекомендация: Для подтвержденной истории схождения выбирайте связки между биржами Tier-1 (Binance, Bybit, OKX, Bitget, Gate, MEXC, BingX, KuCoin).
            </div>
          </div>
        )}
      </div>
    );
  }

  // Case B: Real synchronized convergence history available
  const {
    meanSpread,
    minSpread,
    maxSpread,
    stdDev,
    zeroCrossings,
    convergenceLabel,
    convergenceGrade,
    convergenceDescription,
    timeline
  } = historyData;

  const isSafe = convergenceGrade === 'A';
  const isModerate = convergenceGrade === 'B';

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
      {/* Chart Header with Convergence Assessment */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-violet-400" />
              График схождения спреда на истории (Mean-Reversion)
            </h4>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isSafe
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : isModerate
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}
            >
              {convergenceLabel}
            </span>
            <span className="hidden sm:inline-flex text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {historyData.sourceLabel || 'Apparatura Engine'} • {opportunity.long.exchange}/{opportunity.short.exchange}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {convergenceDescription}
          </p>
        </div>

        {/* Timeframe buttons */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 shrink-0">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.id}
              onClick={() => setSelectedTf(tf.id)}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                selectedTf === tf.id
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        <div className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-lg">
          <span className="text-[10px] text-slate-400 block">Пересечений 0% (Схождений)</span>
          <span className="text-sm font-bold font-mono text-emerald-400">
            {zeroCrossings} раз
          </span>
        </div>
        <div className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-lg">
          <span className="text-[10px] text-slate-400 block">Средний спред (μ)</span>
          <span className="text-sm font-bold font-mono text-amber-300">
            {meanSpread > 0 ? `+${meanSpread}%` : `${meanSpread}%`}
          </span>
        </div>
        <div className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-lg">
          <span className="text-[10px] text-slate-400 block">Волатильность спреда (σ)</span>
          <span className="text-sm font-bold font-mono text-violet-300">
            ±{stdDev}%
          </span>
        </div>
        <div className="p-2.5 bg-slate-950/70 border border-slate-800/80 rounded-lg">
          <span className="text-[10px] text-slate-400 block">Диапазон мин / макс</span>
          <span className="text-sm font-bold font-mono text-slate-200">
            {minSpread.toFixed(2)}% ... +{maxSpread.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Recharts Area / Line Chart */}
      <div className="h-56 sm:h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={timeline} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="spreadAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />

            <XAxis
              dataKey="time"
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

            {/* Zero convergence line */}
            <ReferenceLine
              y={0}
              stroke="#10b981"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: '0.00% Схождение',
                position: 'insideBottomRight',
                fill: '#10b981',
                fontSize: 10
              }}
            />

            {/* Mean spread line */}
            <ReferenceLine
              y={meanSpread}
              stroke="#f59e0b"
              strokeDasharray="2 2"
              label={{
                value: `μ: ${meanSpread}%`,
                position: 'insideTopLeft',
                fill: '#f59e0b',
                fontSize: 10
              }}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1.5 min-w-[200px]">
                      <div className="text-[11px] text-slate-400 font-medium border-b border-slate-800 pb-1">{data.time}</div>
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-400">Входной спред:</span>
                        <strong className="text-violet-300 font-mono">
                          {data.spreadPct > 0 ? `+${data.spreadPct}%` : `${data.spreadPct}%`}
                        </strong>
                      </div>
                      {data.exitSpread !== undefined && data.exitSpread !== data.spreadPct && (
                        <div className="flex justify-between gap-4 text-[11px]">
                          <span className="text-slate-400">Выходной спред:</span>
                          <span className="text-indigo-300 font-mono">
                            {data.exitSpread > 0 ? `+${data.exitSpread}%` : `${data.exitSpread}%`}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between gap-4 text-[11px]">
                        <span className="text-emerald-400">Long ({opportunity.long.exchange}):</span>
                        <span className="text-white font-mono">${data.longPrice}</span>
                      </div>
                      <div className="flex justify-between gap-4 text-[11px]">
                        <span className="text-rose-400">Short ({opportunity.short.exchange}):</span>
                        <span className="text-white font-mono">${data.shortPrice}</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            <Area
              type="monotone"
              dataKey="spreadPct"
              fill="url(#spreadAreaGradient)"
              stroke="none"
            />

            <Line
              type="monotone"
              dataKey="spreadPct"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: '#a78bfa', strokeWidth: 2, fill: '#1e1b4b' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Mean-Reversion Explanation Footer */}
      <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-[11px] text-slate-400 flex items-start gap-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-200">Правило безопасности арбитражера:</strong>
          <span>
            {' '}Открывайте позиции только тогда, когда спред находится на историческом пике (выше среднего μ) и регулярно сходится к зеленой нулевой линии (0.00%). Если спред однонаправленно расширяется без возвратов к нулю — это признак делистинга или остановки ввода/вывода на одной из бирж.
          </span>
        </div>
      </div>
    </div>
  );
}
