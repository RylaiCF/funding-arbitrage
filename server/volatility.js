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

module.exports = {
  fetchTokenVolatility,
};
