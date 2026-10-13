const axios = require('axios');

// In-memory cache for 30d price volatility (TTL: 1 hour)
const volCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Fetches 30-day price candles and calculates:
 * - Annualized Realized Volatility (%)
 * - 30d Average True Range (ATR %)
 * Uses Binance Futures public API with Bybit public API fallback (no keys required).
 */
async function fetchTokenVolatility(rawSymbol) {
  if (!rawSymbol) return null;
  const sym = String(rawSymbol).split(/[\/_:]/)[0].toUpperCase();

  const cached = volCache.get(sym);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }

  let klines = null;

  // 1. Try Binance Futures public klines
  try {
    const res = await axios.get(`https://fapi.binance.com/fapi/v1/klines?symbol=${sym}USDT&interval=1d&limit=30`, {
      timeout: 3500,
    });
    if (Array.isArray(res.data) && res.data.length >= 7) {
      klines = res.data.map(k => ({
        high: Number(k[2]),
        low: Number(k[3]),
        close: Number(k[4]),
      }));
    }
  } catch (e) {
    // Fallback to Bybit
  }

  // 2. Fallback to Bybit linear klines
  if (!klines) {
    try {
      const res = await axios.get(`https://api.bybit.com/v5/market/kline?category=linear&symbol=${sym}USDT&interval=D&limit=30`, {
        timeout: 3500,
      });
      if (res.data?.result?.list && Array.isArray(res.data.result.list) && res.data.result.list.length >= 7) {
        klines = res.data.result.list.map(k => ({
          high: Number(k[2]),
          low: Number(k[3]),
          close: Number(k[4]),
        }));
      }
    } catch (e) {
      // Fallback
    }
  }

  if (!klines || klines.length < 5) {
    return null;
  }

  // Calculate Log Returns & Standard Deviation
  const returns = [];
  for (let i = 1; i < klines.length; i++) {
    const prev = klines[i - 1].close;
    const curr = klines[i].close;
    if (prev > 0 && curr > 0) {
      returns.push(Math.log(curr / prev));
    }
  }

  if (returns.length < 4) return null;

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (returns.length - 1);
  const dailyStd = Math.sqrt(variance);
  const annualizedVol = Math.round(dailyStd * Math.sqrt(365) * 100);

  // Calculate 30d Average True Range (ATR %)
  const atrPcts = klines.map(k => (k.close > 0 ? ((k.high - k.low) / k.close) * 100 : 0));
  const avgAtr = Number((atrPcts.reduce((a, b) => a + b, 0) / atrPcts.length).toFixed(1));

  const result = {
    symbol: sym,
    annualizedVol,
    avgAtr,
    days: klines.length,
  };

  volCache.set(sym, {
    timestamp: Date.now(),
    data: result,
  });

  return result;
}

// Fast 24h market snapshot cache (TTL: 90 seconds)
let marketTickersCache = null;
let marketTickersCacheExpiry = 0;

/**
 * Fetches 24-hour ticker snapshot for all available tokens from Binance Futures (with Bybit fallback).
 * Returns a Map keyed by normalized symbol:
 * 'BTC' -> { symbol, priceChangePercent, highLowRangePercent, high, low, lastPrice, volumeUsd, source }
 */
