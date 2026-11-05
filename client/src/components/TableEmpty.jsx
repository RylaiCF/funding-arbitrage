import React from 'react';
import { Sparkles, Play, Filter, RotateCcw } from 'lucide-react';

export default function TableEmpty({
  type = 'no_scan',
  onStartScan,
  activePreset = 'all',
  activePresetLabel = '',
  totalCoinsCount = 0,
  onResetPreset,
  title,
  description,
  buttonText,
  isForex = false,
}) {
  if (type === 'no_scan') {
    const displayTitle = title || (isForex ? 'Forex-связки еще не рассчитаны' : 'Связки еще не рассчитаны');
    const displayDesc = description || (isForex
      ? 'В базе данных пока нет сохраненных результатов сканирования Forex. Нажмите кнопку «Сканировать Forex», чтобы проанализировать ставки всех фиатных валют по включенным биржам.'
      : 'В базе данных пока нет сохраненных результатов сканирования. Нажмите «Сканировать связки» для полного среза рынка или введите любую интересующую вас монету в блоке выше для мгновенного анализа.');
    const displayBtn = buttonText || (isForex ? 'Сканировать Forex' : 'Сканировать связки');

    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center shadow-xl space-y-4">
        <div className={`w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700/60 flex items-center justify-center mx-auto ${
          isForex ? 'text-cyan-400' : 'text-emerald-400'
        }`}>
          <Sparkles className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-slate-200">{displayTitle}</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {displayDesc}
          </p>
        </div>
        {onStartScan && (
          <div className="pt-1">
            <button
              onClick={onStartScan}
              className={`inline-flex items-center gap-2 px-5 py-2.5 text-slate-950 text-xs font-bold rounded-xl shadow-lg transition-all active:scale-95 ${
                isForex
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-500/20'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-emerald-500/20'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{displayBtn}</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // Filter empty state inside table body
  return (
    <tr>
      <td colSpan="11" className="py-16 text-center rounded-b-2xl">
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
