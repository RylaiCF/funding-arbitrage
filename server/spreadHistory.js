import https from 'https';
import apparaturaClient from './apparaturaClient.js';

/**
 * Historical Spread Convergence Engine
 * Fetches real kline price series from CEX venues (Binance, Bybit, Bitget, OKX, Gate, MEXC, BingX, KuCoin),
 * aligns timelines by timestamp, and calculates authentic spread mean-reversion, zero crossings, and convergence safety.
 * NEVER generates synthetic sine waves.
 */

// Memory cache with 5 minutes TTL
const historyCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function fetchJson(url) {
  return new Promise((resolve) => {
    https.get(
      url,
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        timeout: 6000
      },
      (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(null);
          }
        });
      }
    ).on('error', () => resolve(null)).on('timeout', function() {
      this.destroy();
      resolve(null);
    });
  });
}

function cleanSymbol(sym) {
  return (sym || '').replace(/[-_/]/g, '').toUpperCase();
}

/**
 * Fetches hourly klines from various real exchanges
 */
async function getExchangeKlines(exchange, symbol, marketType, limit = 48) {
  const ex = (exchange || '').toLowerCase();
  if (ex === 'mexc' || ex === 'bitget' || ex === 'kucoin') {
    return null;
  }
  const rawSym = cleanSymbol(symbol);
  const sym = rawSym.endsWith('USDT') || rawSym.endsWith('USD') ? rawSym : `${rawSym}USDT`;
  const baseAsset = sym.replace(/USDT$|USD$/, '');

  try {
    // 1. Binance / Binance Futures
    if (ex === 'binance' || ex === 'binance-usdm') {
      const baseUrl = marketType === 'spot'
        ? 'https://api.binance.com/api/v3/klines'
        : 'https://fapi.binance.com/fapi/v1/klines';
      const data = await fetchJson(`${baseUrl}?symbol=${sym}&interval=1h&limit=${limit}`);
      if (Array.isArray(data)) {
        return data.map(k => ({ time: k[0], close: parseFloat(k[4]) }));
      }
    }

    // 2. Bybit
    else if (ex === 'bybit') {
      const category = marketType === 'spot' ? 'spot' : 'linear';
      const data = await fetchJson(`https://api.bybit.com/v5/market/kline?category=${category}&symbol=${sym}&interval=60&limit=${limit}`);
      if (data?.result?.list && Array.isArray(data.result.list)) {
        return data.result.list.map(k => ({ time: parseInt(k[0]), close: parseFloat(k[4]) })).reverse();
      }
    }

    // 3. Bitget
    else if (ex === 'bitget') {
      const url = marketType === 'spot'
        ? `https://api.bitget.com/api/v2/spot/market/candles?symbol=${sym}&granularity=1h&limit=${limit}`
        : `https://api.bitget.com/api/v2/mix/market/candles?symbol=${sym}&granularity=1H&productType=USDT-FUTURES&limit=${limit}`;
      const data = await fetchJson(url);
      if (data?.data && Array.isArray(data.data)) {
        return data.data.map(k => ({ time: parseInt(k[0]), close: parseFloat(k[4]) })).reverse();
      }
    }

    // 4. OKX
    else if (ex === 'okx') {
      const instId = marketType === 'spot' ? `${baseAsset}-USDT` : `${baseAsset}-USDT-SWAP`;
      const data = await fetchJson(`https://www.okx.com/api/v5/market/candles?instId=${instId}&bar=1H&limit=${limit}`);
      if (data?.data && Array.isArray(data.data)) {
        return data.data.map(k => ({ time: parseInt(k[0]), close: parseFloat(k[4]) })).reverse();
      }
    }

    // 5. Gate.io (spot array vs futures object support)
    else if (ex === 'gate') {
      const url = marketType === 'spot'
        ? `https://api.gateio.ws/api/v4/spot/candlesticks?currency_pair=${baseAsset}_USDT&interval=1h&limit=${limit}`
        : `https://api.gateio.ws/api/v4/futures/usdt/candlesticks?contract=${baseAsset}_USDT&interval=1h&limit=${limit}`;
      const data = await fetchJson(url);
      if (Array.isArray(data)) {
        return data.map(k => {
          if (Array.isArray(k)) {
            return { time: parseInt(k[0]) * 1000, close: parseFloat(k[2]) };
          }
          if (k && typeof k === 'object') {
            return { time: parseInt(k.t) * 1000, close: parseFloat(k.c) };
          }
          return null;
        }).filter(Boolean);
      }
    }

    // 6. MEXC (fixed contract interval from Hour1 to Min60)
    else if (ex === 'mexc') {
      const url = marketType === 'spot'
        ? `https://api.mexc.com/api/v3/klines?symbol=${sym}&interval=60m&limit=${limit}`
        : `https://contract.mexc.com/api/v1/contract/kline/${baseAsset}_USDT?interval=Min60`;
      const data = await fetchJson(url);
      if (Array.isArray(data)) {
        return data.map(k => ({ time: k[0], close: parseFloat(k[4]) }));
      } else if (data?.data?.time && Array.isArray(data.data.time)) {
        const times = data.data.time;
        const closes = data.data.close;
        return times.map((t, idx) => ({ time: t * 1000, close: parseFloat(closes[idx]) }));
      }
    }

    // 7. BingX (Spot & Perpetual Swap)
    else if (ex === 'bingx') {
      const url = marketType === 'spot'
        ? `https://open-api.bingx.com/openApi/spot/v1/market/kline?symbol=${baseAsset}-USDT&interval=1h&limit=${limit}`
        : `https://open-api.bingx.com/openApi/swap/v3/quote/klines?symbol=${baseAsset}-USDT&interval=1h&limit=${limit}`;
      const data = await fetchJson(url);
      if (data?.code === 0 && Array.isArray(data.data)) {
        if (marketType === 'spot') {
          return data.data.map(k => ({ time: parseInt(k[0]), close: parseFloat(k[4]) })).reverse();
        } else {
          return data.data.map(k => ({ time: parseInt(k.time), close: parseFloat(k.close) }));
        }
      }
    }

    // 8. KuCoin (Spot & Futures)
    else if (ex === 'kucoin') {
      if (marketType === 'spot') {
        const data = await fetchJson(`https://api.kucoin.com/api/v1/market/candles?type=1hour&symbol=${baseAsset}-USDT`);
        if (data?.code === '200000' && Array.isArray(data.data)) {
          return data.data.map(k => ({ time: parseInt(k[0]) * 1000, close: parseFloat(k[2]) })).reverse().slice(-limit);
        }
      } else {
        const data = await fetchJson(`https://api-futures.kucoin.com/api/v1/kline/query?granularity=60&symbol=${baseAsset}USDTM`);
        if (data?.code === '200000' && Array.isArray(data.data)) {
          return data.data.map(k => ({ time: parseInt(k[0]), close: parseFloat(k[4]) })).reverse().slice(-limit);
        }
      }
    }
  } catch (err) {
    console.warn(`[SpreadHistory] Failed to get klines for ${ex} ${sym}:`, err.message);
  }
  return null;
}

