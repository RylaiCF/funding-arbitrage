import React from 'react';
import { Sparkles, Building2, RefreshCw, X, ArrowRight, Clock } from 'lucide-react';

export default function NewExchangesBanner({
  newExchanges = [],
  onOpenModal,
  onDismiss,
  onIntegrate,
  onRefresh,
  isChecking = false,
}) {
  if (!newExchanges || newExchanges.length === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-slate-900/90 to-amber-950/20 p-4 sm:p-5 shadow-lg shadow-amber-950/20 backdrop-blur-md transition-all">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Left side: Icon, title, description & exchange chips */}
        <div className="flex items-start gap-3.5">
          {/* Animated badge icon */}
          <div className="relative shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/50 bg-amber-500/20 text-amber-300 shadow-inner">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
            </span>
          </div>

          {/* Text and badges */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-amber-200 tracking-tight flex items-center gap-2">
                Обнаружены новые биржи на Loris.tools!
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                +{newExchanges.length} {newExchanges.length === 1 ? 'биржа' : newExchanges.length < 5 ? 'биржи' : 'бирж'}
              </span>
            </div>

            <p className="text-xs sm:text-[13px] text-slate-300 max-w-3xl leading-relaxed">
              На платформе Loris появились новые площадки, которые пока не подключены к расчету арбитража в нашем приложении.
              Вы можете изучить их в списке и при необходимости запросить добавление их поддержки.
            </p>

            {/* Chips of newly detected exchanges */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                Новые:
              </span>
              {newExchanges.map((ex) => (
                <div
                  key={ex.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-amber-500/30 text-xs font-medium text-slate-200 shadow-sm transition-transform hover:scale-105"
                >
                  <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                  <span className="font-bold text-amber-200 tracking-wide">
                    {ex.display_name || ex.id.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-slate-400 bg-slate-800/90 px-1.5 py-0.2 rounded border border-slate-700/60 flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5 opacity-60" />
                    {ex.interval_hours}ч
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right side: Action buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 self-end lg:self-center pt-2 lg:pt-0">
          {onIntegrate && (
            <button
              onClick={() => onIntegrate('all')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-emerald-500/25 hover:bg-emerald-500/35 text-emerald-200 border border-emerald-500/50 hover:border-emerald-500/70 transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              <span>Подтянуть {newExchanges.length === 1 ? 'биржу' : 'все биржи'}</span>
            </button>
          )}

          {onOpenModal && (
            <button
              onClick={onOpenModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 hover:border-amber-500/60 transition-all shadow-sm active:scale-95"
            >
              <Building2 className="w-3.5 h-3.5 text-amber-300" />
              <span>Список бирж</span>
              <ArrowRight className="w-3 h-3 opacity-60" />
            </button>
          )}

          {onDismiss && (
            <button
              onClick={onDismiss}
              title="Скрыть плашку"
              className="inline-flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
