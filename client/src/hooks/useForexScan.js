import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook to handle independent Forex scanning lifecycle, progress polling, and error tracking.
 */
export function useForexScan({ onScanComplete } = {}) {
  const [forexScanStatus, setForexScanStatus] = useState({
    isScanning: false,
    progress: 0,
    stepText: 'Готов к сканированию Forex',
    error: null,
  });

  const pollIntervalRef = useRef(null);

  // Poll scan status while scanning is active
  useEffect(() => {
    if (forexScanStatus.isScanning) {
      pollIntervalRef.current = setInterval(async () => {
        try {
          const res = await fetch('/api/forex/scan/status');
          const data = await res.json();
          if (data.success) {
            setForexScanStatus({
              isScanning: data.isScanning,
              progress: data.progress,
              stepText: data.stepText,
              error: data.error,
            });

            if (!data.isScanning && data.results) {
              if (onScanComplete) {
                onScanComplete(data.results);
              }
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
              }
            }
          }
        } catch (e) {
          console.error('Error polling forex scan status:', e);
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
  }, [forexScanStatus.isScanning, onScanComplete]);

  // Check if a forex scan was already running on mount
  const checkScanStatusOnMount = useCallback(async () => {
    try {
      const res = await fetch('/api/forex/scan/status');
      const data = await res.json();
      if (data.success) {
        if (data.isScanning) {
          setForexScanStatus({
            isScanning: true,
            progress: data.progress ?? 5,
            stepText: data.stepText || 'Сканирование Forex выполняется...',
            error: data.error || null,
          });
        } else if (data.results && data.results.length > 0 && onScanComplete) {
          onScanComplete(data.results);
        }
      }
    } catch (e) {
      console.error('Failed to check forex scan status on mount:', e);
    }
  }, [onScanComplete]);

  useEffect(() => {
    checkScanStatusOnMount();
  }, [checkScanStatusOnMount]);

  // Start new forex scan
  const startForexScan = useCallback(async (params = {}) => {
    setForexScanStatus({
      isScanning: true,
      progress: 5,
      stepText: 'Запуск сканирования Forex...',
      error: null,
    });

    try {
      const res = await fetch('/api/forex/scan/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!data.success) {
        setForexScanStatus((prev) => ({
          ...prev,
          isScanning: false,
          error: data.error || 'Ошибка запуска сканирования Forex',
        }));
      }
    } catch (e) {
      setForexScanStatus((prev) => ({
        ...prev,
        isScanning: false,
        error: e.message,
      }));
    }
  }, []);

  return {
    forexScanStatus,
    startForexScan,
    checkScanStatusOnMount,
  };
}
