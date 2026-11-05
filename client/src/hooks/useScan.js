import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook to handle scanning lifecycle, progress polling, and incremental coin updates.
 */
export function useScan({ onScanComplete, onScanProgress, onScanStart } = {}) {
  const [scanStatus, setScanStatus] = useState({
    isScanning: false,
    progress: 0,
    stepText: 'Готов к сканированию',
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

            // Progressively update coins as they are scanned one by one
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
          console.error('Error polling scan status:', e);
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
  }, [scanStatus.isScanning]);

  // Check if a scan was already running on mount
  const checkScanStatusOnMount = useCallback(async () => {
    try {
      const res = await fetch('/api/scan/status');
      const data = await res.json();
      if (data.success) {
        if (data.isScanning) {
          setScanStatus({
            isScanning: true,
            progress: data.progress ?? 5,
            stepText: data.stepText || 'Сканирование выполняется...',
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
      console.error('Failed to check scan status on mount:', e);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkScanStatusOnMount();
    }, 0);
    return () => clearTimeout(timer);
  }, [checkScanStatusOnMount]);

  // Start new scan
  const startScan = useCallback(async (params) => {
    setScanStatus({
      isScanning: true,
      progress: 5,
      stepText: 'Запуск сканирования...',
      error: null,
    });

    if (onScanStartRef.current) {
      onScanStartRef.current();
    } else if (onScanProgressRef.current) {
      onScanProgressRef.current([]);
    }

    try {
      const res = await fetch('/api/scan/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!data.success) {
        const errorMsg = data.error || 'Ошибка запуска сканирования';
        setScanStatus((prev) => ({
          ...prev,
          isScanning: false,
          error: errorMsg,
          stepText: `Ошибка: ${errorMsg}`,
        }));
      }
    } catch (e) {
      const errorMsg = e.message || 'Ошибка соединения с сервером';
      setScanStatus((prev) => ({
        ...prev,
        isScanning: false,
        error: errorMsg,
        stepText: `Ошибка: ${errorMsg}`,
      }));
    }
  }, []);

  return {
    scanStatus,
    startScan,
    checkScanStatusOnMount,
  };
}
