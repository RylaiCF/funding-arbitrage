import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import ControlsBar from './components/ControlsBar';
import ProgressBar from './components/ProgressBar';
import OpportunitiesTable from './components/OpportunitiesTable';
import ExchangeModal from './components/ExchangeModal';
import NewExchangesBanner from './components/NewExchangesBanner';
import { useAppData } from './hooks/useAppData';
import { useScan } from './hooks/useScan';
import { useNewExchanges } from './hooks/useNewExchanges';

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
    fetchExchanges,
  } = useAppData();

  const {
    newExchanges,
    unacknowledgedExchanges,
    isBannerVisible,
    lastCheckedAt: lastExchangeCheckTime,
    dismiss: dismissNewExchanges,
    integrateExchange,
    recheckStatus: recheckExchangesStatus,
  } = useNewExchanges();

  const handleIntegrateExchange = useCallback(
    async (id = 'all') => {
      const res = await integrateExchange(id);
      if (res && res.success) {
        await fetchExchanges();
      }
    },
    [integrateExchange, fetchExchanges]
  );

  const handleScanComplete = useCallback(
    (results) => {
      setOpportunities(results);
      setLastScannedTime(new Date().toISOString());
      recheckExchangesStatus();
    },
    [setOpportunities, setLastScannedTime, recheckExchangesStatus]
  );

  const { scanStatus, startScan } = useScan({ onScanComplete: handleScanComplete });

  const handleStartScan = () => {
    startScan({
      max_oi_rank: settings.max_oi_rank,
      timeframe: settings.timeframe,
      candidate_count: settings.candidate_count,
      filter_high_volatility: settings.filter_high_volatility,
      max_spread_cap: settings.max_spread_cap,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {/* Header */}
      <Header
        exchanges={exchanges}
        onOpenSettings={() => setIsExchangeModalOpen(true)}
        lastScannedTime={lastScannedTime}
        newExchangesCount={newExchanges.length}
      />

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1560px] w-full mx-auto px-3 sm:px-4 lg:px-6 xl:px-8 py-6 space-y-6">
        {/* Notification Banner for Newly Discovered Loris.tools Exchanges */}
        {isBannerVisible && (
          <NewExchangesBanner
            newExchanges={unacknowledgedExchanges}
            onOpenModal={() => setIsExchangeModalOpen(true)}
            onDismiss={() => dismissNewExchanges('all')}
            onIntegrate={handleIntegrateExchange}
          />
        )}

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
          filterHighVolatility={settings.filter_high_volatility}
          onChangeFilterHighVolatility={(v) => updateSetting('filter_high_volatility', v)}
          maxSpreadCap={settings.max_spread_cap}
          onChangeMaxSpreadCap={(v) => updateSetting('max_spread_cap', v)}
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
        newExchanges={newExchanges}
        lastCheckedAt={lastExchangeCheckTime}
        onIntegrate={handleIntegrateExchange}
      />
    </div>
  );
}