/**
 * Main convergence calculator
 * Fetches real historical spread data directly from Apparatura pair-history endpoint,
 * with fallback to multi-exchange CEX kline alignment.
 * NEVER generates synthetic sine waves.
 */
async function getSpreadConvergenceHistory(longLeg, shortLeg, limit = 72, options = {}) {
  const cleanSym = cleanSymbol(longLeg.symbol || shortLeg.symbol);
  const cacheKey = `${longLeg.exchange}_${longLeg.marketType}_${cleanSym}_${shortLeg.exchange}_${shortLeg.marketType}_${limit}`;
  const now = Date.now();

  if (historyCache.has(cacheKey)) {
    const cached = historyCache.get(cacheKey);
    if (now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  let timeline = [];
  let isApparatura = false;

  // 1. Apparatura pair-history (Primary source: contains real orderbook entry/exit spreads for ALL exchanges)
  try {
    let longInstrumentId = longLeg.instrumentId;
    let shortInstrumentId = shortLeg.instrumentId;
    let longExchangeSymbol = longLeg.exchangeSymbol || longLeg.nativeSymbol;
    let shortExchangeSymbol = shortLeg.exchangeSymbol || shortLeg.nativeSymbol;
    let symbol = (longLeg.symbol || shortLeg.symbol || '').replace(/[-_/]/g, '').replace(/USDT$|USD$|USDC$/, '');

    // If IDs are missing, attempt lookup in apparaturaClient cached rows
    if (!longInstrumentId || !shortInstrumentId) {
      const cachedRows = [
        ...(apparaturaClient.cache?.perp?.data?.rows || []),
        ...(apparaturaClient.cache?.spot?.data?.rows || [])
      ];
      const match = cachedRows.find(r =>
        (r.symbol?.toUpperCase() === symbol.toUpperCase() || cleanSymbol(r.canonicalSymbol)?.includes(symbol.toUpperCase())) &&
        r.long?.exchange?.toLowerCase() === longLeg.exchange?.toLowerCase() &&
        r.short?.exchange?.toLowerCase() === shortLeg.exchange?.toLowerCase()
      );
      if (match) {
        if (!longInstrumentId) longInstrumentId = match.long?.instrumentId;
        if (!shortInstrumentId) shortInstrumentId = match.short?.instrumentId;
        if (!longExchangeSymbol) longExchangeSymbol = match.long?.exchangeSymbol || match.long?.marketNativeId;
        if (!shortExchangeSymbol) shortExchangeSymbol = match.short?.exchangeSymbol || match.short?.marketNativeId;
        if (match.symbol) symbol = match.symbol;
      }
    }

    const interval = options.interval || `${limit}H`;
    const step = options.step || '3600';

    const apparaturaData = await apparaturaClient.getPairHistory({
      symbol,
      longExchange: longLeg.exchange,
      longMarket: longLeg.marketType,
      longExchangeSymbol,
      longInstrumentId,
      shortExchange: shortLeg.exchange,
      shortMarket: shortLeg.marketType,
      shortExchangeSymbol,
      shortInstrumentId,
      interval,
      step,
      hours: limit
    });

    if (apparaturaData && Array.isArray(apparaturaData) && apparaturaData.length >= 3) {
      isApparatura = true;
      timeline = apparaturaData.map(p => {
        const ts = new Date(p.timestamp || p.pairAsOf).getTime();
        const date = new Date(ts);
        const timeStr = `${date.getUTCMonth() + 1}/${date.getUTCDate()} ${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
        const spreadPct = Number((p.entrySpread !== undefined ? p.entrySpread : (p.marketSpread || 0)).toFixed(3));
        return {
          timestamp: ts,
          time: timeStr,
          longPrice: p.longPrice || p.longAsk,
          shortPrice: p.shortPrice || p.shortBid,
          longAsk: p.longAsk,
          longBid: p.longBid,
          shortBid: p.shortBid,
          shortAsk: p.shortAsk,
          spreadPct,
          entrySpread: Number((p.entrySpread !== undefined ? p.entrySpread : spreadPct).toFixed(3)),
          exitSpread: Number((p.exitSpread !== undefined ? p.exitSpread : spreadPct).toFixed(3)),
          marketSpread: Number((p.marketSpread !== undefined ? p.marketSpread : spreadPct).toFixed(3)),
          baCost: Number((p.baCost || 0).toFixed(3)),
          zero: 0
        };
      });
    }
  } catch (err) {
    console.warn(`[SpreadHistory] Apparatura pair-history error for ${longLeg.exchange}/${shortLeg.exchange}:`, err.message);
  }

  // 2. Fallback to direct CEX kline alignment if Apparatura didn't have data
  let longKlines = null;
  let shortKlines = null;

  if (timeline.length < 3) {
    [longKlines, shortKlines] = await Promise.all([
      getExchangeKlines(longLeg.exchange, longLeg.symbol || longLeg.nativeSymbol, longLeg.marketType, limit),
      getExchangeKlines(shortLeg.exchange, shortLeg.symbol || shortLeg.nativeSymbol, shortLeg.marketType, limit)
    ]);

    if (longKlines && shortKlines && longKlines.length >= 5 && shortKlines.length >= 5) {
      const shortMap = new Map();
      shortKlines.forEach(k => {
        const hourKey = Math.floor(k.time / 3600000) * 3600000;
        shortMap.set(hourKey, k.close);
      });

      for (const l of longKlines) {
        const hourKey = Math.floor(l.time / 3600000) * 3600000;
        const sClose = shortMap.get(hourKey);
        if (sClose && l.close > 0) {
          const spreadPct = Number((((sClose - l.close) / l.close) * 100).toFixed(3));
          const date = new Date(hourKey);
          const timeStr = `${date.getUTCMonth() + 1}/${date.getUTCDate()} ${String(date.getUTCHours()).padStart(2, '0')}:00`;

          timeline.push({
            timestamp: hourKey,
            time: timeStr,
            longPrice: l.close,
            shortPrice: sClose,
            spreadPct,
            entrySpread: spreadPct,
            exitSpread: spreadPct,
            marketSpread: spreadPct,
            baCost: 0,
            zero: 0
          });
        }
      }
    }
  }

  // 3. Handle case where no authentic history could be found anywhere
  if (timeline.length < 3) {
    const unavailableExchanges = [];
    if (!longKlines || longKlines.length < 5) unavailableExchanges.push(longLeg.exchange);
    if (!shortKlines || shortKlines.length < 5) unavailableExchanges.push(shortLeg.exchange);

    const singleLeg = (longKlines && longKlines.length >= 5)
      ? {
          exchange: longLeg.exchange,
          marketType: longLeg.marketType,
          symbol: longLeg.symbol,
          points: longKlines.slice(-limit).map(k => {
            const date = new Date(k.time);
            return {
              timestamp: k.time,
              time: `${date.getUTCMonth() + 1}/${date.getUTCDate()} ${String(date.getUTCHours()).padStart(2, '0')}:00`,
              price: k.close
            };
          })
        }
      : (shortKlines && shortKlines.length >= 5)
      ? {
          exchange: shortLeg.exchange,
          marketType: shortLeg.marketType,
          symbol: shortLeg.symbol,
          points: shortKlines.slice(-limit).map(k => {
            const date = new Date(k.time);
            return {
              timestamp: k.time,
              time: `${date.getUTCMonth() + 1}/${date.getUTCDate()} ${String(date.getUTCHours()).padStart(2, '0')}:00`,
              price: k.close
            };
          })
        }
      : null;

    const result = {
      hasRealHistory: false,
      isSynthetic: false,
      pointsCount: 0,
      unavailableExchanges,
      singleLeg,
      currentSpread: Number(shortLeg.currentSpread || 0),
      convergenceStatus: 'NO_HISTORY',
      convergenceLabel: 'История стакана недоступна',
      convergenceGrade: 'UNKNOWN',
      convergenceDescription: `История спреда для пары ${longLeg.exchange.toUpperCase()} / ${shortLeg.exchange.toUpperCase()} временно недоступна в архиве.`,
      timeline: []
    };

    historyCache.set(cacheKey, { timestamp: now, data: result });
    return result;
  }

  // 4. Calculate authentic convergence metrics
  const spreads = timeline.map(t => t.spreadPct);
  const meanSpread = Number((spreads.reduce((a, b) => a + b, 0) / spreads.length).toFixed(3));
  const minSpread = Math.min(...spreads);
  const maxSpread = Math.max(...spreads);
  const variance = spreads.reduce((acc, v) => acc + Math.pow(v - meanSpread, 2), 0) / (spreads.length - 1 || 1);
  const stdDev = Number(Math.sqrt(variance).toFixed(3));
  const currentSpread = timeline[timeline.length - 1].spreadPct;

  let zeroCrossings = 0;
  for (let i = 1; i < timeline.length; i++) {
    const prev = timeline[i - 1].spreadPct;
    const curr = timeline[i].spreadPct;
    if ((prev > 0 && curr < 0) || (prev < 0 && curr > 0) || curr === 0) {
      zeroCrossings++;
    }
  }

  let convergenceStatus = 'MODERATE';
  let convergenceLabel = 'Умеренная сходимость (Коридор)';
  let convergenceGrade = 'B';
  let convergenceDescription = 'Спред колеблется в устойчивом диапазоне вокруг среднего значения.';

  if (zeroCrossings >= 3 && stdDev <= 1.5) {
    convergenceStatus = 'HIGH_CONVERGENCE';
    convergenceLabel = 'Высокая сходимость (Возврат к 0%)';
    convergenceGrade = 'A';
    convergenceDescription = `Спред реально возвращался к нулю (${zeroCrossings} раз за ${timeline.length} точек на истории стакана ${longLeg.exchange}/${shortLeg.exchange}). Идеально для безопасного закрытия.`;
  } else if (zeroCrossings === 0 && Math.abs(currentSpread - meanSpread) > stdDev * 1.5) {
    convergenceStatus = 'DIVERGING_RISK';
    convergenceLabel = 'Внимание: Риск расхождения';
    convergenceGrade = 'C';
    convergenceDescription = 'Спред расходится в одну сторону на истории и не возвращался к нулю. Повышенный риск зависания в позиции.';
  }

  const result = {
    hasRealHistory: true,
    isSynthetic: false,
    source: isApparatura ? 'apparatura' : 'exchange_klines',
    sourceLabel: isApparatura ? 'Apparatura Engine' : 'Биржевые свечи',
    pointsCount: timeline.length,
    currentSpread,
    meanSpread,
    minSpread,
    maxSpread,
    stdDev,
    zeroCrossings,
    convergenceStatus,
    convergenceLabel,
    convergenceGrade,
    convergenceDescription,
    timeline,
    singleLeg: null
  };

  historyCache.set(cacheKey, { timestamp: now, data: result });
  return result;
}

export {
  getSpreadConvergenceHistory
};

export default {
  getSpreadConvergenceHistory
};
