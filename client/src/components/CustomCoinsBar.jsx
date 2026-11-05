import React, { useState, useRef, useEffect } from 'react';
import { Plus, Loader2, Star, Trash2, RotateCw, AlertCircle, Sparkles, X } from 'lucide-react';

export default function CustomCoinsBar({
  customCoins = [],
  allSymbols = [],
  isAdding = false,
  addError = null,
  onClearError,
  onAddCoin,
  onRemoveCoin,
  onReanalyzeCoin,
  onSelectCoin,
}) {
  const [inputValue, setInputValue] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [successToast, setSuccessToast] = useState(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Filter autocomplete suggestions based on input
  const suggestions = React.useMemo(() => {
    const q = inputValue.trim().toUpperCase();
    if (!q || !Array.isArray(allSymbols) || allSymbols.length === 0) return [];

    // Prioritize exact match, then startsWith, then includes
    const startsWith = [];
    const includes = [];

    for (const sym of allSymbols) {
      if (sym === q) {
        startsWith.unshift(sym);
      } else if (sym.startsWith(q)) {
        startsWith.push(sym);
      } else if (sym.includes(q)) {
        includes.push(sym);
      }
      if (startsWith.length + includes.length >= 25) break;
    }

    return [...startsWith, ...includes].slice(0, 10);
  }, [inputValue, allSymbols]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAdd = async (symbolToSubmit) => {
    const sym = (symbolToSubmit || inputValue).trim().toUpperCase();
    if (!sym || isAdding) return;

    if (onClearError) onClearError();
    setIsDropdownOpen(false);

    const res = await onAddCoin(sym);
    if (res && res.success) {
      setInputValue('');
      setSuccessToast(`Монета ${sym} успешно проанализирована и добавлена!`);
      setTimeout(() => setSuccessToast(null), 4000);
      if (onSelectCoin) onSelectCoin(sym);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsDropdownOpen(true);
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleAdd(suggestions[selectedIndex]);
      } else {
        handleAdd();
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3.5 relative transition-all ${
      isDropdownOpen ? 'z-40' : 'z-10'
    }`}>
      {/* Top Title & Quick Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Star className="w-4 h-4 fill-amber-400/30" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Добавить любую монету в сканер</span>
              <span className="text-[11px] font-normal text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                Мгновенный подтяг и расчет
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Введите тикер любой криптовалюты для немедленного расчета спредов, APY, окупаемости, шарпа и графиков по всем включенным биржам.
            </p>
          </div>
        </div>
      </div>

      {/* Input row with autocomplete & Add Button */}
      <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 relative ${
        isDropdownOpen ? 'z-50' : 'z-10'
      }`}>
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            placeholder="Символ монеты (напр. SOL, TON, BTC, PEPE, SUI, DOGE, KAITO)..."
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value.toUpperCase());
              setIsDropdownOpen(true);
              setSelectedIndex(-1);
              if (addError && onClearError) onClearError();
            }}
            onFocus={() => {
              if (inputValue.trim()) setIsDropdownOpen(true);
            }}
            onKeyDown={handleKeyDown}
            disabled={isAdding}
            className="w-full px-3.5 py-2.5 text-xs font-mono font-medium bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all uppercase"
          />

          {inputValue && (
            <button
              type="button"
              onClick={() => {
                setInputValue('');
                setIsDropdownOpen(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Autocomplete suggestions dropdown */}
          {isDropdownOpen && suggestions.length > 0 && (
            <div
              ref={dropdownRef}
              style={{ backgroundColor: '#0f172a' }}
              className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl shadow-black/90 overflow-hidden py-1 max-h-60 overflow-y-auto ring-1 ring-slate-700/60"
            >
              <div className="px-3 py-1.5 text-[10px] text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800 bg-slate-950/40">
                Подходящие монеты на Loris ({suggestions.length})
              </div>
              {suggestions.map((sym, idx) => (
                <button
                  key={sym}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleAdd(sym);
                  }}
                  className={`w-full px-3.5 py-2 text-left text-xs font-mono flex items-center justify-between transition-colors ${
                    idx === selectedIndex
                      ? 'bg-amber-500/25 text-amber-200'
                      : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="font-bold">{sym}</span>
                  <span className="text-[10px] text-slate-400">нажмите для анализа ↵</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action Button: Add & Analyze */}
        <button
          type="button"
          onClick={() => handleAdd()}
          disabled={isAdding || !inputValue.trim()}
          className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-md shrink-0 ${
            isAdding || !inputValue.trim()
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
              : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20 active:scale-[0.98]'
          }`}
        >
          {isAdding ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-950" />
              <span>Подтягиваем аналитику...</span>
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Добавить в сканер</span>
            </>
          )}
        </button>
      </div>

      {/* Error notification banner */}
      {addError && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <div className="flex-1 leading-relaxed">
            <span className="font-semibold">Ошибка анализа: </span>
            <span>{addError}</span>
          </div>
          {onClearError && (
            <button
              onClick={onClearError}
              className="text-rose-400 hover:text-rose-200 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Success notification banner */}
      {successToast && (
        <div className="flex items-center justify-between p-2.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-emerald-400 hover:text-emerald-200 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Tracked Custom Coins chips row */}
      {customCoins && customCoins.length > 0 && (
        <div className="pt-2 border-t border-slate-800/60 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 mr-1">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
            <span>Мои отслеживаемые монеты ({customCoins.length}):</span>
          </span>

          {customCoins.map((c) => {
            const sym = typeof c === 'string' ? c : c.symbol;
            return (
              <div
                key={sym}
                className="group flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-lg bg-slate-950 border border-amber-500/30 hover:border-amber-400 text-xs font-mono transition-all"
              >
                <button
                  type="button"
                  onClick={() => onSelectCoin && onSelectCoin(sym)}
                  className="font-bold text-amber-300 hover:text-amber-200 hover:underline transition-colors"
                  title={`Показать ${sym} в таблице`}
                >
                  {sym}
                </button>

                <div className="flex items-center gap-0.5 ml-1">
                  {onReanalyzeCoin && (
                    <button
                      type="button"
                      onClick={() => onReanalyzeCoin(sym)}
                      disabled={isAdding}
                      className="p-1 rounded text-slate-500 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                      title={`Обновить аналитику для ${sym}`}
                    >
                      <RotateCw className="w-3 h-3" />
                    </button>
                  )}
                  {onRemoveCoin && (
                    <button
                      type="button"
                      onClick={() => onRemoveCoin(sym)}
                      disabled={isAdding}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title={`Удалить ${sym} из отслеживаемых`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