async function fetchFastMarketTickers(forceRefresh = false) {
  if (!forceRefresh && marketTickersCache && Date.now() < marketTickersCacheExpiry) {
    return marketTickersCache;
  }

  const tickerMap = new Map();

  // 1. Try Binance Futures (fastest, single call for all markets ~300ms)
  try {
    const res = await axios.get('https://fapi.binance.com/fapi/v1/ticker/24hr', {
      timeout: 3500,
    });
    if (Array.isArray(res.data) && res.data.length > 50) {
      for (const t of res.data) {
        if (!t.symbol) continue;
        const sym = t.symbol.replace(/USDT$|USDC$|BUSD$/, '').toUpperCase();
        const high = parseFloat(t.highPrice) || 0;
        const low = parseFloat(t.lowPrice) || 0;
        const rawChange = parseFloat(t.priceChangePercent) || 0;
        const changePcnt = Math.abs(rawChange);
        const rangePcnt = low > 0 ? Number((((high - low) / low) * 100).toFixed(2)) : 0;
        const lastPrice = parseFloat(t.lastPrice) || 0;
        const volumeUsd = parseFloat(t.quoteVolume) || 0;

        const info = {
          symbol: sym,
          priceChangePercent: changePcnt,
          rawPriceChangePercent: Number(rawChange.toFixed(2)),
          highLowRangePercent: rangePcnt,
          high,
          low,
          lastPrice,
          volumeUsd,
          source: 'binance',
        };

        tickerMap.set(sym, info);
        // Also map normalized without '1000' prefix if applicable
        const stripped = sym.replace(/^10+/, '');
        if (stripped && !tickerMap.has(stripped)) {
          tickerMap.set(stripped, info);
        }
      }

      marketTickersCache = tickerMap;
      marketTickersCacheExpiry = Date.now() + 90 * 1000;
      return tickerMap;
    }
  } catch (e) {
    // Fallback to Bybit
  }

  // 2. Fallback to Bybit Linear Tickers
  try {
    const res = await axios.get('https://api.bybit.com/v5/market/tickers?category=linear', {
      timeout: 3500,
    });
    const list = res.data?.result?.list;
    if (Array.isArray(list) && list.length > 50) {
      for (const t of list) {
        if (!t.symbol) continue;
        const sym = t.symbol.replace(/USDT$|USDC$|PERP$/, '').toUpperCase();
        const high = parseFloat(t.highPrice24h) || 0;
        const low = parseFloat(t.lowPrice24h) || 0;
        const rawChange = (parseFloat(t.price24hPcnt) || 0) * 100;
        const changePcnt = Math.abs(rawChange);
        const rangePcnt = low > 0 ? Number((((high - low) / low) * 100).toFixed(2)) : 0;
        const lastPrice = parseFloat(t.lastPrice) || 0;
        const volumeUsd = parseFloat(t.turnover24h) || 0;

        const info = {
          symbol: sym,
          priceChangePercent: Number(changePcnt.toFixed(2)),
          rawPriceChangePercent: Number(rawChange.toFixed(2)),
          highLowRangePercent: rangePcnt,
          high,
          low,
          lastPrice,
          volumeUsd,
          source: 'bybit',
        };

        tickerMap.set(sym, info);
        const stripped = sym.replace(/^10+/, '');
        if (stripped && !tickerMap.has(stripped)) {
          tickerMap.set(stripped, info);
        }
      }

      marketTickersCache = tickerMap;
      marketTickersCacheExpiry = Date.now() + 90 * 1000;
      return tickerMap;
    }
  } catch (e) {
    // Fallback
  }

  return tickerMap;
}

/**
 * Checks whether a token exhibits extreme short-term price volatility.
 * @param {string} rawSymbol - e.g. "DOGE" or "BTC"
 * @param {Map} tickersMap - Fast market tickers from fetchFastMarketTickers()
 * @param {object} thresholds - { max24hChange: 18, max24hRange: 25 }
 */
function isUltraVolatile(rawSymbol, tickersMap, thresholds = {}) {
  if (!rawSymbol || !tickersMap || tickersMap.size === 0) {
    return { isVolatile: false };
  }

  const sym = String(rawSymbol).split(/[\/_:]/)[0].toUpperCase();
  const maxChange = thresholds.max24hChange ?? 18; // default 18% 24h change
  const maxRange = thresholds.max24hRange ?? 25;   // default 25% 24h range (high - low) / low

  const ticker = tickersMap.get(sym) || tickersMap.get(`1000${sym}`) || tickersMap.get(sym.replace(/^10+/, ''));
  if (!ticker) {
    return { isVolatile: false };
  }

  if (ticker.priceChangePercent > maxChange || ticker.highLowRangePercent > maxRange) {
    return {
      isVolatile: true,
      reason: `24h change: ${ticker.priceChangePercent}% (макс ${maxChange}%), размах: ${ticker.highLowRangePercent}% (макс ${maxRange}%)`,
      priceChangePercent: ticker.priceChangePercent,
      highLowRangePercent: ticker.highLowRangePercent,
    };
  }

  return {
    isVolatile: false,
    priceChangePercent: ticker.priceChangePercent,
    highLowRangePercent: ticker.highLowRangePercent,
  };
}

module.exports = {
  fetchTokenVolatility,
  fetchFastMarketTickers,
  isUltraVolatile,
};
