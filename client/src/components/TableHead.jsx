import React from 'react';
import { HelpCircle, Award } from 'lucide-react';

export default function TableHead({ activeMetric }) {
  return (
    <thead className="relative z-30">
      <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 font-semibold tracking-wider uppercase text-[10px]">
        {/* 1. Index */}
        <th className="py-2.5 px-1 sm:px-1.5 text-center w-8">#</th>

        {/* 2. Entry Score (Composite Rating 0-100) */}
        <th className={`py-2.5 px-1 sm:px-1.5 text-center whitespace-nowrap w-20 sm:w-24 ${activeMetric === 'score' ? 'text-emerald-400 font-bold' : ''}`}>
          <div className="inline-flex items-center justify-center gap-1 group relative cursor-help">
            <Award className="w-3.5 h-3.5 text-emerald-400" />
            <span>Рейтинг</span>
            <HelpCircle className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400 transition-colors" />

            {/* Tooltip Popup on Hover */}
            <div className="absolute left-0 top-full mt-2 w-80 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl text-[11px] text-slate-300 font-normal normal-case leading-relaxed pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 z-50 text-left whitespace-normal">
              <div className="font-semibold text-emerald-400 text-xs mb-1">
                Сводный рейтинг входа (0–100)
              </div>
              <p className="mb-2">
                Комплексная мультифакторная оценка для ранжирования монет от лучшей к худшей:
              </p>
              <div className="space-y-1 text-slate-300">
                <div>• <strong className="text-white">Доходность (до 30 б.)</strong>: очищенный APY + спред прямо сейчас.</div>
                <div>• <strong className="text-white">Стабильность (до 25 б.)</strong>: Шарп фандинга и вин-рейт часов.</div>
                <div>• <strong className="text-white">Окупаемость (до 25 б.)</strong>: время покрытия комиссий и динамика тренда.</div>
                <div>• <strong className="text-white">Безопасность (до 20 б.)</strong>: ликвидность (OI) и волатильность цены.</div>
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>Ранги: <strong className="text-emerald-400">S</strong> (85+) • <strong className="text-cyan-400">A</strong> (70+) • <strong className="text-amber-400">B</strong> (55+) • <strong className="text-orange-400">C</strong> (40+) • <strong className="text-rose-400">D</strong> (&lt;40)</span>
              </div>
            </div>
          </div>
        </th>

        {/* 3. Coin & OI Rank */}
        <th className="py-2.5 px-1.5 sm:px-2 whitespace-nowrap w-36 sm:w-44">Монета & OI</th>

        {/* 4. Exchanges Pair */}
        <th className="py-2.5 px-1.5 sm:px-2 whitespace-nowrap w-48 sm:w-56">Связка (Long → Short)</th>

        {/* 5. Risk & Break-even */}
        <th className="py-2.5 px-1.5 sm:px-2 whitespace-nowrap w-40 sm:w-48">
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

        {/* 6. Trend */}
        <th className="py-2.5 px-1.5 sm:px-2 text-right whitespace-nowrap w-28 sm:w-32">
          <div className="inline-flex items-center justify-end gap-1 group relative cursor-help">
            <span>Тренд (24ч / 7д)</span>
            <HelpCircle className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400 transition-colors" />

            {/* Tooltip Popup on Hover */}
            <div className="absolute right-0 top-full mt-2 w-72 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl text-[11px] text-slate-300 font-normal normal-case leading-relaxed pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 z-50 text-left whitespace-normal">
              <div className="font-semibold text-cyan-400 text-xs mb-1 flex items-center gap-1.5">
                <span>Динамика спреда фандинга</span>
              </div>
              <p className="mb-2">
                Сравнение краткосрочной и среднесрочной доходности:
              </p>
              <ul className="space-y-1.5 text-slate-300">
                <li>• <strong className="text-emerald-400">Растущий ↗</strong>: спред за 24ч выше 7-дневного (доходность расширяется).</li>
                <li>• <strong className="text-teal-300">Стабильный ➔</strong>: спред удерживается примерно на одном уровне.</li>
                <li>• <strong className="text-rose-400">Затухающий ↘</strong>: спред за 24ч ниже 7-дневного (доходность сужается).</li>
              </ul>
            </div>
          </div>
        </th>

        {/* 7. Current APY */}
        <th className={`py-2.5 px-1.5 sm:px-2 text-right whitespace-nowrap w-28 sm:w-32 ${activeMetric === 'current' ? 'text-amber-400 font-bold' : ''}`}>
          <div className="inline-flex items-center justify-end gap-1 group relative cursor-help">
            <span>Текущий APY</span>
            <HelpCircle className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 transition-colors" />

            {/* Tooltip Popup on Hover */}
            <div className="absolute right-0 top-full mt-2 w-72 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl text-[11px] text-slate-300 font-normal normal-case leading-relaxed pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 z-50 text-left whitespace-normal">
              <div className="font-semibold text-amber-400 text-xs mb-1 flex items-center gap-1.5">
                <span>Мгновенный спред прямо сейчас</span>
              </div>
              <p className="mb-1.5">
                Разница между текущей ставкой на Short-бирже и Long-бирже, приведенная к годовым (APY).
              </p>
              <div className="space-y-1 text-slate-300">
                <div>• Внизу указаны отдельные ставки бирж (<strong className="text-white">Long / Short</strong>).</div>
                <div>• <strong className="text-amber-400">Внимание</strong>: мгновенная ставка динамична и может измениться к следующему расчетному часу.</div>
              </div>
            </div>
          </div>
        </th>

        {/* 8. Trimmed APY */}
        <th className={`py-2.5 px-1.5 sm:px-2 text-right whitespace-nowrap w-28 sm:w-32 ${activeMetric === 'trimmed' ? 'text-emerald-400 font-bold' : ''}`}>
          <div className="inline-flex items-center justify-end gap-1 group relative cursor-help">
            <span>Очищенный APY</span>
            <HelpCircle className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400 transition-colors" />

            {/* Tooltip Popup on Hover */}
            <div className="absolute right-0 top-full mt-2 w-72 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl text-[11px] text-slate-300 font-normal normal-case leading-relaxed pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 z-50 text-left whitespace-normal">
              <div className="font-semibold text-emerald-400 text-xs mb-1 flex items-center gap-1.5">
                <span>Очищенная средняя доходность (Trimmed Mean)</span>
              </div>
              <p className="mb-1.5">
                Математически отсекает верхние 5% экстремальных спайков и аномалий, затем умножается на Win-Rate положительных часов.
              </p>
              <div className="space-y-1 text-slate-300">
                <div>• <strong className="text-emerald-400">Защита от спайков</strong>: показывает реальную доходность без искажений от разовых всплесков.</div>
                <div>• Внизу отображается Win-Rate (% часов с положительным спредом).</div>
              </div>
            </div>
          </div>
        </th>

        {/* 9. Median APY */}
        <th className={`py-2.5 px-1.5 sm:px-2 text-right whitespace-nowrap w-28 sm:w-32 ${activeMetric === 'median' ? 'text-teal-400 font-bold' : ''}`}>
          <div className="inline-flex items-center justify-end gap-1 group relative cursor-help">
            <span>Медианный APY</span>
            <HelpCircle className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-400 transition-colors" />

            {/* Tooltip Popup on Hover */}
            <div className="absolute right-0 top-full mt-2 w-72 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl text-[11px] text-slate-300 font-normal normal-case leading-relaxed pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-150 z-50 text-left whitespace-normal">
              <div className="font-semibold text-teal-400 text-xs mb-1 flex items-center gap-1.5">
                <span>Медианная доходность (50-й перцентиль)</span>
              </div>
              <p className="mb-1.5">
                Значение, выше которого спред находился ровно 50% времени на выбранном горизонте.
              </p>
              <div className="space-y-1 text-slate-300">
                <div>• <strong className="text-teal-400">100% нечувствителен</strong> к любым единичным аномалиям фандинга (даже +1000%).</div>
                <div>• Внизу отображается соотношение прибыльных суток к общему числу дней (Win-Rate дней).</div>
              </div>
            </div>
          </div>
        </th>

        {/* 10. Sharpe Ratio */}
        <th className={`py-2.5 px-1.5 sm:px-2 text-right whitespace-nowrap w-20 sm:w-24 ${activeMetric === 'sharpe' ? 'text-cyan-400 font-bold' : ''}`}>
          <div className="inline-flex items-center justify-end gap-1 group relative cursor-help">
            <span>Шарп</span>
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
                <li>• <strong className="text-emerald-400">Высокий Шарп (&gt;1.5)</strong>: стабильный предсказуемый плюс на дистанции.</li>
                <li>• <strong className="text-amber-400">Штраф за спайки</strong>: случайный выброс (+1000%) раздувает дисперсию и обрушивает Шарп почти до нуля.</li>
              </ul>
            </div>
          </div>
        </th>

        {/* 11. Graph Toggle */}
        <th className="py-2.5 px-1 text-center w-8 sm:w-10">График</th>
      </tr>
    </thead>
  );
}
