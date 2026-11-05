import React from 'react';
import TableSkeleton from './TableSkeleton';
import TableEmpty from './TableEmpty';
import TableHead from './TableHead';
import TableRow from './TableRow';
import PresetTabs from './PresetTabs';
import { useVolatility } from '../hooks/useVolatility';
import { useOpportunities } from '../hooks/useOpportunities';

export default function OpportunitiesTable({
  opportunities = [],
  activeMetric = 'trimmed',
  searchQuery = '',
  exchanges = [],
  timeframe = '30d',
  isLoading = false,
  isScanning = false,
  onStartScan,
  isForex = false,
  title,
  onRemoveCustomCoin,
}) {
  // 1. Fetch 24h price volatility for visible coins
  const { volatilityMap } = useVolatility(opportunities);

  // 2. Encapsulated opportunities sorting, preset filtering, search, and row expansion
  const {
    processedCoins,
    filteredCoins,
    activePreset,
    setActivePreset,
    presets,
    expandedSymbol,
    toggleExpandSymbol,
    exchangeNameMap,
  } = useOpportunities({
    opportunities,
    activeMetric,
    searchQuery,
    exchanges,
    timeframe,
    volatilityMap,
  });

  const tableTitle = title || (isForex ? 'Арбитражные связки Forex' : 'Лучшие арбитражные связки');

  // 3. Loading skeleton state on initial mount or while scanning with 0 results yet
  if (isLoading || (isScanning && opportunities.length === 0)) {
    return (
      <TableSkeleton
        title={tableTitle}
        badgeText={isScanning ? 'Сканирование...' : 'Загрузка данных...'}
        subtitle={
          isScanning
            ? (isForex ? 'Анализ рынка и расчет первых валют...' : 'Анализ рынка и расчет первых связок...')
            : 'Считывание связок из кэша...'
        }
        isForex={isForex}
      />
    );
  }

  // 4. Truly empty state: no scan has been executed yet
  if (opportunities.length === 0) {
    return <TableEmpty type="no_scan" onStartScan={onStartScan} isForex={isForex} />;
  }

  const unitName = isForex
    ? (processedCoins.length === 1 ? 'валюта' : 'валют')
    : (processedCoins.length === 1 ? 'монета' : 'монет');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl w-full relative z-0">
      {/* Table Title, Presets Bar and Coin Counter */}
      <div className="p-4 sm:px-6 border-b border-slate-800 rounded-t-2xl flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        <div className="flex flex-col">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-bold text-white tracking-tight">
              {tableTitle}
            </h2>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
              {activePreset === 'all'
                ? `${processedCoins.length} ${unitName}`
                : `${filteredCoins.length} из ${processedCoins.length}`}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 hidden xl:block mt-0.5">
            Нажмите на строку, чтобы раскрыть детали и альтернативные связки
          </div>
        </div>

        {/* Quick Presets tabs */}
        <PresetTabs
          presets={presets}
          activePreset={activePreset}
          onSelectPreset={setActivePreset}
        />
      </div>

      {/* Main Table: Natural document scroll, zero internal scrollbar trap */}
      <table className="w-full text-left border-collapse text-xs rounded-b-2xl">
        <TableHead activeMetric={activeMetric} />
        <tbody className="divide-y divide-slate-800/60 [&>tr:last-child>td:first-child]:rounded-bl-2xl [&>tr:last-child>td:last-child]:rounded-br-2xl">
          {filteredCoins.length === 0 ? (
            <TableEmpty
              type="no_results"
              activePreset={activePreset}
              activePresetLabel={presets.find((p) => p.id === activePreset)?.label || ''}
              totalCoinsCount={processedCoins.length}
              onResetPreset={() => setActivePreset('all')}
            />
          ) : (
            filteredCoins.map((item, idx) => (
              <TableRow
                key={item.symbol}
                item={item}
                idx={idx}
                isExpanded={expandedSymbol === item.symbol}
                onToggleExpand={() => toggleExpandSymbol(item.symbol)}
                activeMetric={activeMetric}
                exchangeNameMap={exchangeNameMap}
                volatilityMap={volatilityMap}
                timeframe={timeframe}
                onRemoveCustomCoin={onRemoveCustomCoin}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
