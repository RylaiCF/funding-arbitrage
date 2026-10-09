import React, { useState, useMemo } from 'react';
import { X, Search, Building2, Sparkles, RefreshCw, Clock } from 'lucide-react';

export default function ExchangeModal({
  isOpen = false,
  onClose,
  exchanges = [],
  onToggleExchange,
  onBatchUpdate,
  newExchanges = [],
  onCheckNewExchanges,
  isCheckingNew = false,
  lastCheckedAt = null,
  onIntegrate,
}) {
  const [filterQuery, setFilterQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'cex', 'dex'

  // Strict stable alphabetical sort by exchange name so cards NEVER jump when toggling
  const sortedExchanges = useMemo(() => {
    if (!Array.isArray(exchanges)) return [];
    return [...exchanges].sort((a, b) => {
      const nameA = a.display_name || a.id || '';
      const nameB = b.display_name || b.id || '';
      return nameA.localeCompare(nameB);
    });
  }, [exchanges]);

  const filteredExchanges = useMemo(() => {
    return sortedExchanges.filter((ex) => {
      const name = (ex.display_name || '').toLowerCase();
      const id = (ex.id || '').toLowerCase();
      const q = filterQuery.toLowerCase().trim();
      const matchesSearch = !q || name.includes(q) || id.includes(q);
      const matchesType = typeFilter === 'all' || ex.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [sortedExchanges, filterQuery, typeFilter]);

  if (!isOpen) return null;

  const enabledCount = (exchanges || []).filter(e => e.is_enabled).length;

  const handleSelectAll = () => {
    if (!onBatchUpdate || !Array.isArray(exchanges)) return;
    const updates = exchanges.map(e => ({ id: e.id, is_enabled: 1 }));
    onBatchUpdate(updates);
  };

  const handleDeselectAll = () => {
    if (!onBatchUpdate || !Array.isArray(exchanges)) return;
    const updates = exchanges.map(e => ({ id: e.id, is_enabled: 0 }));
    onBatchUpdate(updates);
  };

  const handleSelectOnlyCex = () => {
    if (!onBatchUpdate || !Array.isArray(exchanges)) return;
    const updates = exchanges.map(e => ({ id: e.id, is_enabled: e.type === 'cex' ? 1 : 0 }));
    onBatchUpdate(updates);
  };

  const handleSelectOnlyDex = () => {
    if (!onBatchUpdate || !Array.isArray(exchanges)) return;
    const updates = exchanges.map(e => ({ id: e.id, is_enabled: e.type === 'dex' ? 1 : 0 }));
    onBatchUpdate(updates);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:px-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800 text-slate-200 flex items-center justify-center border border-slate-700">
              <Building2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Управление поддерживаемыми биржами
              </h2>
              <p className="text-xs text-slate-400">
                Включено {enabledCount} из {(exchanges || []).length} бирж. Изменения сохраняются в SQLite базе данных.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Newly Detected Loris.tools Exchanges Banner */}
        {newExchanges && newExchanges.length > 0 && (
          <div className="p-4 sm:px-6 bg-gradient-to-r from-amber-500/15 via-slate-900 to-amber-500/10 border-b border-amber-500/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-bold text-amber-200">
                      Обнаружены новые биржи на Loris.tools ({newExchanges.length})
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                      Ожидают интеграции
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                    Эти биржи уже появились на Loris, но пока не добавлены в список поддерживаемых сканера:
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {newExchanges.map((ex) => (
                      <span
                        key={ex.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-amber-500/40 text-xs font-semibold text-amber-200 shadow-sm"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        <span>{ex.display_name || ex.id.toUpperCase()}</span>
                        <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded border border-slate-700">
                          {ex.interval_hours}ч фандинг
                        </span>
                        {onIntegrate && (
                          <button
                            onClick={() => onIntegrate(ex.id)}
                            className="ml-1 px-1.5 py-0.5 rounded bg-emerald-500/25 hover:bg-emerald-500/40 text-[10px] font-bold text-emerald-300 border border-emerald-500/40 transition-colors cursor-pointer"
                            title={`Подтянуть ${ex.display_name || ex.id}`}
                          >
                            + Подтянуть
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="self-start sm:self-center shrink-0 flex flex-col items-end gap-1.5">
                {onIntegrate && (
                  <button
                    onClick={() => onIntegrate('all')}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-500/25 hover:bg-emerald-500/35 text-emerald-200 border border-emerald-500/50 text-xs font-semibold shadow-sm active:scale-95 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-emerald-300" />
                    <span>Подтянуть все</span>
                  </button>
                )}
                <span className="text-[10px] text-slate-400 bg-slate-950/60 px-2 py-0.5 rounded-md border border-slate-800">
                  Обновляется при сканировании
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Quick Batch Actions & Search */}
        <div className="p-4 sm:px-6 bg-slate-950/50 border-b border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Batch buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleSelectAll}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              >
                Выбрать все
              </button>
              <button
                onClick={handleDeselectAll}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
              >
                Снять все
              </button>
              <button
                onClick={handleSelectOnlyCex}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-colors"
              >
                Только CEX (Binance, Bybit, OKX...)
              </button>
              <button
                onClick={handleSelectOnlyDex}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 transition-colors"
              >
                Только DEX (01, Hyperliquid, Aster...)
              </button>
            </div>

            {/* Type tabs */}
            <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  typeFilter === 'all' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Все
              </button>
              <button
                onClick={() => setTypeFilter('cex')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  typeFilter === 'cex' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                CEX
              </button>
              <button
                onClick={() => setTypeFilter('dex')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  typeFilter === 'dex' ? 'bg-slate-800 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                DEX
              </button>
            </div>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Поиск по названию биржи..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* Exchange Grid */}
        <div className="p-4 sm:px-6 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {filteredExchanges.map((ex) => (
            <label
              key={ex.id}
              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer select-none transition-all ${
                ex.is_enabled
                  ? 'bg-slate-800/80 border-emerald-500/40 text-slate-200 shadow-sm'
                  : 'bg-slate-950/40 border-slate-800/80 text-slate-500 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <input
                  type="checkbox"
                  checked={Boolean(ex.is_enabled)}
                  onChange={() => onToggleExchange && onToggleExchange(ex.id, !ex.is_enabled)}
                  className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/30 w-4 h-4 shrink-0 cursor-pointer"
                />
                <img
                  src={`/images/exchanges/${ex.id}.${ex.id === 'hyperliquid' ? 'svg' : 'png'}`}
                  alt={ex.display_name || ex.id}
                  className="w-5 h-5 rounded-md object-contain shrink-0 bg-slate-900/80 p-0.5 border border-slate-700/50"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <div className="truncate">
                  <div className="font-semibold text-xs text-white truncate">
                    {ex.display_name}
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span className={`uppercase font-mono text-[9px] px-1 py-0.2 rounded font-semibold ${
                      ex.type === 'cex' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-teal-500/20 text-teal-300'
                    }`}>
                      {ex.type}
                    </span>
                    <span>выплата {ex.interval_hours}ч</span>
                  </div>
                </div>
              </div>
            </label>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-6 border-t border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="text-xs text-slate-400">
            Для работы арбитража включите не менее 2 бирж.
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-lg shadow-emerald-500/20 font-medium"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
}
