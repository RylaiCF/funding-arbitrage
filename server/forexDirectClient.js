/**
 * Direct Forex Exchange API Client
 * Bypasses Loris.tools gaps/stale data for Forex perpetual contracts by directly querying
 * public official APIs of CEX exchanges (Bybit, Bitget, Gate.io).
 *
 * Expands 8-hour funding settlements into complete hourly datasets (720+ points)
 * so arbitrage metrics and chart timelines are accurate and continuous.
 */

const axios = require('axios');

// In-memory cache with 15-minute TTL to prevent redundant calls during multi-alias scans
const memCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000;

// 1. Bybit Forex contracts
const BYBIT_FOREX_MAP = {
  EUR: 'EURUSDUSDT',
  EURUSD: 'EURUSDUSDT',
  GBP: 'GBPUSDUSDT',
  GBPUSD: 'GBPUSDUSDT',
  JPY: 'USDJPYUSDT',
  USDJPY: 'USDJPYUSDT',
};

// 2. Bitget Forex contracts
const BITGET_FOREX_MAP = {
  EUR: 'EURUSDUSDT',
  EURUSD: 'EURUSDUSDT',
  GBP: 'GBPUSDUSDT',
  GBPUSD: 'GBPUSDUSDT',
  JPY: 'USDJPYUSDT',
  USDJPY: 'USDJPYUSDT',
  BRL: 'USDBRLUSDT',
  USDBRL: 'USDBRLUSDT',
};

// 3. Gate.io Forex contracts
const GATE_FOREX_MAP = {
  EUR: 'EURUSD_USDT',
  EURUSD: 'EURUSD_USDT',
  GBP: 'GBPUSD_USDT',
  GBPUSD: 'GBPUSD_USDT',
  BRL: 'USDBRL_USDT',
  USDBRL: 'USDBRL_USDT',
};

/**
 * Fetch Bybit funding history directly (v5 public linear API)
 */
async function fetchBybitHistory(symbol) {
  const sym = symbol.toUpperCase();
  const bybitSymbol = BYBIT_FOREX_MAP[sym];
  if (!bybitSymbol) return null;

  const cacheKey = `bybit_${bybitSymbol}`;
  const cached = memCache.get(cacheKey);
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
    if (!list || !Array.isArray(list) || list.length === 0) return null;

    list.sort((a, b) => Number(a.fundingRateTimestamp) - Number(b.fundingRateTimestamp));

    const hourlyMap = new Map();
    for (const item of list) {
      const timeMs = Number(item.fundingRateTimestamp);
      if (isNaN(timeMs)) continue;
      const rateBps = Number(item.fundingRate) * 10000;

      for (let offset = -7; offset <= 0; offset++) {
        const hMs = timeMs + offset * 3600 * 1000;
        const d = new Date(hMs);
        d.setUTCMinutes(0, 0, 0);
        hourlyMap.set(d.toISOString().replace('.000Z', 'Z'), rateBps);
      }
    }

    const points = Array.from(hourlyMap.entries())
      .map(([t, y]) => ({ t, timestamp: t, y: Number(y.toFixed(4)) }))
      .sort((a, b) => a.t.localeCompare(b.t));

    if (points.length > 0) {
      memCache.set(cacheKey, { timestamp: Date.now(), data: points });
      console.log(`[ForexDirect] Bybit: ${points.length} points for ${bybitSymbol} (${points[0].t} -> ${points[points.length - 1].t})`);
    }
    return points;
  } catch (err) {
    console.warn(`[ForexDirect] Failed to fetch Bybit funding for ${bybitSymbol}:`, err.message);
    return null;
  }
}

/**
 * Fetch Bitget funding history directly (v2 public mix API)
 */
async function fetchBitgetHistory(symbol) {
  const sym = symbol.toUpperCase();
  const bitgetSymbol = BITGET_FOREX_MAP[sym];
  if (!bitgetSymbol) return null;

  const cacheKey = `bitget_${bitgetSymbol}`;
  const cached = memCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const url = 'https://api.bitget.com/api/v2/mix/market/history-fund-rate';
    const resp = await axios.get(url, {
      params: {
        symbol: bitgetSymbol,
        productType: 'USDT-FUTURES',
        pageSize: 100,
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        Accept: 'application/json',
      },
      timeout: 10000,
    });

    const list = resp.data?.data;
    if (!list || !Array.isArray(list) || list.length === 0) return null;

    list.sort((a, b) => Number(a.fundingTime) - Number(b.fundingTime));

    const hourlyMap = new Map();
    for (const item of list) {
      const timeMs = Number(item.fundingTime);
      if (isNaN(timeMs)) continue;
      const rateBps = Number(item.fundingRate) * 10000;

      for (let offset = -7; offset <= 0; offset++) {
        const hMs = timeMs + offset * 3600 * 1000;
        const d = new Date(hMs);
        d.setUTCMinutes(0, 0, 0);
        hourlyMap.set(d.toISOString().replace('.000Z', 'Z'), rateBps);
      }
    }

    const points = Array.from(hourlyMap.entries())
      .map(([t, y]) => ({ t, timestamp: t, y: Number(y.toFixed(4)) }))
      .sort((a, b) => a.t.localeCompare(b.t));

    if (points.length > 0) {
      memCache.set(cacheKey, { timestamp: Date.now(), data: points });
      console.log(`[ForexDirect] Bitget: ${points.length} points for ${bitgetSymbol} (${points[0].t} -> ${points[points.length - 1].t})`);
    }
    return points;
  } catch (err) {
    console.warn(`[ForexDirect] Failed to fetch Bitget funding for ${bitgetSymbol}:`, err.message);
    return null;
  }
}

