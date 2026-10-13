import React, { useState, useMemo } from 'react';
import { Flame, AlertTriangle, Layers, ArrowUpDown, Search, RefreshCw } from 'lucide-react';
import SqueezeRow from './SqueezeRow';

export default function SqueezeTable({
  opportunities = [],
  isLoading = false,
  isScanning = false,
  onStartScan,
  searchQuery = '',
}) {
  const [expandedSymbol, setExpandedSymbol] = useState(null);
  const [activePreset, setActivePreset] = useState('all'); // 'all' | 'extreme' | 'cross' | 'pump'
  const [sortField, setSortField] = useState('dailyYield'); // 'dailyYield' | 'squeezedRate' | 'oi' | 'change24h'
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' | 'asc'

  // Filter and sort opportunities
  const processedCoins = useMemo(() => {
    let list = [...opportunities];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (o) =>
          o.symbol.toLowerCase().includes(q) ||
          o.squeezedDisplayName.toLowerCase().includes(q) ||
          o.strategies?.crossExchange?.shortDisplayName?.toLowerCase()?.includes(q)
      );
    }

    // Preset filters
    if (activePreset === 'extreme') {
      list = list.filter((o) => o.severity === 'extreme');
    } else if (activePreset === 'safe') {
      list = list.filter((o) => o.risk?.level === 'low');
    } else if (activePreset === 'borrowable') {
      list = list.filter((o) => o.borrowInfo?.isBorrowable);
    } else if (activePreset === 'cross') {
      list = list.filter((o) => Boolean(o.strategies?.crossExchange));
    } else if (activePreset === 'pump') {
      list = list.filter((o) => (o.priceChange24h ?? 0) >= 20);
    }

    // Sorting
    list.sort((a, b) => {
      let valA = 0;
      let valB = 0;
      if (sortField === 'dailyYield') {
        valA = a.dailyYieldLongPercent ?? 0;
        valB = b.dailyYieldLongPercent ?? 0;
      } else if (sortField === 'squeezedRate') {
        valA = Math.abs(a.ratePerPeriodPercent ?? 0);
        valB = Math.abs(b.ratePerPeriodPercent ?? 0);
      } else if (sortField === 'oi') {
        valA = a.oiRank ?? 999;
        valB = b.oiRank ?? 999;
        // For OI, lower is better, so flip default order
        return sortOrder === 'asc' ? valB - valA : valA - valB;
      } else if (sortField === 'change24h') {
        valA = a.priceChange24h ?? -999;
        valB = b.priceChange24h ?? -999;
      } else if (sortField === 'risk') {
        valA = a.risk?.score ?? 0;
        valB = b.risk?.score ?? 0;
      }

      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });

    return list;
  }, [opportunities, searchQuery, activePreset, sortField, sortOrder]);

  const toggleExpand = (sym) => {
    setExpandedSymbol((prev) => (prev === sym ? null : sym));
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const presets = [
    { id: 'all', label: 'Все сквизы', count: opportunities.length },
    {
      id: 'extreme',
      label: '💥 Сверхсквизы',
      count: opportunities.filter((o) => o.severity === 'extreme').length,
    },
    {
      id: 'safe',
      label: '🛡️ Низкий риск',
      count: opportunities.filter((o) => o.risk?.level === 'low').length,
    },
    {
      id: 'pump',
      label: '🚀 Пампы 24h',
      count: opportunities.filter((o) => (o.priceChange24h ?? 0) >= 20).length,
    },
    {
      id: 'borrowable',
      label: '🟢 Заем доступен',
      count: opportunities.filter((o) => o.borrowInfo?.isBorrowable).length,
    },
    {
      id: 'cross',
      label: '⚡ Кросс-хедж',
      count: opportunities.filter((o) => Boolean(o.strategies?.crossExchange)).length,
    },
  ];

  // Loading skeleton state
  if (isLoading || (isScanning && opportunities.length === 0)) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3 shadow-xl">
        <Flame className="w-8 h-8 text-rose-400 animate-pulse mx-auto" />
        <h3 className="text-sm font-bold text-white">Сканирование рынка на наличие шорт-сквизов...</h3>
        <p className="text-xs text-slate-400">Проверка 1900+ монет со всех 44 бирж на отрицательный фандинг</p>
      </div>
    );
  }

  // Empty state
  if (opportunities.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-4 shadow-xl">
        <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
          <Flame className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Сквизы пока не найдены</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Нажмите кнопку «Сканировать радар сквизов», чтобы проверить рынок на наличие монет с отрицательным фандингом.
          </p>
        </div>
        <button
          onClick={onStartScan}
          className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 hover:from-rose-400 hover:to-amber-400 shadow-md shadow-rose-500/20 transition-all inline-flex items-center gap-2"
        >
          <Flame className="w-4 h-4 fill-current" />
          <span>Запустить сканирование сквизов</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl w-full">
      {/* Header with Title and Preset Tabs */}
      <div className="p-4 sm:px-6 border-b border-slate-800 rounded-t-2xl flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        <div className="flex flex-col">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-400 fill-current" />
              <span>Радар шорт-сквизов и отрицательного фандинга</span>
            </h2>
            <span className="text-xs bg-slate-800 text-rose-400 px-2 py-0.5 rounded-full font-mono font-bold">
              {activePreset === 'all'
                ? `${processedCoins.length} монет`
                : `${processedCoins.length} из ${opportunities.length}`}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 hidden xl:block mt-0.5">
            Нажмите на строку, чтобы открыть калькулятор прибыли в $ и инструкцию по открытию позиции
          </div>
        </div>

        {/* Quick Presets tabs */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800/80 shrink-0">
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => setActivePreset(p.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activePreset === p.id
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
              }`}
            >
              <span>{p.label}</span>
              <span
                className={`text-[10px] px-1 py-0.2 rounded font-mono ${
                  activePreset === p.id ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-500'
                }`}
              >
                {p.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <table className="w-full text-left border-collapse text-xs rounded-b-2xl">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-950/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            <th className="py-2.5 px-2 text-center w-10">#</th>
            <th
              className="py-2.5 px-2 text-center"
              title="Интенсивность отрицательного фандинга: Сверхсквиз > 4.5%/д, Высокий > 2%/д, Умеренный > 0.6%/д"
            >
              Сквиз / Выплата
            </th>
            <th
              onClick={() => handleSort('oi')}
              className="py-2.5 px-2 cursor-pointer hover:text-white transition-colors"
            >
              <div className="flex items-center gap-1">
                <span>Монета / Цена</span>
                <ArrowUpDown className="w-3 h-3" />
              </div>
            </th>
            <th
              onClick={() => handleSort('change24h')}
              className="py-2.5 px-2 cursor-pointer hover:text-white transition-colors"
              title="Суточное изменение цены и оценка риска ликвидации шорта"
            >
              <div className="flex items-center gap-1">
                <span>24h / Риск</span>
                <ArrowUpDown className="w-3 h-3" />
              </div>
            </th>
            <th className="py-2.5 px-2">Биржа со сквизом</th>
            <th
              onClick={() => handleSort('squeezedRate')}
              className="py-2.5 px-2 text-right cursor-pointer hover:text-white transition-colors"
            >
              <div className="flex items-center justify-end gap-1">
                <span>Ставка за период</span>
                <ArrowUpDown className="w-3 h-3" />
              </div>
            </th>
            <th
              onClick={() => handleSort('dailyYield')}
              className="py-2.5 px-2 text-right cursor-pointer hover:text-emerald-400 transition-colors"
            >
              <div className="flex items-center justify-end gap-1 text-emerald-400">
                <span>Выплата Long в сутки</span>
                <ArrowUpDown className="w-3 h-3" />
              </div>
            </th>
            <th className="py-2.5 px-2 text-right">Спот-Маржа (Заем)</th>
            <th className="py-2.5 px-2 text-right">Кросс-Хедж</th>
            <th className="py-2.5 px-2 text-center w-7"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60">
          {processedCoins.map((opp, idx) => (
            <SqueezeRow
              key={opp.symbol}
              item={opp}
              idx={idx}
              isExpanded={expandedSymbol === opp.symbol}
              onToggleExpand={() => toggleExpand(opp.symbol)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
