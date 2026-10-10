/**
 * Dedicated Bybit API client for Forex / Fiat perpetual funding rates.
 * Fetches direct funding history from Bybit v5 public API for forex contracts (EURUSDUSDT, GBPUSDUSDT, USDJPYUSDT)
 * to provide a complete, continuous 30-day funding dataset where Loris.tools has gaps or stale data.
 */

const axios = require('axios');

const BYBIT_FOREX_SYMBOLS = {
  EUR: 'EURUSDUSDT',
  EURUSD: 'EURUSDUSDT',
  GBP: 'GBPUSDUSDT',
  GBPUSD: 'GBPUSDUSDT',
  JPY: 'USDJPYUSDT',
  USDJPY: 'USDJPYUSDT',
};

// In-memory cache to avoid repeated Bybit API calls during a scan
const memCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function isSupportedForexSymbol(symbol) {
  if (!symbol) return false;
  return Boolean(BYBIT_FOREX_SYMBOLS[symbol.toUpperCase()]);
}

async function fetchBybitForexHistory(symbol) {
  if (!symbol) return null;
  const sym = symbol.toUpperCase();
  const bybitSymbol = BYBIT_FOREX_SYMBOLS[sym];
  if (!bybitSymbol) return null;

  // Check cache
  const cached = memCache.get(bybitSymbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const url = 'https://api.bybit.com/v5/market/funding/history';
    const resp = await axios.get(url, {
      params: {
        category: 'linear',
        symbol: bybitSymbol,
        limit: 200,
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        Accept: 'application/json',
      },
      timeout: 10000,
    });

    const list = resp.data?.result?.list;
    if (!list || !Array.isArray(list) || list.length === 0) {
      return null;
    }

    // Sort chronologically ascending
    list.sort((a, b) => Number(a.fundingRateTimestamp) - Number(b.fundingRateTimestamp));

    // Map 8-hour settlements into hourly intervals (each settlement covers the 8h period up to the timestamp)
    const hourlyMap = new Map();
    for (const item of list) {
      const timeMs = Number(item.fundingRateTimestamp);
      if (isNaN(timeMs)) continue;
      // Convert decimal rate to basis points (e.g. 0.0001 = 1.0 bps)
      const rateBps = Number(item.fundingRate) * 10000;

      // Expand 8 hours leading up to this settlement timestamp
      for (let offset = -7; offset <= 0; offset++) {
        const hMs = timeMs + offset * 3600 * 1000;
        const d = new Date(hMs);
        d.setUTCMinutes(0, 0, 0);
        const iso = d.toISOString().replace('.000Z', 'Z');
        hourlyMap.set(iso, rateBps);
      }
    }

    const points = Array.from(hourlyMap.entries())
      .map(([t, y]) => ({
        t,
        timestamp: t,
        y: Number(y.toFixed(4)),
      }))
      .sort((a, b) => a.t.localeCompare(b.t));

    if (points.length > 0) {
      memCache.set(bybitSymbol, {
        timestamp: Date.now(),
        data: points,
      });
      console.log(`[BybitClient] Fetched ${points.length} hourly funding points directly for ${bybitSymbol} (${points[0].t} -> ${points[points.length - 1].t})`);
    }

    return points;
  } catch (err) {
    console.warn(`[BybitClient] Failed to fetch Bybit funding history for ${bybitSymbol}:`, err.message);
    return null;
  }
}

module.exports = {
  isSupportedForexSymbol,
  fetchBybitForexHistory,
};
