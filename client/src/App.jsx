import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import ControlsBar from './components/ControlsBar';
import ForexControlsBar from './components/ForexControlsBar';
import ForexStatsBanner from './components/ForexStatsBanner';
import SqueezeControlsBar from './components/SqueezeControlsBar';
import SqueezeStatsBanner from './components/SqueezeStatsBanner';
import SqueezeTable from './components/SqueezeTable';
import ProgressBar from './components/ProgressBar';
import OpportunitiesTable from './components/OpportunitiesTable';
import ExchangeModal from './components/ExchangeModal';
import NewExchangesBanner from './components/NewExchangesBanner';
import { useAppData } from './hooks/useAppData';
import { useScan } from './hooks/useScan';
import { useForexData } from './hooks/useForexData';
import { useForexScan } from './hooks/useForexScan';
import { useSqueezeData } from './hooks/useSqueezeData';
import { useSqueezeScan } from './hooks/useSqueezeScan';
import { useNewExchanges } from './hooks/useNewExchanges';

export default function App() {
  // Navigation: 'crypto', 'forex', or 'squeeze'
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== 'undefined') {
      if (window.location.hash === '#squeeze') return 'squeeze';
      if (window.location.hash === '#forex') return 'forex';
    }
    return 'crypto';
  });

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      window.location.hash = `#${tab}`;
    }
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [forexSearchQuery, setForexSearchQuery] = useState('');
  const [squeezeSearchQuery, setSqueezeSearchQuery] = useState('');
  const [squeezeThreshold, setSqueezeThreshold] = useState(-5);
  const [squeezeMaxOiRank, setSqueezeMaxOiRank] = useState(2000);
  const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);

  // 1. Shared & Crypto App Data
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

  // 2. Dedicated Forex Data
  const {
    forexOpportunities,
    setForexOpportunities,
    forexLastScannedTime,
    setForexLastScannedTime,
    isLoadingForexData,
    forexCurrencies,
  } = useForexData();

  // 3. Loris New Exchanges Monitor
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

  // 4. Crypto Scan Pipeline
  const handleCryptoScanComplete = useCallback(
    (results) => {
      setOpportunities(results);
      setLastScannedTime(new Date().toISOString());
      recheckExchangesStatus();
    },
    [setOpportunities, setLastScannedTime, recheckExchangesStatus]
  );

  const handleCryptoScanProgress = useCallback(
    (results) => {
      setOpportunities(results);
    },
    [setOpportunities]
  );

  const handleCryptoScanStart = useCallback(() => {
    setOpportunities([]);
    setLastScannedTime(null);
  }, [setOpportunities, setLastScannedTime]);

  const { scanStatus, startScan } = useScan({
    onScanComplete: handleCryptoScanComplete,
    onScanProgress: handleCryptoScanProgress,
    onScanStart: handleCryptoScanStart,
  });

  const handleStartCryptoScan = () => {
    handleCryptoScanStart();
    startScan({
      max_oi_rank: settings.max_oi_rank,
      timeframe: settings.timeframe,
      candidate_count: settings.candidate_count,
      filter_high_volatility: settings.filter_high_volatility,
      max_spread_cap: settings.max_spread_cap,
    });
  };

  // 5. Independent Forex Scan Pipeline
  const handleForexScanComplete = useCallback(
    (results) => {
      setForexOpportunities(results);
      setForexLastScannedTime(new Date().toISOString());
    },
    [setForexOpportunities, setForexLastScannedTime]
  );

  const handleForexScanProgress = useCallback(
    (results) => {
      setForexOpportunities(results);
    },
    [setForexOpportunities]
  );

  const handleForexScanStart = useCallback(() => {
    setForexOpportunities([]);
    setForexLastScannedTime(null);
  }, [setForexOpportunities, setForexLastScannedTime]);

  const { forexScanStatus, startForexScan } = useForexScan({
    onScanComplete: handleForexScanComplete,
    onScanProgress: handleForexScanProgress,
    onScanStart: handleForexScanStart,
  });

  const handleStartForexScan = () => {
    handleForexScanStart();
    startForexScan({
      timeframe: settings.timeframe,
    });
  };

  // 6. Dedicated Squeeze Radar Data & Scan Pipeline
  const {
    squeezeOpportunities,
    setSqueezeOpportunities,
    squeezeLastScannedTime,
    setSqueezeLastScannedTime,
    isLoadingSqueezeData,
  } = useSqueezeData();

  const handleSqueezeScanComplete = useCallback(
    (results) => {
      setSqueezeOpportunities(results);
      setSqueezeLastScannedTime(new Date().toISOString());
    },
    [setSqueezeOpportunities, setSqueezeLastScannedTime]
  );

  const handleSqueezeScanStart = useCallback(() => {
    setSqueezeOpportunities([]);
    setSqueezeLastScannedTime(null);
  }, [setSqueezeOpportunities, setSqueezeLastScannedTime]);

  const { squeezeScanStatus, startScan: startSqueezeScan } = useSqueezeScan({
    onScanComplete: handleSqueezeScanComplete,
    onScanStart: handleSqueezeScanStart,
  });

  const handleStartSqueezeScan = () => {
    handleSqueezeScanStart();
    startSqueezeScan({
      min_negative_bps: squeezeThreshold,
      max_oi_rank: squeezeMaxOiRank,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {/* Header with Page Switcher & Global Status */}
      <Header
        exchanges={exchanges}
        onOpenSettings={() => setIsExchangeModalOpen(true)}
        lastScannedTime={
          activeTab === 'squeeze'
            ? squeezeLastScannedTime
            : activeTab === 'forex'
            ? forexLastScannedTime
            : lastScannedTime
        }
        newExchangesCount={newExchanges.length}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        cryptoCount={opportunities.length}
        forexCount={forexOpportunities.length}
        squeezeCount={squeezeOpportunities.length}
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

        {/* VIEW 1: CRYPTOCURRENCY SCANNER */}
        <div className={activeTab === 'crypto' ? 'space-y-6' : 'hidden'}>
          {/* Controls & Filter Bar */}
          <ControlsBar
            isScanning={scanStatus.isScanning}
            onStartScan={handleStartCryptoScan}
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
            accent="emerald"
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
            onStartScan={handleStartCryptoScan}
            isForex={false}
          />
        </div>

        {/* VIEW 2: FOREX / FIAT SCANNER (COMPLETELY INDEPENDENT) */}
        <div className={activeTab === 'forex' ? 'space-y-6' : 'hidden'}>
          {/* Forex Dedicated Controls Bar (aligned with Crypto controls position) */}
          <ForexControlsBar
            isScanning={forexScanStatus.isScanning}
            onStartScan={handleStartForexScan}
            timeframe={settings.timeframe}
            onChangeTimeframe={(tf) => updateSetting('timeframe', tf)}
            activeMetric={settings.active_metric}
            onChangeActiveMetric={(m) => updateSetting('active_metric', m)}
            searchQuery={forexSearchQuery}
            onSearchChange={setForexSearchQuery}
          />

          {/* Forex Summary Stats Banner */}
          <ForexStatsBanner
            opportunities={forexOpportunities}
            currenciesCount={forexCurrencies.length || 17}
          />

          {/* Forex Live Progress Bar */}
          <ProgressBar
            isScanning={forexScanStatus.isScanning}
            progress={forexScanStatus.progress}
            stepText={forexScanStatus.stepText}
            error={forexScanStatus.error}
            accent="cyan"
          />

          {/* Forex Opportunities Table */}
          <OpportunitiesTable
            opportunities={forexOpportunities}
            activeMetric={settings.active_metric}
            searchQuery={forexSearchQuery}
            exchanges={exchanges}
            timeframe={settings.timeframe}
            isLoading={isLoadingForexData}
            isScanning={forexScanStatus.isScanning}
            onStartScan={handleStartForexScan}
            isForex={true}
            title="Арбитражные связки Forex"
          />
        </div>

        {/* VIEW 3: SHORT SQUEEZE & NEGATIVE FUNDING RADAR */}
        <div className={activeTab === 'squeeze' ? 'space-y-6' : 'hidden'}>
          {/* Squeeze Dedicated Controls Bar */}
          <SqueezeControlsBar
            isScanning={squeezeScanStatus.isScanning}
            onStartScan={handleStartSqueezeScan}
            minNegativeBps={squeezeThreshold}
            onChangeMinNegativeBps={setSqueezeThreshold}
            maxOiRank={squeezeMaxOiRank}
            onChangeMaxOiRank={setSqueezeMaxOiRank}
            searchQuery={squeezeSearchQuery}
            onSearchChange={setSqueezeSearchQuery}
          />

          {/* Squeeze Summary Stats Banner */}
          <SqueezeStatsBanner
            opportunities={squeezeOpportunities}
          />

          {/* Squeeze Live Progress Bar */}
          <ProgressBar
            isScanning={squeezeScanStatus.isScanning}
            progress={squeezeScanStatus.progress}
            stepText={squeezeScanStatus.stepText}
            error={squeezeScanStatus.error}
            accent="rose"
          />

          {/* Squeeze Opportunities Table */}
          <SqueezeTable
            opportunities={squeezeOpportunities}
            isLoading={isLoadingSqueezeData}
            isScanning={squeezeScanStatus.isScanning}
            onStartScan={handleStartSqueezeScan}
            searchQuery={squeezeSearchQuery}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <p>
          Funding Arbitrage Scanner &bull; Криптовалюты & Forex &bull; Источник: Loris.tools &bull; База: SQLite WAL &bull; Автономный расчет связок
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
