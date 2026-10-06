import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import ControlsBar from './components/ControlsBar';
import ProgressBar from './components/ProgressBar';
import OpportunitiesTable from './components/OpportunitiesTable';
import ExchangeModal from './components/ExchangeModal';

export default function App() {
  // App state
  const [exchanges, setExchanges] = useState([]);
  const [settings, setSettings] = useState({
    max_oi_rank: 100,
    timeframe: '30d',
    candidate_count: 25,
    active_metric: 'trimmed',
  });

  const [opportunities, setOpportunities] = useState([]);
  const [lastScannedTime, setLastScannedTime] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Scan state
  const [scanStatus, setScanStatus] = useState({
    isScanning: false,
    progress: 0,
    stepText: 'Готов к сканированию',
    error: null,
  });

  // Modal
  const [isExchangeModalOpen, setIsExchangeModalOpen] = useState(false);

  const pollIntervalRef = useRef(null);

  // 1. Initial Data Fetch on Mount
  useEffect(() => {
    fetchSettings();
    fetchExchanges();
    fetchCachedScan();
  }, []);

  // 2. Poll scan status when isScanning is active
  useEffect(() => {
    if (scanStatus.isScanning) {
      pollIntervalRef.current = setInterval(async () => {
        try {
          const res = await fetch('/api/scan/status');
          const data = await res.json();
          if (data.success) {
            setScanStatus({
              isScanning: data.isScanning,
              progress: data.progress,
              stepText: data.stepText,
              error: data.error,
            });

            if (!data.isScanning && data.results) {
              setOpportunities(data.results);
              setLastScannedTime(new Date().toISOString());
              clearInterval(pollIntervalRef.current);
            }
          }
        } catch (e) {
          console.error('Error polling scan status:', e);
        }
      }, 800);
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [scanStatus.isScanning]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings({
          max_oi_rank: Number(data.settings.max_oi_rank || 100),
          timeframe: data.settings.timeframe || '30d',
          candidate_count: Number(data.settings.candidate_count || 25),
          active_metric: data.settings.active_metric || 'trimmed',
        });
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  };

  const fetchExchanges = async () => {
    try {
      const res = await fetch('/api/exchanges');
      const data = await res.json();
      if (data.success && data.exchanges) {
        setExchanges(data.exchanges);
      }
    } catch (e) {
      console.error('Failed to load exchanges:', e);
    }
  };

  const fetchCachedScan = async () => {
    try {
      const res = await fetch('/api/scan/cached');
      const data = await res.json();
      if (data.success && data.cache) {
        setOpportunities(data.cache.results || []);
        setLastScannedTime(data.cache.timestamp);
      }
    } catch (e) {
      console.error('Failed to load cached scan:', e);
    }
  };

  // Actions
  const handleStartScan = async () => {
    setScanStatus({
      isScanning: true,
      progress: 5,
      stepText: 'Инициализация сканирования...',
      error: null,
    });

    try {
      const res = await fetch('/api/scan/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          max_oi_rank: settings.max_oi_rank,
          timeframe: settings.timeframe,
          candidate_count: settings.candidate_count,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setScanStatus({
          isScanning: false,
          progress: 0,
          stepText: 'Ошибка запуска',
          error: data.error || 'Не удалось запустить сканирование',
        });
      }
    } catch (err) {
      setScanStatus({
        isScanning: false,
        progress: 0,
        stepText: 'Ошибка сети',
        error: err.message,
      });
    }
  };

  const handleUpdateSetting = async (key, value) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
    } catch (e) {
      console.error('Failed to save setting:', e);
    }
  };

  const handleToggleExchange = async (id, is_enabled) => {
    // Optimistic UI update
    setExchanges((prev) =>
      prev.map((e) => (e.id === id ? { ...e, is_enabled: is_enabled ? 1 : 0 } : e))
    );
    try {
      const res = await fetch(`/api/exchanges/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled }),
      });
      const data = await res.json();
      if (data.success && data.exchanges) {
        setExchanges(data.exchanges);
      }
    } catch (e) {
      console.error('Failed to toggle exchange:', e);
    }
  };

  const handleBatchUpdateExchanges = async (updates) => {
    try {
      const res = await fetch('/api/exchanges/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: updates }),
      });
      const data = await res.json();
      if (data.success && data.exchanges) {
        setExchanges(data.exchanges);
      }
    } catch (e) {
      console.error('Failed to batch update exchanges:', e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-slate-950">
      {/* Header */}
      <Header
        exchanges={exchanges}
        onOpenSettings={() => setIsExchangeModalOpen(true)}
        lastScannedTime={lastScannedTime}
      />

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Controls & Filter Bar */}
        <ControlsBar
          isScanning={scanStatus.isScanning}
          onStartScan={handleStartScan}
          maxOiRank={settings.max_oi_rank}
          onChangeMaxOiRank={(r) => handleUpdateSetting('max_oi_rank', r)}
          timeframe={settings.timeframe}
          onChangeTimeframe={(tf) => handleUpdateSetting('timeframe', tf)}
          candidateCount={settings.candidate_count}
          onChangeCandidateCount={(c) => handleUpdateSetting('candidate_count', c)}
          activeMetric={settings.active_metric}
          onChangeActiveMetric={(m) => handleUpdateSetting('active_metric', m)}
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
        onToggleExchange={handleToggleExchange}
        onBatchUpdate={handleBatchUpdateExchanges}
      />
    </div>
  );
}