/**
 * Fetch Gate.io funding history directly (v4 public futures API)
 */
async function fetchGateHistory(symbol) {
  const sym = symbol.toUpperCase();
  const gateContract = GATE_FOREX_MAP[sym];
  if (!gateContract) return null;

  const cacheKey = `gate_${gateContract}`;
  const cached = memCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const url = 'https://api.gateio.ws/api/v4/futures/usdt/funding_rate';
    const resp = await axios.get(url, {
      params: {
        contract: gateContract,
        limit: 100,
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        Accept: 'application/json',
      },
      timeout: 10000,
    });

    const list = Array.isArray(resp.data) ? resp.data : [];
    if (list.length === 0) return null;

    list.sort((a, b) => Number(a.t) - Number(b.t));

    const hourlyMap = new Map();
    for (const item of list) {
      const timeMs = Number(item.t) * 1000;
      if (isNaN(timeMs)) continue;
      const rateBps = Number(item.r) * 10000;

      for (let offset = -7; offset <= 0; offset++) {
        const hMs = timeMs + offset * 3600 * 1000;
        const d = new Date(hMs);
        d.setUTCMinutes(0, 0, 0);
        hourlyMap.set(d.toISOString().replace('.000Z', 'Z'), rateBps);
      }
    }

    const points = Array.from(hourlyMap.entries())
      .map(([t, y]) => ({ t, timestamp: t, y: Number(y.toFixed(4)) }))
      .sort((a, b) => a.t.localeCompare(b.t));

    if (points.length > 0) {
      memCache.set(cacheKey, { timestamp: Date.now(), data: points });
      console.log(`[ForexDirect] Gate.io: ${points.length} points for ${gateContract} (${points[0].t} -> ${points[points.length - 1].t})`);
    }
    return points;
  } catch (err) {
    console.warn(`[ForexDirect] Failed to fetch Gate.io funding for ${gateContract}:`, err.message);
    return null;
  }
}

/**
 * Supplements Loris historical dataset with direct CEX feeds for Forex perpetuals
 */
async function supplementForexHistory(symbol, histData, enabledExchanges) {
  if (!histData || !histData.series) return;
  const sym = symbol.toUpperCase();

  // Purge any disabled exchanges from series
  delete histData.series.bitget;
  delete histData.series.mexc;
  delete histData.series.kucoin;

  // 1. Bybit
  if (enabledExchanges.has('bybit') && BYBIT_FOREX_MAP[sym]) {
    try {
      const bybitPts = await fetchBybitHistory(sym);
      if (bybitPts && bybitPts.length > 0) {
        histData.series.bybit = bybitPts;
      }
    } catch (e) {}
  }

  // 2. Bitget: Hard-disabled, do not supplement or query

  // 3. Gate.io
  if ((enabledExchanges.has('gateio') || enabledExchanges.has('gate')) && GATE_FOREX_MAP[sym]) {
    try {
      const gatePts = await fetchGateHistory(sym);
      if (gatePts && gatePts.length > 0) {
        histData.series.gateio = gatePts;
      }
    } catch (e) {}
  }
}

function getDirectExchangeMetadata(exchangeId, symbol) {
  if (!exchangeId || !symbol) return { isDirect: false, sourceName: 'Loris Feed' };
  const ex = exchangeId.toLowerCase();
  const sym = symbol.toUpperCase();

  if (ex === 'bybit' && BYBIT_FOREX_MAP[sym]) {
    return {
      isDirect: true,
      sourceName: 'Bybit API',
      contract: BYBIT_FOREX_MAP[sym],
      description: 'Данные получены напрямую из официального API Bybit v5',
    };
  }

  if ((ex === 'gateio' || ex === 'gate') && GATE_FOREX_MAP[sym]) {
    return {
      isDirect: true,
      sourceName: 'Gate.io API',
      contract: GATE_FOREX_MAP[sym],
      description: 'Данные получены напрямую из официального API Gate.io v4',
    };
  }

  return {
    isDirect: false,
    sourceName: 'Loris Feed',
    description: 'Стандартный агрегированный поток Loris',
  };
}

module.exports = {
  fetchBybitHistory,
  fetchBitgetHistory,
  fetchGateHistory,
  supplementForexHistory,
  getDirectExchangeMetadata,
};
