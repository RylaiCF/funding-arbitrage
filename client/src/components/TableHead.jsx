import React from 'react';
import { HelpCircle } from 'lucide-react';

export default function TableHead({ activeMetric }) {
  return (
    <thead>
      <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold tracking-wider uppercase text-[10px]">
        <th className="py-3 px-2 sm:px-2.5 text-center w-8">#</th>
        <th className="py-3 px-2.5 sm:px-3">Монета & OI</th>
        <th className="py-3 px-2.5 sm:px-3 whitespace-nowrap">Связка (Long → Short)</th>
        <th className="py-3 px-2.5 sm:px-3 whitespace-nowrap">
          <div className="inline-flex items-center gap-1 group relative cursor-help">
            <span>Риск & Окупаемость</span>
            <HelpCircle className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400 transition-colors" />

            {/* Tooltip Popup on Hover */}
            <div className="absolute left-0 top-full mt-2 w-80 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl text-[11px] text-slate-300 font-normal normal-case leading-relaxed pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 z-50 text-left whitespace-normal">
              <div className="font-semibold text-emerald-400 text-xs mb-1">
                Оценка целесообразности входа
              </div>
              <p className="mb-2">
                Два ключевых фактора для быстрого принятия решения:
              </p>
              <div className="space-y-1.5 text-slate-300">
                <div>
                  • <strong className="text-white">Бейдж риска</strong>: многофакторная оценка (Шарп, вин-рейт, спайки, просадки и волатильность цены токена с Binance/Bybit).
                </div>
                <div>
                  • <strong className="text-white">Время окупаемости (Break-even)</strong>: срок удержания позиции, необходимый для покрытия торговых комиссий входа и выхода (~0.18% round-trip) доходом от спреда.
                </div>
              </div>
            </div>
          </div>
        </th>
        <th className="py-3 px-2.5 sm:px-3 text-right whitespace-nowrap">
          <div className="inline-flex items-center justify-end gap-1 group relative cursor-help">
            <span>Тренд & Живучесть (t½)</span>
            <HelpCircle className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition-colors" />

            {/* Tooltip Popup on Hover */}
            <div className="absolute right-0 top-full mt-2 w-80 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl text-[11px] text-slate-300 font-normal normal-case leading-relaxed pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 z-50 text-left whitespace-normal">
              <div className="font-semibold text-cyan-400 text-xs mb-1 flex items-center gap-1.5">
                <span>Динамика и период полураспада (Half-Life)</span>
              </div>
              <p className="mb-2">
                Оценка моментума спреда и скорости его затухания по модели Орнштейна-Уленбека:
              </p>
              <ul className="space-y-1.5 text-slate-300">
                <li>• <strong className="text-emerald-400">Растущий ↗</strong> / <strong className="text-teal-300">Стабильный ➔</strong>: спред за 24ч выше или равен 7-дневному.</li>
                <li>• <strong className="text-cyan-300">Период полураспада (t½)</strong>: срок, за который аномалия спреда сжимается на 50%. Позволяет понять, как долго продержится доходность.</li>
                <li>• <strong className="text-rose-400">⚠️ t½ &lt; окупаемости</strong>: спред схлопывается быстрее, чем позиция успеет отбить торговые комиссии (~0.18%). Высокий риск для входа.</li>
              </ul>
            </div>
          </div>
        </th>
        <th className="py-3 px-2.5 sm:px-3 text-right whitespace-nowrap">Текущий APY</th>
        <th className={`py-3 px-2.5 sm:px-3 text-right whitespace-nowrap ${activeMetric === 'trimmed' ? 'text-emerald-400 font-bold' : ''}`}>
          Очищенный APY
        </th>
        <th className={`py-3 px-2.5 sm:px-3 text-right whitespace-nowrap ${activeMetric === 'median' ? 'text-teal-400 font-bold' : ''}`}>
          Медианный APY
        </th>
        <th className={`py-3 px-2.5 sm:px-3 text-right whitespace-nowrap ${activeMetric === 'sharpe' ? 'text-cyan-400 font-bold' : ''}`}>
          <div className="inline-flex items-center justify-end gap-1 group relative cursor-help">
            <span>Шарп фандинга</span>
            <HelpCircle className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition-colors" />

            {/* Tooltip Popup on Hover */}
            <div className="absolute right-0 top-full mt-2 w-72 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl text-[11px] text-slate-300 font-normal normal-case leading-relaxed pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 z-50 text-left whitespace-normal">
              <div className="font-semibold text-cyan-400 text-xs mb-1 flex items-center gap-1.5">
                <span>Коэффициент Шарпа фандинга</span>
              </div>
              <p className="mb-1.5">
                Отношение средней доходности спреда к его волатильности (стандартному отклонению &sigma;).
              </p>
              <ul className="space-y-1 text-slate-300">
                <li>&bull; <strong className="text-emerald-400">Высокий Шарп (&gt;1.5)</strong>: стабильный предсказуемый плюс на дистанции.</li>
                <li>&bull; <strong className="text-amber-400">Штраф за спайки</strong>: случайный выброс (+1000%) раздувает дисперсию и обрушивает Шарп почти до нуля.</li>
              </ul>
            </div>
          </div>
        </th>
        <th className="py-3 px-2 text-center w-10">График</th>
      </tr>
    </thead>
  );
}
