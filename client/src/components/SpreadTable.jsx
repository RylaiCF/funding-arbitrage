import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  DollarSign,
  TrendingUp,
  Layers,
  Info,
  CheckCircle2,
  AlertTriangle,
  Scale,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import SpreadConvergenceChart from './SpreadConvergenceChart';

function formatFee(fee) {
  if (fee == null || isNaN(fee)) return '0.00%';
  const num = Number(fee);
  const s = num.toFixed(3);
  return s.endsWith('0') ? `${num.toFixed(2)}%` : `${s}%`;
}

export default function SpreadTable({
  opportunities = [],
  isLoading = false,
  _isScanning = false,
  depositSize = 1000,
  searchQuery = '',
  onResetFilters = () => {},
}) {
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [sortKey, setSortKey] = useState('grade'); // Default sort by evaluation/grade
  const [sortDirection, setSortDirection] = useState('desc'); // 'desc' | 'asc'

  const toggleRow = (id) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const renderSortIcon = (key) => {
    if (sortKey !== key) {
      return <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-40 group-hover:opacity-100" />;
    }
    return sortDirection === 'desc' ? (
      <ArrowDown className="w-3 h-3 text-violet-400 font-bold" />
    ) : (
      <ArrowUp className="w-3 h-3 text-violet-400 font-bold" />
    );
  };

  const sortedOpportunities = useMemo(() => {
    if (!opportunities || opportunities.length === 0) return [];

    return [...opportunities].sort((a, b) => {
      let comparison = 0;

      if (sortKey === 'grade') {
        const gradeRank = { A: 3, B: 2, C: 1 };
        const rankA = gradeRank[a.grade] || 0;
        const rankB = gradeRank[b.grade] || 0;
        comparison = rankA - rankB;

        // Secondary sort: riskScore descending
        if (comparison === 0) {
          comparison = (a.riskScore || 0) - (b.riskScore || 0);
        }
        // Tertiary sort: netSpread descending
        if (comparison === 0) {
          comparison = (a.spreads?.netSpread || 0) - (b.spreads?.netSpread || 0);
        }
      } else if (sortKey === 'netSpread') {
        comparison = (a.spreads?.netSpread || 0) - (b.spreads?.netSpread || 0);
      } else if (sortKey === 'grossSpread') {
        comparison = (a.spreads?.grossEntrySpread || 0) - (b.spreads?.grossEntrySpread || 0);
      } else if (sortKey === 'profit') {
        comparison = (a.estProfitUSD || 0) - (b.estProfitUSD || 0);
      } else if (sortKey === 'symbol') {
        comparison = (a.symbol || '').localeCompare(b.symbol || '');
      }

      return sortDirection === 'desc' ? -comparison : comparison;
    });
  }, [opportunities, sortKey, sortDirection]);

  const getSortDescription = () => {
    switch (sortKey) {
      case 'grade':
        return sortDirection === 'desc'
          ? 'Сортировка: Оценка риска (Grade A ➔ Grade B ➔ Grade C)'
          : 'Сортировка: Оценка риска (Grade C ➔ Grade B ➔ Grade A)';
      case 'netSpread':
        return sortDirection === 'desc'
          ? 'Сортировка: Чистый спред (по убыванию)'
          : 'Сортировка: Чистый спред (по возрастанию)';
      case 'profit':
        return sortDirection === 'desc'
          ? `Сортировка: Прибыль с $${depositSize} (по убыванию)`
          : `Сортировка: Прибыль с $${depositSize} (по возрастанию)`;
      case 'grossSpread':
        return sortDirection === 'desc'
          ? 'Сортировка: Грязный спред (по убыванию)'
          : 'Сортировка: Грязный спред (по возрастанию)';
      case 'symbol':
        return sortDirection === 'desc'
          ? 'Сортировка: Символ (Z ➔ A)'
          : 'Сортировка: Символ (A ➔ Z)';
      default:
        return 'Сортировка связок';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center shadow-xl">
        <div className="inline-block w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h3 className="text-base font-semibold text-white">Загрузка ценовых спредов...</h3>
        <p className="text-xs text-slate-400 mt-1">Опрос стаканов и нормализация межбиржевых связок</p>
      </div>
    );
  }

  if (opportunities.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center shadow-xl">
        <Scale className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <h3 className="text-base font-semibold text-white">Нет подходящих спредов по текущим фильтрам</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mt-2">
          {searchQuery
            ? `По запросу «${searchQuery}» ничего не найдено.`
            : 'Попробуйте снизить минимальный порог чистого спреда, объем ликвидности или переключить уровень риска на Grade A + B.'}
        </p>
        <button
          onClick={onResetFilters}
          className="mt-5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
        >
          Сбросить фильтры
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Table Header Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>Арбитражные ценовые связки</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-mono font-semibold border border-violet-500/30">
              {opportunities.length}
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {getSortDescription()}
          </p>
        </div>

        {/* Quick sort buttons */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <span className="text-[11px] text-slate-500 px-2 select-none">Сортировка:</span>
          <button
            type="button"
            onClick={() => handleSort('grade')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              sortKey === 'grade'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Сортировать по оценке риска (Grade A ➔ B ➔ C)"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Оценка</span>
            {renderSortIcon('grade')}
          </button>
          <button
            type="button"
            onClick={() => handleSort('netSpread')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              sortKey === 'netSpread'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Сортировать по чистому спреду"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Спред</span>
            {renderSortIcon('netSpread')}
          </button>
          <button
            type="button"
            onClick={() => handleSort('profit')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              sortKey === 'profit'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title={`Сортировать по расчетной прибыли с $${depositSize}`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Прибыль</span>
            {renderSortIcon('profit')}
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[10px] font-semibold border-b border-slate-800 select-none">
            <tr>
              <th
                onClick={() => handleSort('symbol')}
                className="py-3 px-4 cursor-pointer hover:text-white transition-colors group"
                title="Кликните для сортировки по символу"
              >
                <div className="flex items-center gap-1.5">
                  <span>Символ & Режим</span>
                  {renderSortIcon('symbol')}
                </div>
              </th>
              <th
                onClick={() => handleSort('grade')}
                className="py-3 px-3 cursor-pointer hover:text-white transition-colors group"
                title="Кликните для сортировки по оценке риска (Grade A ➔ B ➔ C)"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-violet-300">Оценка риска</span>
                  {renderSortIcon('grade')}
                </div>
              </th>
              <th className="py-3 px-4 text-emerald-400">Нога 1: Покупка (Ask)</th>
              <th className="py-3 px-4 text-rose-400">Нога 2: Продажа (Bid)</th>
              <th
                onClick={() => handleSort('grossSpread')}
                className="py-3 px-3 text-right cursor-pointer hover:text-white transition-colors group"
                title="Кликните для сортировки по грязному спреду"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Грязный спред</span>
                  {renderSortIcon('grossSpread')}
                </div>
              </th>
              <th className="py-3 px-3 text-right">Комиссии</th>
              <th
                onClick={() => handleSort('netSpread')}
                className="py-3 px-3 text-right font-bold text-violet-300 cursor-pointer hover:text-violet-100 transition-colors group"
                title="Кликните для сортировки по чистому спреду"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Чистый спред</span>
                  {renderSortIcon('netSpread')}
                </div>
              </th>
              <th
                onClick={() => handleSort('profit')}
                className="py-3 px-4 text-right font-bold text-cyan-300 cursor-pointer hover:text-cyan-100 transition-colors group"
                title={`Кликните для сортировки по прибыли с $${depositSize}`}
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Прибыль (${depositSize})</span>
                  {renderSortIcon('profit')}
                </div>
              </th>
              <th className="py-3 px-3 text-center">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {sortedOpportunities.map((opp) => {
              const isExpanded = expandedRowId === opp.id;
              const gradeColor =
                opp.grade === 'A'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : opp.grade === 'B'
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30';

              const gradeTitle =
                opp.grade === 'A'
                  ? 'Grade A: Низкий риск (Tier-1 биржи, высокий объем)'
                  : opp.grade === 'B'
                  ? 'Grade B: Умеренный риск (Хороший баланс спреда и объема)'
                  : 'Grade C: Повышенный риск (Меньше ликвидности)';

              const modeBadge =
                opp.strategyMode === 'spot-perp'
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                  : 'bg-violet-500/10 text-violet-300 border-violet-500/20';

              return (
                <React.Fragment key={opp.id}>
                  <tr
                    onClick={() => toggleRow(opp.id)}
                    className={`cursor-pointer transition-colors ${
                      isExpanded
                        ? 'bg-slate-800/60'
                        : 'hover:bg-slate-800/30 bg-slate-900/40'
                    }`}
                  >
                    {/* Symbol & Mode */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">
                          {opp.symbol}
                        </span>
                        <span
                          className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${modeBadge}`}
                          title={opp.strategyDesc || opp.strategyLabel}
                        >
                          {opp.strategyLabel || opp.strategyMode?.toUpperCase() || 'ARBITRAGE'}
                        </span>
                        {opp.alternatives && opp.alternatives.length > 0 && (
                          <span
                            className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/60 font-mono"
                            title={`Доступно еще ${opp.alternatives.length} альтернативных биржевых пар`}
                          >
                            +{opp.alternatives.length}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]">
                        {opp.canonicalSymbol}
                      </div>
                    </td>

                    {/* Risk Rating */}
                    <td className="py-3.5 px-3 whitespace-nowrap" title={gradeTitle}>
                      <div className="flex flex-col gap-1 items-start">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${gradeColor}`}
                        >
                          <ShieldCheck className="w-3 h-3" />
                          <span>Grade {opp.grade}</span>
                        </span>
                        <div className="flex flex-wrap gap-1 max-w-[140px]">
                          {opp.riskBadges?.slice(0, 2).map((b, idx) => (
                            <span
                              key={idx}
                              className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700/60"
                            >
                              {b.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>

                    {/* Long Venue */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {opp.long.url ? (
                          <a
                            href={opp.long.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="font-bold uppercase text-slate-200 text-xs hover:text-emerald-400 hover:underline flex items-center gap-1 group"
                            title={`Открыть терминал ${opp.long.exchange.toUpperCase()} (${opp.long.marketType})`}
                          >
                            <span>{opp.long.exchange}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                          </a>
                        ) : (
                          <span className="font-bold uppercase text-slate-200 text-xs">
                            {opp.long.exchange}
                          </span>
                        )}
                        <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-400 font-mono">
                          {opp.long.marketType}
                        </span>
                      </div>
                      <div className="text-white font-mono font-semibold text-xs mt-0.5">
                        ${opp.long.askPrice < 0.01 ? opp.long.askPrice.toFixed(6) : opp.long.askPrice.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Vol: ${(opp.long.volume24h / 1000).toFixed(0)}k
                      </div>
                    </td>

                    {/* Short Venue */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {opp.short.url ? (
                          <a
                            href={opp.short.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="font-bold uppercase text-slate-200 text-xs hover:text-rose-400 hover:underline flex items-center gap-1 group"
                            title={`Открыть терминал ${opp.short.exchange.toUpperCase()} (${opp.short.marketType})`}
                          >
                            <span>{opp.short.exchange}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                          </a>
                        ) : (
                          <span className="font-bold uppercase text-slate-200 text-xs">
                            {opp.short.exchange}
                          </span>
                        )}
                        <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-rose-500/10 text-rose-400 font-mono">
                          {opp.short.marketType}
                        </span>
                      </div>
                      <div className="text-white font-mono font-semibold text-xs mt-0.5">
                        ${opp.short.bidPrice < 0.01 ? opp.short.bidPrice.toFixed(6) : opp.short.bidPrice.toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Vol: ${(opp.short.volume24h / 1000).toFixed(0)}k
                        {opp.short.openInterest > 0 && ` · OI: $${(opp.short.openInterest / 1000).toFixed(0)}k`}
                      </div>
                    </td>

                    {/* Gross Spread */}
                    <td className="py-3.5 px-3 whitespace-nowrap text-right font-mono">
                      <div className="text-slate-300 font-semibold">
                        +{opp.spreads.grossEntrySpread.toFixed(2)}%
                      </div>
                      <div className="text-[10px] text-slate-500">
                        B/A: {opp.spreads.baCost.toFixed(2)}%
                      </div>
                    </td>

                    {/* Total Taker Fees */}
                    <td className="py-3.5 px-3 whitespace-nowrap text-right font-mono text-slate-400">
                      <div>-{formatFee(opp.spreads.totalFees)}</div>
                      <div className="text-[10px] text-slate-500" title="Оценка комиссии за полный круг (вход + выход по тейкеру)">
                        круг: -{formatFee(opp.spreads.roundTripFees || opp.spreads.totalFees * 2)}
                      </div>
                    </td>

                    {/* Net Spread */}
                    <td className="py-3.5 px-3 whitespace-nowrap text-right font-mono">
                      <span className="inline-block text-sm font-extrabold text-violet-300 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-lg">
                        +{opp.spreads.netSpread.toFixed(2)}%
                      </span>
                      {opp.spreads.netRoundTripSpread != null && (
                        <div
                          className={`text-[10px] font-mono mt-0.5 ${
                            opp.spreads.netRoundTripSpread > 0 ? 'text-emerald-400/80' : 'text-slate-500'
                          }`}
                          title="Чистый спред за полный круг (вход + выход)"
                        >
                          круг: {opp.spreads.netRoundTripSpread > 0 ? '+' : ''}{opp.spreads.netRoundTripSpread.toFixed(2)}%
                        </div>
                      )}
                    </td>

                    {/* Est Profit */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-right font-mono">
                      <div className="text-sm font-extrabold text-cyan-300">
                        +${opp.estProfitUSD.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        на ${depositSize}
                      </div>
                    </td>

                    {/* Actions: Expand toggle */}
                    <td className="py-3.5 px-3 whitespace-nowrap text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRow(opp.id);
                        }}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title={isExpanded ? 'Скрыть детали' : 'Открыть детали связки'}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-violet-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <tr className="bg-slate-950/90 border-b border-slate-800">
                      <td colSpan={9} className="p-4 sm:p-6 space-y-6">
                        {/* 1. Interactive Historical Spread Convergence Chart */}
                        <SpreadConvergenceChart opportunity={opp} />

                        {/* 2. Execution, Math & Risk Audit */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* Col 1: Step-by-Step Execution Plan */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                              <ArrowRight className="w-3.5 h-3.5 text-violet-400" />
                              Пошаговое исполнение связки
                            </h4>
                            <div className="space-y-2 text-xs">
                              {/* Step 1 */}
                              <div className="p-3 bg-slate-900 border border-emerald-500/20 rounded-xl">
                                <div className="flex items-center justify-between text-emerald-400 font-semibold mb-1">
                                  <span>Шаг 1: ПОКУПКА (LONG)</span>
                                  <span className="uppercase text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                    {opp.long.marketType}
                                  </span>
                                </div>
                                <div className="text-slate-300">
                                  Биржа: <strong className="text-white uppercase">{opp.long.exchange}</strong>
                                </div>
                                <div className="text-slate-400 mt-0.5 font-mono">
                                  Ордер: BUY по цене Ask <strong>${opp.long.askPrice}</strong>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-1">
                                  Комиссия тейкера: ~{formatFee(opp.long.feePercent)}
                                </div>
                                {opp.long.url && (
                                  <a
                                    href={opp.long.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 mt-2 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 hover:underline"
                                  >
                                    <span>Открыть терминал {opp.long.exchange.toUpperCase()}</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>

                              {/* Step 2 */}
                              <div className="p-3 bg-slate-900 border border-rose-500/20 rounded-xl">
                                <div className="flex items-center justify-between text-rose-400 font-semibold mb-1">
                                  <span>Шаг 2: ПРОДАЖА (SHORT)</span>
                                  <span className="uppercase text-[10px] bg-rose-500/10 px-1.5 py-0.5 rounded">
                                    {opp.short.marketType}
                                  </span>
                                </div>
                                <div className="text-slate-300">
                                  Биржа: <strong className="text-white uppercase">{opp.short.exchange}</strong>
                                </div>
                                <div className="text-slate-400 mt-0.5 font-mono">
                                  Ордер: SELL по цене Bid <strong>${opp.short.bidPrice}</strong>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-1">
                                  Комиссия тейкера: ~{formatFee(opp.short.feePercent)}
                                </div>
                                {opp.short.url && (
                                  <a
                                    href={opp.short.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 mt-2 text-[11px] font-semibold text-rose-400 hover:text-rose-300 hover:underline"
                                  >
                                    <span>Открыть терминал {opp.short.exchange.toUpperCase()}</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Col 2: PnL & Fee Math Breakdown */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                              <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
                              Детализация прибыли и расходов
                            </h4>
                            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-2.5 text-xs">
                              <div className="flex justify-between items-center text-slate-300">
                                <span>Грязный входной спред:</span>
                                <span className="font-mono font-bold text-white">
                                  +{opp.spreads.grossEntrySpread.toFixed(3)}%
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-slate-400 text-[11px]">
                                <span>Комиссия входа ({opp.long.exchange} {opp.long.marketType}):</span>
                                <span className="font-mono text-rose-400">-{formatFee(opp.long.feePercent)}</span>
                              </div>
                              <div className="flex justify-between items-center text-slate-400 text-[11px]">
                                <span>Комиссия входа ({opp.short.exchange} {opp.short.marketType}):</span>
                                <span className="font-mono text-rose-400">-{formatFee(opp.short.feePercent)}</span>
                              </div>
                              <div className="flex justify-between items-center text-slate-400 text-[11px]">
                                <span>Трение стакана (B/A cost):</span>
                                <span className="font-mono text-amber-400">{opp.spreads.baCost.toFixed(3)}%</span>
                              </div>
                              <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
                                <span className="font-bold text-white">Чистый спред входа (Net Entry):</span>
                                <span className="font-mono font-extrabold text-sm text-violet-300">
                                  +{opp.spreads.netSpread.toFixed(3)}%
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-slate-400 text-[11px] pt-1">
                                <span title="Оценка комиссии на закрытие обеих ног при схождении спреда к 0%">
                                  Комиссия выхода (Round-trip закрытие):
                                </span>
                                <span className="font-mono text-slate-400">
                                  -{formatFee(opp.spreads.exitFees || opp.spreads.totalFees)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-slate-300 text-[11px] font-semibold">
                                <span>Чистый спред за круг (Round-trip Net):</span>
                                <span className={`font-mono font-bold ${
                                  (opp.spreads.netRoundTripSpread ?? (opp.spreads.netSpread - opp.spreads.totalFees)) > 0
                                    ? 'text-emerald-400'
                                    : 'text-amber-400'
                                }`}>
                                  {((opp.spreads.netRoundTripSpread ?? (opp.spreads.netSpread - opp.spreads.totalFees)) > 0 ? '+' : '')}
                                  {(opp.spreads.netRoundTripSpread ?? (opp.spreads.netSpread - opp.spreads.totalFees)).toFixed(3)}%
                                </span>
                              </div>
                              <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg flex flex-col gap-1 mt-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-cyan-200 font-semibold">
                                    Чистый доход с ${depositSize}:
                                  </span>
                                  <span className="font-mono font-extrabold text-cyan-300 text-sm">
                                    +${opp.estProfitUSD.toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] text-cyan-400/80">
                                  <span>С учетом закрытия (круг):</span>
                                  <span className="font-mono font-semibold">
                                    +${(opp.estRoundTripProfitUSD ?? (((opp.spreads.netRoundTripSpread || 0) / 100) * depositSize)).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Col 3: Risk Audit & Execution Warnings */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                              Аудит рисков и рекомендации
                            </h4>
                            <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-2.5 text-xs text-slate-300">
                              <div className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="text-white">Ликвидность проверена:</strong>
                                  <div className="text-[11px] text-slate-400">
                                    Суточный объем на покупке ${(opp.long.volume24h / 1000).toFixed(0)}k, на продаже ${(opp.short.volume24h / 1000).toFixed(0)}k.
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-start gap-2">
                                <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="text-white">Специфика закрытия:</strong>
                                  <div className="text-[11px] text-slate-400">
                                    Для фиксации арбитража позиции закрываются встречными ордерами (Take-Profit/Stop-Loss) либо удерживаются до схождения цен.
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="text-white">Контроль кошельков:</strong>
                                  <div className="text-[11px] text-slate-400">
                                    Перед переводом монет между биржами проверьте активность сетей (депозиты и вывод).
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 3. Alternative Exchange Pairs for the same coin */}
                        {opp.alternatives && opp.alternatives.length > 0 && (
                          <div className="pt-4 border-t border-slate-800 space-y-2.5">
                            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5 text-violet-400" />
                              Другие биржевые связки для {opp.symbol} ({opp.alternatives.length})
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {opp.alternatives.map((alt) => (
                                <div
                                  key={alt.id}
                                  className="p-2.5 bg-slate-900/70 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                                >
                                  <div>
                                    <div className="font-semibold text-white uppercase flex items-center gap-1.5">
                                      <span>{alt.long.exchange}</span>
                                      <span className="text-slate-500">➔</span>
                                      <span>{alt.short.exchange}</span>
                                      <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-normal">
                                        {alt.strategyLabel}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                      ${alt.long.askPrice} ➔ ${alt.short.bidPrice}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-extrabold text-violet-300 font-mono">
                                      +{alt.spreads.netSpread.toFixed(2)}%
                                    </div>
                                    <div className="text-[10px] text-emerald-400 font-mono">
                                      +${alt.estProfitUSD}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
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
