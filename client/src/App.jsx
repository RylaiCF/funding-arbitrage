import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import ControlsBar from './components/ControlsBar';
import ProgressBar from './components/ProgressBar';
import OpportunitiesTable from './components/OpportunitiesTable';
import ExchangeModal from './components/ExchangeModal';
import { useAppData } from './hooks/useAppData';
import { useScan } from './hooks/useScan';

export default function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);

  const {
    settings,
    updateSetting,
    exchanges,
    toggleExchange,
    batchUpdateExchanges,
    opportunities,
    setOpportunities,
    lastScannedTime,
    setLastScannedTime,
    isLoadingData,
  } = useAppData();

  const handleScanComplete = useCallback(
    (results) => {
      setOpportunities(results);
      setLastScannedTime(new Date().toISOString());
    },
    [setOpportunities, setLastScannedTime]
  );

  const { scanStatus, startScan } = useScan({ onScanComplete: handleScanComplete });

  const handleStartScan = () => {
    startScan({
      max_oi_rank: settings.max_oi_rank,
      timeframe: settings.timeframe,
      candidate_count: settings.candidate_count,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950 min-w-fit">
      {/* Header */}
      <Header
        exchanges={exchanges}
        onOpenSettings={() => setIsExchangeModalOpen(true)}
        lastScannedTime={lastScannedTime}
      />

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1560px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 min-w-fit">
        {/* Controls & Filter Bar */}
        <ControlsBar
          isScanning={scanStatus.isScanning}
          onStartScan={handleStartScan}
          maxOiRank={settings.max_oi_rank}
          onChangeMaxOiRank={(r) => updateSetting('max_oi_rank', r)}
          timeframe={settings.timeframe}
          onChangeTimeframe={(tf) => updateSetting('timeframe', tf)}
          candidateCount={settings.candidate_count}
          onChangeCandidateCount={(c) => updateSetting('candidate_count', c)}
          activeMetric={settings.active_metric}
          onChangeActiveMetric={(m) => updateSetting('active_metric', m)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Live Progress Bar when scanning or on error */}
        <ProgressBar
          isScanning={scanStatus.isScanning}
          progress={scanStatus.progress}
          stepText={scanStatus.stepText}
          error={scanStatus.error}
        />

        {/* Opportunities Table with Expandable Charts */}
        <OpportunitiesTable
          opportunities={opportunities}
          activeMetric={settings.active_metric}
          searchQuery={searchQuery}
          exchanges={exchanges}
          timeframe={settings.timeframe}
          isLoading={isLoadingData}
          isScanning={scanStatus.isScanning}
          onStartScan={handleStartScan}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <p>
          Funding Arbitrage Scanner &bull; Источник данных: Loris.tools &bull; База данных: SQLite WAL &bull; Автоматическая защита от Rate-Limits
        </p>
      </footer>

      {/* Exchange Selection Modal */}
      <ExchangeModal
        isOpen={isExchangeModalOpen}
        onClose={() => setIsExchangeModalOpen(false)}
        exchanges={exchanges}
        onToggleExchange={toggleExchange}
        onBatchUpdate={batchUpdateExchanges}
      />
    </div>
  );
}
