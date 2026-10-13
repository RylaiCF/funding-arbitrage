import React from 'react';
import { Loader2 } from 'lucide-react';

export default function TableSkeleton({
  title = 'Лучшие арбитражные связки',
  badgeText = 'Загрузка данных...',
  subtitle = 'Считывание связок из кэша...',
  isForex = false,
}) {
  const badgeClasses = isForex
    ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
  const spinnerClasses = isForex ? 'text-cyan-400' : 'text-emerald-400';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl w-full overflow-hidden">
      {/* Table Title and Loading Spinner */}
      <div className="p-4 sm:px-6 border-b border-slate-800 rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="text-sm font-bold text-white tracking-tight">
            {title}
          </h2>
          <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-medium ${badgeClasses}`}>
            <Loader2 className={`w-3.5 h-3.5 animate-spin ${spinnerClasses}`} />
            <span>{badgeText}</span>
          </div>
        </div>
        <div className="text-xs text-slate-500 font-mono hidden sm:block">
          {subtitle}
        </div>
      </div>

      {/* Skeleton Table Rows */}
      <table className="w-full text-left border-collapse text-xs rounded-b-2xl">
        <thead>
          <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-500 font-semibold tracking-wider uppercase text-[10px]">
            <th className="py-2.5 px-1.5 sm:px-2 text-center w-7">#</th>
            <th className="py-2.5 px-1.5 sm:px-2 text-center whitespace-nowrap">Рейтинг</th>
            <th className="py-2.5 px-1.5 sm:px-2 whitespace-nowrap">Монета & OI</th>
            <th className="py-2.5 px-1.5 sm:px-2 whitespace-nowrap">Связка (Long → Short)</th>
            <th className="py-2.5 px-1.5 sm:px-2 whitespace-nowrap">Риск & Окупаемость</th>
            <th className="py-2.5 px-1.5 sm:px-2 text-right whitespace-nowrap">Тренд (24ч / 7д)</th>
            <th className="py-2.5 px-1.5 sm:px-2 text-right whitespace-nowrap">Текущий APY</th>
            <th className="py-2.5 px-1.5 sm:px-2 text-right whitespace-nowrap">Очищенный APY</th>
            <th className="py-2.5 px-1.5 sm:px-2 text-right whitespace-nowrap">Медианный APY</th>
            <th className="py-2.5 px-1.5 sm:px-2 text-right whitespace-nowrap">Шарп</th>
            <th className="py-2.5 px-1 text-center w-7">График</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <tr key={i} className="bg-slate-900/40">
              <td className="py-4 px-2 sm:px-2.5 text-center font-mono text-slate-700">
                <div className="w-4 h-3.5 bg-slate-800 rounded mx-auto" />
              </td>
              <td className="py-4 px-2 sm:px-2.5 text-center">
                <div className="w-11 h-5 bg-slate-800 rounded-md mx-auto" />
              </td>
              <td className="py-4 px-2.5 sm:px-3">
                <div className="flex items-center gap-2">
                  <div className="w-14 h-4 bg-slate-800 rounded font-bold" />
                  <div className="w-12 h-3.5 bg-slate-800/60 rounded" />
                </div>
              </td>
              <td className="py-4 px-2.5 sm:px-3">
                <div className="flex items-center gap-2">
                  <div className="w-20 h-5 bg-slate-800 rounded-md" />
                  <div className="w-3 h-3 bg-slate-800/80 rounded" />
                  <div className="w-20 h-5 bg-slate-800 rounded-md" />
                </div>
              </td>
              <td className="py-4 px-2.5 sm:px-3">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-5 bg-slate-800 rounded" />
                  <div className="w-14 h-5 bg-slate-800 rounded" />
                </div>
              </td>
              <td className="py-4 px-2.5 sm:px-3 text-right">
                <div className="w-16 h-4 bg-slate-800 rounded ml-auto" />
              </td>
              <td className="py-4 px-2.5 sm:px-3 text-right">
                <div className="w-14 h-4 bg-slate-800 rounded ml-auto" />
              </td>
              <td className="py-4 px-2.5 sm:px-3 text-right">
                <div className="w-14 h-4 bg-slate-800 rounded ml-auto" />
              </td>
              <td className="py-4 px-2.5 sm:px-3 text-right">
                <div className="w-14 h-4 bg-slate-800 rounded ml-auto" />
              </td>
              <td className="py-4 px-2.5 sm:px-3 text-right">
                <div className="w-12 h-4 bg-slate-800 rounded ml-auto" />
              </td>
              <td className="py-4 px-2 text-center">
                <div className="w-6 h-6 bg-slate-800 rounded-lg mx-auto" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
