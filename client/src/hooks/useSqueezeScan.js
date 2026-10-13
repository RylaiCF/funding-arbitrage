import { useState, useCallback } from 'react';

/**
 * Custom hook to handle Squeeze Radar scanning lifecycle and parameters.
 */
export function useSqueezeScan({ onScanComplete, onScanStart } = {}) {
  const [squeezeScanStatus, setSqueezeScanStatus] = useState({
    isScanning: false,
    progress: 0,
    stepText: 'Готов к сканированию радара сквизов',
    error: null,
  });

  const startScan = useCallback(
    async (params = {}) => {
      setSqueezeScanStatus({
        isScanning: true,
        progress: 20,
        stepText: 'Запрос живого снимка со всех 44 бирж...',
        error: null,
      });

      if (onScanStart) {
        onScanStart();
      }

      try {
        setSqueezeScanStatus((prev) => ({
          ...prev,
          progress: 50,
          stepText: 'Скрининг отрицательных ставок и шорт-сквизов...',
        }));

        const res = await fetch('/api/squeeze/scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });

        const data = await res.json();

        if (!data.success) {
          throw new Error(data.error || 'Ошибка при сканировании сквизов');
        }

        setSqueezeScanStatus({
          isScanning: false,
          progress: 100,
          stepText: `Найдено ${data.results?.length || 0} сквизов!`,
          error: null,
        });

        if (onScanComplete && Array.isArray(data.results)) {
          onScanComplete(data.results);
        }

        return data.results;
      } catch (err) {
        setSqueezeScanStatus({
          isScanning: false,
          progress: 0,
          stepText: `Ошибка: ${err.message}`,
          error: err.message,
        });
        throw err;
      }
    },
    [onScanComplete, onScanStart]
  );

  return {
    squeezeScanStatus,
    startScan,
  };
}
