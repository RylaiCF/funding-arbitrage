const db = require('./db');
const lorisClient = require('./lorisClient');

/**
 * Safely extracts unique exchange records from Loris Tools API live funding snapshot.
 * Supports multiple payload structures: exchange_names array, exchanges list, funding_rates keys.
 */
function extractLorisExchanges(liveData) {
  if (!liveData) return [];
  const map = new Map();

  // 1. Primary source: detailed exchange_names array { name, display, interval }
  if (Array.isArray(liveData.exchanges?.exchange_names)) {
    for (const item of liveData.exchanges.exchange_names) {
      if (item && item.name) {
        const id = String(item.name).trim().toLowerCase();
        map.set(id, {
          id,
          display_name: item.display || item.name.toUpperCase(),
          interval_hours: Number(item.interval) || 8,
        });
      }
    }
  }

  // 2. Secondary source: exchanges array of names
  if (Array.isArray(liveData.exchanges?.exchanges)) {
    for (const name of liveData.exchanges.exchanges) {
      const id = String(name).trim().toLowerCase();
      if (!map.has(id)) {
        map.set(id, {
          id,
          display_name: String(name).toUpperCase(),
          interval_hours: 8,
        });
      }
    }
  }

  // 3. Fallback: keys from funding_rates object
  if (liveData.funding_rates && typeof liveData.funding_rates === 'object') {
    for (const key of Object.keys(liveData.funding_rates)) {
      const id = key.trim().toLowerCase();
      if (!map.has(id)) {
        map.set(id, {
          id,
          display_name: key.toUpperCase(),
          interval_hours: 8,
        });
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Returns current monitoring status from database without network roundtrip.
 */
function getMonitoringStatus() {
  const allNew = db.getDetectedNewExchanges();
  const settings = db.getAllSettings();
  const supported = db.getAllExchanges();

  const unacknowledged = allNew.filter((e) => !e.is_dismissed);

  return {
    newExchanges: allNew,
    unacknowledgedExchanges: unacknowledged,
    count: allNew.length,
    unacknowledgedCount: unacknowledged.length,
    hasNew: allNew.length > 0,
    hasUnacknowledged: unacknowledged.length > 0,
    lastCheckedAt: settings.last_exchange_check || null,
    supportedCount: supported.length,
  };
}

/**
 * Synchronizes detected new exchanges using an existing liveData snapshot
 * (e.g. captured during a market scan).
 */
function syncFromLiveData(liveData) {
  try {
    const lorisExchanges = extractLorisExchanges(liveData);
    if (lorisExchanges.length > 0) {
      db.syncDetectedNewExchanges(lorisExchanges);
      const nowIso = new Date().toISOString();
      db.updateSettings({ last_exchange_check: nowIso });
    }
  } catch (err) {
    console.warn('[ExchangeMonitor] Error syncing from live data:', err.message);
  }
  return getMonitoringStatus();
}

/**
 * Contacts Loris.tools to query live funding & exchanges, comparing them
 * against currently supported exchanges in SQLite.
 */
async function checkLorisExchanges(forceRefresh = false) {
  try {
    console.log(`[ExchangeMonitor] Checking Loris.tools for newly added exchanges (forceRefresh=${forceRefresh})...`);
    const liveData = await lorisClient.getLiveFunding(forceRefresh);
    const lorisExchanges = extractLorisExchanges(liveData);

    const nowIso = new Date().toISOString();
    db.syncDetectedNewExchanges(lorisExchanges);
    db.updateSettings({ last_exchange_check: nowIso });

    const status = getMonitoringStatus();
    status.lorisTotalCount = lorisExchanges.length;

    if (status.count > 0) {
      console.log(`[ExchangeMonitor] Detected ${status.count} new exchanges on Loris.tools: ${status.newExchanges.map(e => e.display_name).join(', ')}`);
    } else {
      console.log('[ExchangeMonitor] All Loris.tools exchanges are currently known and supported.');
    }

    return status;
  } catch (err) {
    console.error('[ExchangeMonitor] Check failed:', err.message);
    const fallback = getMonitoringStatus();
    fallback.error = err.message;
    return fallback;
  }
}

/**
 * Dismisses one or all new exchange notifications.
 */
function dismissNewExchanges(id = 'all') {
  db.setNewExchangeDismissed(id, true);
  return getMonitoringStatus();
}

/**
 * Undismisses one or all new exchange notifications (e.g. user wants to re-flag).
 */
function undismissNewExchanges(id = 'all') {
  db.setNewExchangeDismissed(id, false);
  return getMonitoringStatus();
}

/**
 * Ensures an exchange icon exists locally; if not, attempts to download it from Loris.tools.
 */
async function ensureExchangeIcon(id) {
  const fs = require('fs');
  const path = require('path');
  const axios = require('axios');

  const normId = String(id || '').trim().toLowerCase();
  if (!normId) return;

  const publicDir = path.join(__dirname, '..', 'client', 'public', 'images', 'exchanges');
  const distDir = path.join(__dirname, '..', 'client', 'dist', 'images', 'exchanges');

  const targetPublicPng = path.join(publicDir, `${normId}.png`);
  if (fs.existsSync(targetPublicPng)) return;

  try {
    const res = await axios.get(`https://loris.tools/images/exchanges/${normId}.png`, {
      responseType: 'arraybuffer',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 5000,
    });

    if (res.data && res.data.length > 0) {
      if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
      fs.writeFileSync(targetPublicPng, Buffer.from(res.data));

      if (fs.existsSync(distDir)) {
        fs.writeFileSync(path.join(distDir, `${normId}.png`), Buffer.from(res.data));
      }
      console.log(`[ExchangeMonitor] Downloaded icon for exchange '${normId}'`);
    }
  } catch (err) {
    // Non-fatal if icon is not hosted on Loris
    console.warn(`[ExchangeMonitor] Could not download icon for '${normId}':`, err.message);
  }
}

/**
 * Integrates one or all detected exchanges into the supported exchanges list.
 */
async function integrateExchange(id = 'all') {
  const newExchanges = db.getDetectedNewExchanges();
  const targetIds = (id === 'all')
    ? newExchanges.map((e) => e.id)
    : [id];

  const integrated = [];
  for (const tid of targetIds) {
    const item = db.integrateDetectedExchange(tid);
    if (item) {
      integrated.push(item);
      await ensureExchangeIcon(tid);
    }
  }

  return {
    success: true,
    integrated,
    ...getMonitoringStatus(),
    exchanges: db.getAllExchanges(),
  };
}

module.exports = {
  extractLorisExchanges,
  getMonitoringStatus,
  syncFromLiveData,
  checkLorisExchanges,
  dismissNewExchanges,
  undismissNewExchanges,
  ensureExchangeIcon,
  integrateExchange,
};
