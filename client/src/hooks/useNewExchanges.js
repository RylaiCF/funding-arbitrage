import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook to manage tracking and notifications for newly detected exchanges on Loris.tools.
 */
export function useNewExchanges() {
  const [newExchanges, setNewExchanges] = useState([]);
  const [unacknowledgedExchanges, setUnacknowledgedExchanges] = useState([]);
  const [lastCheckedAt, setLastCheckedAt] = useState(null);
  const [supportedCount, setSupportedCount] = useState(0);
  const [lorisTotalCount, setLorisTotalCount] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState(null);
  // Session dismiss state so user can close the banner locally without permanently forgetting
  const [isBannerDismissedSession, setIsBannerDismissedSession] = useState(false);

  // 1. Fetch current detected new exchanges from backend
  const fetchNewExchangesStatus = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/exchanges/new');
      const data = await res.json();
      if (data.success) {
        setNewExchanges(data.newExchanges || []);
        setUnacknowledgedExchanges(data.unacknowledgedExchanges || []);
        setLastCheckedAt(data.lastCheckedAt || null);
        setSupportedCount(data.supportedCount || 0);
        if (data.lorisTotalCount) setLorisTotalCount(data.lorisTotalCount);
      }
    } catch (err) {
      console.warn('Failed to fetch new exchanges status:', err);
      setError(err.message);
    }
  }, []);

  // 2. Trigger fresh check against Loris.tools
  const checkNow = useCallback(async (forceRefresh = true) => {
    setIsChecking(true);
    setError(null);
    try {
      const res = await fetch('/api/exchanges/check-new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRefresh }),
      });
      const data = await res.json();
      if (data.success) {
        setNewExchanges(data.newExchanges || []);
        setUnacknowledgedExchanges(data.unacknowledgedExchanges || []);
        setLastCheckedAt(data.lastCheckedAt || null);
        setSupportedCount(data.supportedCount || 0);
        if (data.lorisTotalCount) setLorisTotalCount(data.lorisTotalCount);
        // If new unacknowledged exchanges appeared, re-show banner
        if (data.unacknowledgedCount > 0) {
          setIsBannerDismissedSession(false);
        }
        return data;
      }
    } catch (err) {
      console.error('Failed to trigger Loris.tools exchange check:', err);
      setError(err.message);
    } finally {
      setIsChecking(false);
    }
  }, []);

  // 3. Dismiss new exchanges banner (persists in backend DB and session)
  const dismiss = useCallback(async (id = 'all') => {
    setIsBannerDismissedSession(true);
    try {
      const res = await fetch('/api/exchanges/new/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        setNewExchanges(data.newExchanges || []);
        setUnacknowledgedExchanges(data.unacknowledgedExchanges || []);
      }
    } catch (err) {
      console.error('Failed to dismiss new exchanges notification:', err);
    }
  }, []);

  // 4. Undismiss new exchanges banner (re-opens banner)
  const undismiss = useCallback(async (id = 'all') => {
    setIsBannerDismissedSession(false);
    try {
      const res = await fetch('/api/exchanges/new/undismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        setNewExchanges(data.newExchanges || []);
        setUnacknowledgedExchanges(data.unacknowledgedExchanges || []);
      }
    } catch (err) {
      console.error('Failed to undismiss new exchanges notification:', err);
    }
  }, []);

  // 5. Integrate newly detected exchanges into supported list
  const integrateExchange = useCallback(async (id = 'all') => {
    try {
      const res = await fetch('/api/exchanges/integrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        setNewExchanges(data.newExchanges || []);
        setUnacknowledgedExchanges(data.unacknowledgedExchanges || []);
        setSupportedCount(data.supportedCount || 0);
        return data;
      }
    } catch (err) {
      console.error('Failed to integrate exchange:', err);
    }
    return null;
  }, []);

  // Initial load on mount
  useEffect(() => {
    fetchNewExchangesStatus();
  }, [fetchNewExchangesStatus]);

  const hasNew = newExchanges.length > 0;
  const hasUnacknowledged = unacknowledgedExchanges.length > 0;
  const isBannerVisible = hasUnacknowledged && !isBannerDismissedSession;

  return {
    newExchanges,
    unacknowledgedExchanges,
    newCount: newExchanges.length,
    unacknowledgedCount: unacknowledgedExchanges.length,
    hasNew,
    hasUnacknowledged,
    isBannerVisible,
    lastCheckedAt,
    supportedCount,
    lorisTotalCount,
    isChecking,
    error,
    checkNow,
    dismiss,
    undismiss,
    integrateExchange,
    recheckStatus: fetchNewExchangesStatus,
  };
}
