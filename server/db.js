const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'funding_arb.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency and reliability
db.pragma('journal_mode = WAL');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS exchanges (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    type TEXT NOT NULL,
    interval_hours INTEGER NOT NULL DEFAULT 8,
    is_enabled INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS scan_cache (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    timestamp TEXT NOT NULL,
    params TEXT NOT NULL,
    results_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS forex_scan_cache (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    timestamp TEXT NOT NULL,
    params TEXT NOT NULL,
    results_json TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS historical_cache (
    symbol TEXT,
    timeframe TEXT,
    data_json TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (symbol, timeframe)
  );

  CREATE TABLE IF NOT EXISTS loris_new_exchanges (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    interval_hours INTEGER NOT NULL DEFAULT 8,
    detected_at TEXT NOT NULL,
    is_dismissed INTEGER NOT NULL DEFAULT 0
  );
`);

// Initial default exchanges list
const DEFAULT_EXCHANGES = [
  { id: 'arcus', display_name: 'Arcus', type: 'dex', interval_hours: 1 },
  { id: 'aster', display_name: 'Aster', type: 'dex', interval_hours: 8 },
  { id: 'binance', display_name: 'Binance', type: 'cex', interval_hours: 8 },
  { id: 'bingx', display_name: 'BingX', type: 'cex', interval_hours: 8 },
  { id: 'bitget', display_name: 'Bitget', type: 'cex', interval_hours: 8 },
  { id: 'bluefin', display_name: 'Bluefin', type: 'dex', interval_hours: 1 },
  { id: 'bullet', display_name: 'Bullet', type: 'dex', interval_hours: 1 },
  { id: 'bybit', display_name: 'Bybit', type: 'cex', interval_hours: 4 },
  { id: 'coinbaseus', display_name: 'Coinbase US', type: 'cex', interval_hours: 1 },
  { id: 'cryptocom', display_name: 'Crypto.com', type: 'cex', interval_hours: 1 },
  { id: 'decibel', display_name: 'Decibel', type: 'dex', interval_hours: 1 },
  { id: 'deribit', display_name: 'Deribit', type: 'cex', interval_hours: 8 },
  { id: 'edgex', display_name: 'EdgeX', type: 'dex', interval_hours: 4 },
  { id: 'entropyio', display_name: 'EntropyIO', type: 'dex', interval_hours: 1 },
  { id: 'extended', display_name: 'Extended', type: 'dex', interval_hours: 1 },
  { id: 'gateio', display_name: 'Gate.io', type: 'cex', interval_hours: 8 },
  { id: 'grvt', display_name: 'GRVT', type: 'dex', interval_hours: 8 },
  { id: 'hibachi', display_name: 'Hibachi', type: 'dex', interval_hours: 8 },
  { id: 'huobi', display_name: 'HTX', type: 'cex', interval_hours: 8 },
  { id: 'hyperliquid', display_name: 'Hyperliquid', type: 'dex', interval_hours: 1 },
  { id: 'kalshi', display_name: 'Kalshi', type: 'cex', interval_hours: 8 },
  { id: 'kinetiq', display_name: 'Kinetiq', type: 'dex', interval_hours: 1 },
  { id: 'kucoin', display_name: 'KuCoin', type: 'cex', interval_hours: 8 },
  { id: 'lighter', display_name: 'Lighter', type: 'dex', interval_hours: 1 },
  { id: 'mexc', display_name: 'MEXC', type: 'cex', interval_hours: 8 },
  { id: 'nado', display_name: 'Nado', type: 'dex', interval_hours: 1 },
  { id: 'okx', display_name: 'OKX', type: 'cex', interval_hours: 4 },
  { id: 'ondo', display_name: 'Ondo', type: 'dex', interval_hours: 1 },
  { id: 'pacifica', display_name: 'Pacifica', type: 'dex', interval_hours: 1 },
  { id: 'paradex', display_name: 'Paradex', type: 'dex', interval_hours: 8 },
  { id: 'paragon', display_name: 'Paragon', type: 'dex', interval_hours: 1 },
  { id: 'phemex', display_name: 'Phemex', type: 'cex', interval_hours: 4 },
  { id: 'phoenix', display_name: 'Phoenix', type: 'dex', interval_hours: 1 },
  { id: 'polymarket', display_name: 'Polymarket', type: 'dex', interval_hours: 1 },
  { id: 'reya', display_name: 'Reya', type: 'dex', interval_hours: 1 },
  { id: 'rhlighter', display_name: 'RH Lighter', type: 'dex', interval_hours: 1 },
  { id: 'risex', display_name: 'RiseX', type: 'dex', interval_hours: 1 },
  { id: 'tradexyz', display_name: 'TradeXYZ', type: 'dex', interval_hours: 1 },
  { id: 'txflow', display_name: 'TXFlow', type: 'dex', interval_hours: 1 },
  { id: 'variational', display_name: 'Variational', type: 'dex', interval_hours: 4 },
  { id: 'vest', display_name: 'Vest', type: 'dex', interval_hours: 1 },
  { id: 'woofipro', display_name: 'WooFi', type: 'dex', interval_hours: 8 },
  { id: 'zo', display_name: '01', type: 'dex', interval_hours: 1 },
];

// Seed or update supported exchanges
const insertExchange = db.prepare(`
  INSERT INTO exchanges (id, display_name, type, interval_hours, is_enabled)
  VALUES (@id, @display_name, @type, @interval_hours, 1)
  ON CONFLICT(id) DO UPDATE SET
    display_name = excluded.display_name,
    type = excluded.type,
    interval_hours = excluded.interval_hours
`);
const insertMany = db.transaction((list) => {
  for (const ex of list) insertExchange.run(ex);
});
insertMany(DEFAULT_EXCHANGES);

// Auto-cleanup newly supported exchanges from loris_new_exchanges
db.prepare('DELETE FROM loris_new_exchanges WHERE LOWER(id) IN (SELECT LOWER(id) FROM exchanges)').run();

// Seed default settings
const defaultSettings = {
  max_oi_rank: '100',
  timeframe: '30d',
  candidate_count: '25',
  active_metric: 'trimmed',
  filter_high_volatility: 'true',
  max_spread_cap: '300',
};

const getSettingStmt = db.prepare('SELECT value FROM settings WHERE key = ?');
const setSettingStmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');

for (const [key, val] of Object.entries(defaultSettings)) {
  const existing = getSettingStmt.get(key);
  if (!existing) {
    setSettingStmt.run(key, val);
  }
}

// Helper database functions
function getAllSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  for (const r of rows) {
    settings[r.key] = r.value;
  }
  return settings;
}

function updateSettings(newSettings) {
  const updateMany = db.transaction((settingsObj) => {
    for (const [key, val] of Object.entries(settingsObj)) {
      setSettingStmt.run(key, String(val));
    }
  });
  updateMany(newSettings);
  return getAllSettings();
}

function getAllExchanges() {
  return db.prepare('SELECT id, display_name, type, interval_hours, is_enabled FROM exchanges ORDER BY display_name COLLATE NOCASE ASC').all();
}

function getEnabledExchangeIds() {
  const rows = db.prepare('SELECT id FROM exchanges WHERE is_enabled = 1').all();
  return new Set(rows.map(r => r.id));
}

function setExchangeStatus(id, isEnabled) {
  db.prepare('UPDATE exchanges SET is_enabled = ? WHERE id = ?').run(isEnabled ? 1 : 0, id);
}

function batchSetExchanges(updates) {
  const stmt = db.prepare('UPDATE exchanges SET is_enabled = ? WHERE id = ?');
  const tx = db.transaction((items) => {
    for (const item of items) {
      stmt.run(item.is_enabled ? 1 : 0, item.id);
    }
  });
  tx(updates);
  return getAllExchanges();
}

function saveScanCache(params, results) {
  const stmt = db.prepare(`
    INSERT INTO scan_cache (id, timestamp, params, results_json)
    VALUES (1, @timestamp, @params, @results_json)
    ON CONFLICT(id) DO UPDATE SET
      timestamp = excluded.timestamp,
      params = excluded.params,
      results_json = excluded.results_json
  `);
  stmt.run({
    timestamp: new Date().toISOString(),
    params: JSON.stringify(params),
    results_json: JSON.stringify(results)
  });
}

function getScanCache() {
  const row = db.prepare('SELECT timestamp, params, results_json FROM scan_cache WHERE id = 1').get();
  if (!row) return null;
  return {
    timestamp: row.timestamp,
    params: JSON.parse(row.params),
    results: JSON.parse(row.results_json)
  };
}

function saveForexScanCache(params, results) {
  const stmt = db.prepare(`
    INSERT INTO forex_scan_cache (id, timestamp, params, results_json)
    VALUES (1, @timestamp, @params, @results_json)
    ON CONFLICT(id) DO UPDATE SET
      timestamp = excluded.timestamp,
      params = excluded.params,
      results_json = excluded.results_json
  `);
  stmt.run({
    timestamp: new Date().toISOString(),
    params: JSON.stringify(params),
    results_json: JSON.stringify(results)
  });
}

function getForexScanCache() {
  const row = db.prepare('SELECT timestamp, params, results_json FROM forex_scan_cache WHERE id = 1').get();
  if (!row) return null;
  return {
    timestamp: row.timestamp,
    params: JSON.parse(row.params),
    results: JSON.parse(row.results_json)
  };
}

// Historical time-series caching to avoid hitting Loris rate limits
function getCachedHistorical(symbol, timeframe, maxAgeMs = 30 * 60 * 1000) {
  const row = db.prepare(`
    SELECT data_json, updated_at FROM historical_cache
    WHERE symbol = ? AND timeframe = ?
  `).get(symbol.toUpperCase(), timeframe);

  if (!row) return null;

  const age = Date.now() - row.updated_at;
  if (age > maxAgeMs) return null; // Expired cache

  try {
    return JSON.parse(row.data_json);
  } catch (e) {
    return null;
  }
}

function saveCachedHistorical(symbol, timeframe, data) {
  const stmt = db.prepare(`
    INSERT INTO historical_cache (symbol, timeframe, data_json, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(symbol, timeframe) DO UPDATE SET
      data_json = excluded.data_json,
      updated_at = excluded.updated_at
  `);
  stmt.run(symbol.toUpperCase(), timeframe, JSON.stringify(data), Date.now());
}

/**
 * Auto-cleanup: permanently removes historical cache records older than maxAgeHours.
 * Keeps SQLite database lean and eliminates obsolete data for coins that are no longer tracked.
 */
function cleanupExpiredHistoricalCache(maxAgeHours = 24) {
  try {
    const cutoffMs = Date.now() - maxAgeHours * 60 * 60 * 1000;
    const stmt = db.prepare('DELETE FROM historical_cache WHERE updated_at < ?');
    const info = stmt.run(cutoffMs);
    if (info.changes > 0) {
      console.log(`[Database] Auto-cleanup purged ${info.changes} historical cache entries older than ${maxAgeHours}h`);
    }
    return info.changes;
  } catch (err) {
    console.error('[Database] Failed to cleanup expired historical cache:', err.message);
    return 0;
  }
}

function clearScanCache() {
  db.prepare('DELETE FROM scan_cache WHERE id = 1').run();
}

function clearForexScanCache() {
  db.prepare('DELETE FROM forex_scan_cache WHERE id = 1').run();
}

/**
 * Returns all detected new exchanges that appeared on Loris.tools
 * but are not yet added to the main supported exchanges list.
 */
function getDetectedNewExchanges() {
  return db.prepare(`
    SELECT id, display_name, interval_hours, detected_at, is_dismissed
    FROM loris_new_exchanges
    ORDER BY is_dismissed ASC, detected_at DESC, display_name ASC
  `).all();
}

/**
 * Synchronizes detected new exchanges with the current state of Loris Tools.
 * - Removes any exchanges from loris_new_exchanges if they are already in the main exchanges table.
 * - Adds newly appeared exchanges that are missing from the main exchanges table.
 */
function syncDetectedNewExchanges(lorisExchangesList = []) {
  if (!Array.isArray(lorisExchangesList) || lorisExchangesList.length === 0) {
    return getDetectedNewExchanges();
  }

  const existingExchanges = db.prepare('SELECT id FROM exchanges').all();
  const existingSet = new Set(existingExchanges.map((e) => e.id.toLowerCase()));

  // 1. Remove from loris_new_exchanges if now officially supported in exchanges table
  const cleanupStmt = db.prepare('DELETE FROM loris_new_exchanges WHERE LOWER(id) IN (SELECT LOWER(id) FROM exchanges)');
  cleanupStmt.run();

  // 2. Identify new items
  const insertStmt = db.prepare(`
    INSERT INTO loris_new_exchanges (id, display_name, interval_hours, detected_at, is_dismissed)
    VALUES (@id, @display_name, @interval_hours, @detected_at, 0)
    ON CONFLICT(id) DO UPDATE SET
      display_name = excluded.display_name,
      interval_hours = excluded.interval_hours
  `);

  const nowIso = new Date().toISOString();
  const syncTx = db.transaction((items) => {
    for (const item of items) {
      const id = String(item.id || item.name || '').trim().toLowerCase();
      if (!id || existingSet.has(id)) continue;

      const display = item.display_name || item.display || id.toUpperCase();
      const interval = Number(item.interval_hours || item.interval) || 8;

      insertStmt.run({
        id,
        display_name: display,
        interval_hours: interval,
        detected_at: nowIso,
      });
    }
  });

  syncTx(lorisExchangesList);
  return getDetectedNewExchanges();
}

/**
 * Marks one or all detected new exchanges as dismissed.
 */
function setNewExchangeDismissed(id = 'all', isDismissed = true) {
  const val = isDismissed ? 1 : 0;
  if (!id || id === 'all') {
    db.prepare('UPDATE loris_new_exchanges SET is_dismissed = ?').run(val);
  } else {
    db.prepare('UPDATE loris_new_exchanges SET is_dismissed = ? WHERE LOWER(id) = LOWER(?)').run(val, id);
  }
  return getDetectedNewExchanges();
}

/**
 * Integrates a detected exchange into the active exchanges table,
 * enables it by default, and removes it from loris_new_exchanges.
 */
function integrateDetectedExchange(id, customData = {}) {
  const normId = String(id || '').trim().toLowerCase();
  if (!normId) return null;

  const detected = db.prepare('SELECT * FROM loris_new_exchanges WHERE LOWER(id) = ?').get(normId);

  const displayName = customData.display_name || detected?.display_name || normId.toUpperCase();
  const intervalHours = Number(customData.interval_hours || detected?.interval_hours || 8);
  const knownCex = ['binance', 'bybit', 'okx', 'bitget', 'bingx', 'gateio', 'kucoin', 'mexc', 'deribit', 'huobi', 'phemex', 'coinbaseus', 'cryptocom', 'kalshi'];
  const type = customData.type || (knownCex.includes(normId) ? 'cex' : 'dex');

  insertExchange.run({
    id: normId,
    display_name: displayName,
    type,
    interval_hours: intervalHours,
  });

  db.prepare('DELETE FROM loris_new_exchanges WHERE LOWER(id) = ?').run(normId);

  return db.prepare('SELECT id, display_name, type, interval_hours, is_enabled FROM exchanges WHERE id = ?').get(normId);
}

module.exports = {
  db,
  getAllSettings,
  updateSettings,
  getAllExchanges,
  getEnabledExchangeIds,
  setExchangeStatus,
  batchSetExchanges,
  saveScanCache,
  getScanCache,
  clearScanCache,
  saveForexScanCache,
  getForexScanCache,
  clearForexScanCache,
  getCachedHistorical,
  saveCachedHistorical,
  cleanupExpiredHistoricalCache,
  getDetectedNewExchanges,
  syncDetectedNewExchanges,
  setNewExchangeDismissed,
  integrateDetectedExchange,
};

