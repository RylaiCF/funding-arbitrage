import React from 'react';
import { Sparkles, Play, Filter, RotateCcw } from 'lucide-react';

export default function TableEmpty({
  type = 'no_scan',
  onStartScan,
  activePreset = 'all',
  activePresetLabel = '',
  totalCoinsCount = 0,
  onResetPreset,
}) {
  if (type === 'no_scan') {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center shadow-xl space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700/60 text-emerald-400 flex items-center justify-center mx-auto">
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-slate-200">Связки еще не рассчитаны</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            В базе данных пока нет сохраненных результатов сканирования. Нажмите кнопку «Сканировать связки», чтобы получить актуальный срез рынка с loris.tools и рассчитать показатели устойчивости.
          </p>
        </div>
        {onStartScan && (
          <div className="pt-1">
            <button
              onClick={onStartScan}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-xs font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Сканировать связки</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // Filter empty state inside table body
  return (
    <tr>
      <td colSpan="10" className="py-16 text-center">
        <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/60 flex items-center justify-center text-slate-400">
            <Filter className="w-5 h-5" />
          </div>
          <div className="text-sm font-semibold text-slate-200 mt-1">
            {activePreset !== 'all'
              ? 'Нет связок, подходящих под критерии пресета'
              : 'По вашему запросу ничего не найдено'}
          </div>
          <p className="text-xs text-slate-400">
            {activePreset !== 'all'
              ? `Для пресета «${activePresetLabel}» сейчас нет подходящих монет.`
              : 'Попробуйте изменить поисковый запрос или проверить включенные биржи.'}
          </p>
          {activePreset !== 'all' && onResetPreset && (
            <button
              onClick={onResetPreset}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Сбросить пресет (показать все {totalCoinsCount})</span>
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
