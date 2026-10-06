import React from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

export default function ProgressBar({ isScanning, progress, stepText, error }) {
  if (!isScanning && !error) return null;

  return (
    <div className={`p-4 rounded-2xl border transition-all ${
      error
        ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        : 'bg-slate-900 border-emerald-500/30 text-slate-200 shadow-lg'
    }`}>
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5 text-xs font-semibold">
          {error ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400 shrink-0" />
          )}
          <span>{stepText || 'Выполняется расчет связок...'}</span>
        </div>
        {isScanning && (
          <span className="text-xs font-mono font-bold text-emerald-400">{progress}%</span>
        )}
      </div>

      {isScanning && (
        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
          <div
            className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-full rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
}
