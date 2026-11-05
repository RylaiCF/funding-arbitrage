import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook to handle independent Forex scanning lifecycle, progress polling, and incremental coin updates.
 */
export function useForexScan({ onScanComplete, onScanProgress, onScanStart } = {}) {
  const [forexScanStatus, setForexScanStatus] = useState({
    isScanning: false,
    progress: 0,
    stepText: 'Готов к сканированию Forex',
    error: null,
  });

  const pollIntervalRef = useRef(null);
  const onScanCompleteRef = useRef(onScanComplete);
  const onScanProgressRef = useRef(onScanProgress);
  const onScanStartRef = useRef(onScanStart);

  useEffect(() => {
    onScanCompleteRef.current = onScanComplete;
    onScanProgressRef.current = onScanProgress;
    onScanStartRef.current = onScanStart;
  });

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

            // Progressively update forex currencies as they are scanned one by one
            if (data.isScanning && Array.isArray(data.results)) {
              if (onScanProgressRef.current) {
                onScanProgressRef.current(data.results);
              }
            }

            if (!data.isScanning) {
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
              }
              if (data.results && onScanCompleteRef.current) {
                onScanCompleteRef.current(data.results);
              }
            }
          }
        } catch (e) {
          console.error('Error polling forex scan status:', e);
        }
      }, 2000);
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
  }, [forexScanStatus.isScanning]);

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
          if (Array.isArray(data.results) && onScanProgressRef.current) {
            onScanProgressRef.current(data.results);
          }
        } else if (data.results && data.results.length > 0 && onScanCompleteRef.current) {
          onScanCompleteRef.current(data.results);
        }
      }
    } catch (e) {
      console.error('Failed to check forex scan status on mount:', e);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkScanStatusOnMount();
    }, 0);
    return () => clearTimeout(timer);
  }, [checkScanStatusOnMount]);

  // Start new forex scan
  const startForexScan = useCallback(async (params = {}) => {
    setForexScanStatus({
      isScanning: true,
      progress: 5,
      stepText: 'Запуск сканирования Forex...',
      error: null,
    });

    if (onScanStartRef.current) {
      onScanStartRef.current();
    } else if (onScanProgressRef.current) {
      onScanProgressRef.current([]);
    }

    try {
      const res = await fetch('/api/forex/scan/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!data.success) {
        const errorMsg = data.error || 'Ошибка запуска сканирования Forex';
        setForexScanStatus((prev) => ({
          ...prev,
          isScanning: false,
          error: errorMsg,
          stepText: `Ошибка: ${errorMsg}`,
        }));
      }
    } catch (e) {
      const errorMsg = e.message || 'Ошибка соединения с сервером';
      setForexScanStatus((prev) => ({
        ...prev,
        isScanning: false,
        error: errorMsg,
        stepText: `Ошибка: ${errorMsg}`,
      }));
    }
  }, []);

  return {
    forexScanStatus,
    startForexScan,
    checkScanStatusOnMount,
  };
}
