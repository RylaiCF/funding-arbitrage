import React from 'react';
import { Loader2 } from 'lucide-react';

export default function TableSkeleton() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl w-full min-w-fit">
      {/* Table Title and Loading Spinner */}
      <div className="p-4 sm:px-6 border-b border-slate-800 rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="text-sm font-bold text-white tracking-tight">
            Лучшие арбитражные связки
          </h2>
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Загрузка данных...</span>
          </div>
        </div>
        <div className="text-xs text-slate-500 font-mono hidden sm:block">
          Считывание связок из кэша...
        </div>
      </div>

      {/* Skeleton Table Rows */}
      <table className="w-full text-left border-collapse text-xs rounded-b-2xl">
        <thead>
          <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-500 font-semibold tracking-wider uppercase text-[10px]">
            <th className="py-3 px-2 sm:px-2.5 text-center w-8">#</th>
            <th className="py-3 px-2.5 sm:px-3">Монета & OI</th>
            <th className="py-3 px-2.5 sm:px-3 whitespace-nowrap">Связка (Long → Short)</th>
            <th className="py-3 px-2.5 sm:px-3 whitespace-nowrap">Риск & Окупаемость</th>
            <th className="py-3 px-2.5 sm:px-3 text-right">Тренд & Живучесть (t½)</th>
            <th className="py-3 px-2.5 sm:px-3 text-right">Спред APY</th>
            <th className="py-3 px-2.5 sm:px-3 text-right">Вин-рейт</th>
            <th className="py-3 px-2.5 sm:px-3 text-right">Шарп фандинга</th>
            <th className="py-3 px-2 text-center w-10">График</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <tr key={i} className="bg-slate-900/40">
              <td className="py-4 px-2 sm:px-2.5 text-center font-mono text-slate-700">
                <div className="w-4 h-3.5 bg-slate-800 rounded mx-auto" />
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
                <div className="w-10 h-4 bg-slate-800 rounded ml-auto" />
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
