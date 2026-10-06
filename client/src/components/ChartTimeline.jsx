import React, { useState, useEffect } from 'react';
import ChartPairSelector from './ChartPairSelector';
import ChartStatCards from './ChartStatCards';
import TimelineGraph from './TimelineGraph';
import { getBreakEven, getTrend } from '../utils/metricsHelper';

export default function ChartTimeline({ item, exchangeNameMap = {}, timeframe = '30d', volatilityData = null }) {
  const [viewMode, setViewMode] = useState('full'); // 'full' = Проценты Long/Short (default), 'delta' = Только дельта
  const [selectedPairIndex, setSelectedPairIndex] = useState(0);

  // Reset selected pair index if coin symbol changes
  useEffect(() => {
    setSelectedPairIndex(0);
  }, [item?.symbol]);

  const pairs = item?.allPairs && item.allPairs.length > 0 ? item.allPairs : [item];
  const activeItem = pairs[selectedPairIndex] || item;

  if (!activeItem || !activeItem.timeline || activeItem.timeline.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-slate-500">
        Нет исторических данных для построения графика
      </div>
    );
  }

  const longDisplayName = exchangeNameMap[activeItem.longExchange] || activeItem.longExchange;
  const shortDisplayName = exchangeNameMap[activeItem.shortExchange] || activeItem.shortExchange;

  // Format data for Recharts
  const chartData = activeItem.timeline.map((pt) => ({
    date: new Date(pt.timestamp).toLocaleDateString([], { month: 'numeric', day: 'numeric', hour: '2-digit' }),
    spreadApy: pt.spreadApy,
    longRateApy: pt.rateLongApy,
    shortRateApy: pt.rateShortApy,
    spreadBps: pt.spreadBps,
  }));

  const hasHighSpike = activeItem.maxSpikeApy > (activeItem.metrics?.trimmed?.trimmedMeanApy || 0) * 2.5;
  const activeBreakEven = getBreakEven(activeItem);
  const activeTrend = getTrend(activeItem);

  return (
    <div className="bg-slate-950/80 p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-5">
      <ChartPairSelector
        symbol={item.symbol}
        pairs={pairs}
        selectedPairIndex={selectedPairIndex}
        onSelectPair={setSelectedPairIndex}
        activeItem={activeItem}
        volatilityData={volatilityData}
        activeBreakEven={activeBreakEven}
        exchangeNameMap={exchangeNameMap}
        getBreakEven={getBreakEven}
      />

      <ChartStatCards
        activeItem={activeItem}
        hasHighSpike={hasHighSpike}
        activeBreakEven={activeBreakEven}
        activeTrend={activeTrend}
      />

      <TimelineGraph
        symbol={item.symbol}
        activeItem={activeItem}
        chartData={chartData}
        timeframe={timeframe}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        longDisplayName={longDisplayName}
        shortDisplayName={shortDisplayName}
      />
    </div>
  );
}
