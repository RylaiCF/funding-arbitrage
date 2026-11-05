/**
 * Spread Analyzer Module
 * Analyzes cross-exchange price arbitrage constructions, computes net fees,
 * applies risk models, and filters for high-yield, low-risk opportunities.
 */

import apparaturaClient from './apparaturaClient.js';

// Real VIP0 venue taker fees (%) for Spot and Perpetual markets
const VENUE_TAKER_FEES = {
  binance: { spot: 0.10, perp: 0.05 },
  'binance-usdm': { spot: 0.10, perp: 0.05 },
  bybit: { spot: 0.10, perp: 0.055 },
  okx: { spot: 0.10, perp: 0.05 },
  bitget: { spot: 0.10, perp: 0.06 },
  hyperliquid: { spot: 0.05, perp: 0.035 },
  gate: { spot: 0.15, perp: 0.05 },
  kucoin: { spot: 0.10, perp: 0.06 },
  mexc: { spot: 0.10, perp: 0.02 },
  bingx: { spot: 0.10, perp: 0.05 },
  backpack: { spot: 0.08, perp: 0.05 },
  paradex: { spot: 0.05, perp: 0.04 },
  lighter: { spot: 0.04, perp: 0.03 },
  aster: { spot: 0.08, perp: 0.05 },
  extended: { spot: 0.08, perp: 0.05 },
  nado: { spot: 0.08, perp: 0.05 },
  variational: { spot: 0.08, perp: 0.05 },
  weex: { spot: 0.10, perp: 0.06 },
  phemex: { spot: 0.10, perp: 0.06 },
  apex: { spot: 0.08, perp: 0.05 },
  'trade-xyz': { spot: 0.08, perp: 0.05 },
  default: { spot: 0.10, perp: 0.06 }
};

const TIER1_EXCHANGES = ['binance', 'binance-usdm', 'bybit', 'okx', 'hyperliquid'];
const TIER2_EXCHANGES = ['gate', 'bingx', 'backpack', 'paradex', 'lighter', 'aster'];

function getTakerFee(exchange, marketType) {
  const ex = exchange?.toLowerCase();
  const rates = VENUE_TAKER_FEES[ex] || VENUE_TAKER_FEES.default;
  const isSpot = (marketType || '').toLowerCase() === 'spot';
  const fee = isSpot ? rates.spot : rates.perp;
  return Number(fee.toFixed(3));
}

function detectStrategyType(longMarketType, shortMarketType) {
  const l = (longMarketType || '').toLowerCase();
  const s = (shortMarketType || '').toLowerCase();
  if (l === 'spot' && s === 'perp') return { code: 'spot-perp', label: 'SPOT ➔ PERP', desc: 'Cash & Carry (Базисный)' };
  if (l === 'perp' && s === 'perp') return { code: 'perp-perp', label: 'PERP ➔ PERP', desc: 'Фьючерсный спред' };
  if (l === 'spot' && s === 'spot') return { code: 'spot-spot', label: 'SPOT ➔ SPOT', desc: 'Физический арбитраж' };
  if (l === 'perp' && s === 'spot') return { code: 'perp-spot', label: 'PERP ➔ SPOT', desc: 'Reverse Cash & Carry' };
  return { code: 'cross', label: `${l.toUpperCase()} ➔ ${s.toUpperCase()}`, desc: 'Межрыночный спред' };
}

function getExchangeUrl(exchange, nativeSymbol, marketType, baseRaw, quoteRaw) {
  const ex = (exchange || '').toLowerCase().replace(/_1_perp|_perp/g, '');
  const m = (marketType || 'perp').toLowerCase();

  let base = (baseRaw || '').toUpperCase();
  let quote = (quoteRaw || 'USDT').toUpperCase();

  if (!base && nativeSymbol) {
    const s = nativeSymbol.toUpperCase().replace(/[-_/]/g, '');
    if (s.endsWith('USDT')) { base = s.slice(0, -4); quote = 'USDT'; }
    else if (s.endsWith('USDC')) { base = s.slice(0, -4); quote = 'USDC'; }
    else if (s.endsWith('USD')) { base = s.slice(0, -3); quote = 'USD'; }
    else { base = s; }
  }

  if (!base) return null;

  switch (ex) {
    case 'binance':
    case 'binance-usdm':
      return m === 'spot'
        ? `https://www.binance.com/en/trade/${base}_${quote}`
        : `https://www.binance.com/en/futures/${base}${quote}`;

    case 'bybit':
      return m === 'spot'
        ? `https://www.bybit.com/en/trade/spot/${base}/${quote}`
        : `https://www.bybit.com/trade/usdt/${base}${quote}`;

    case 'okx':
      return m === 'spot'
        ? `https://www.okx.com/trade-spot/${base.toLowerCase()}-${quote.toLowerCase()}`
        : `https://www.okx.com/trade-swap/${base.toLowerCase()}-${quote.toLowerCase()}-swap`;

    case 'bitget':
      return m === 'spot'
        ? `https://www.bitget.com/spot/${base}${quote}`
        : `https://www.bitget.com/futures/usdt/${base}${quote}`;

    case 'gate':
    case 'gateio':
      return m === 'spot'
        ? `https://www.gate.io/trade/${base}_${quote}`
        : `https://www.gate.io/futures/USDT/${base}_${quote}`;

    case 'mexc':
      return m === 'spot'
        ? `https://www.mexc.com/exchange/${base}_${quote}`
        : `https://www.mexc.com/futures/${base}_${quote}`;

    case 'bingx':
      return m === 'spot'
        ? `https://bingx.com/en/spot/${base}-${quote}`
        : `https://bingx.com/en/perpetual/${base}-${quote}`;

    case 'kucoin':
      return m === 'spot'
        ? `https://www.kucoin.com/trade/${base}-${quote}`
        : `https://www.kucoin.com/futures/trade/${base}USDTM`;

    case 'weex':
      return m === 'spot'
        ? `https://www.weex.com/spot/${base}_${quote}`
        : `https://www.weex.com/futures/${base}_${quote}`;

    case 'hyperliquid':
      return `https://app.hyperliquid.xyz/trade/${base}`;

    case 'tradexyz':
    case 'trade-xyz':
      return `https://app.hyperliquid.xyz/trade/xyz:${base}`;

    case 'paragon':
      return `https://app.hyperliquid.xyz/trade/para:${base}`;

    case 'felix':
      return `https://app.hyperliquid.xyz/trade/flx:${base}`;

    case 'hyena':
      return `https://app.hyperliquid.xyz/trade/hyna:${base}`;

    case 'kinetiq':
      return `https://app.hyperliquid.xyz/trade/km:${base}`;

    case 'ventuals':
      return `https://app.hyperliquid.xyz/trade/vntl:${base}`;

    case 'dreamcash':
      return `https://app.hyperliquid.xyz/trade/cash:${base}`;

    case 'entropyio':
      return `https://app.hyperliquid.xyz/trade/io:${base}`;

    case 'aster':
      return m === 'spot'
        ? `https://www.asterdex.com/en/trade/${base}_USDT`
        : `https://www.asterdex.com/en/futures/v1/${base}USDT`;

    case 'variational':
      return `https://omni.variational.io/perpetual/${base}`;

    case 'lighter':
      return `https://app.lighter.xyz/trade/${base}`;

    case 'rhlighter':
      return `https://robinhoodchain.lighter.xyz/trade/${base}`;

    case 'paradex':
      return `https://app.paradex.trade/trade/${base}-USD-PERP`;

    case 'backpack':
      return `https://backpack.exchange/trade/${base}_${quote}`;

    case 'phemex':
      return m === 'spot'
        ? `https://phemex.com/trade/${base}USDT`
        : `https://phemex.com/futures/${base}-USDT`;

    case 'nado':
      return `https://app.nado.xyz/trade/${base}`;

    case 'extended':
      return `https://app.extended.exchange/trade/${base}`;

    case 'apex':
      return `https://pro.apex.exchange/trade/${base}-USDT`;

    case 'bluefin':
      return `https://trade.bluefin.io/pro/${base}-PERP`;

    case 'edgex':
      return `https://pro.edgex.exchange/trade/${base}USDT`;

    case 'deribit':
      return `https://www.deribit.com/futures/${base}-PERPETUAL`;

    case 'woofipro':
    case 'woofi':
      return `https://pro.woofi.com/en/trade/${base}_PERP`;

    default:
      return null;
  }
}

/**
 * Evaluates and filters raw constructions with strict deduplication
 */
async function getAnalyzedOpportunities(options = {}) {
  const {
    forceRefresh = false,
    mode = 'all', // 'all', 'perp-perp', 'spot-perp'
    minNetSpread = 0.2, // min 0.2% net yield
    minVolume = 30000, // min $30k 24h volume
    maxRisk = 'all', // 'A', 'B', 'all'
    depositSize = 1000,
    search = '',
    onePairPerSymbol = true // When true, shows 1 best pair per coin to eliminate duplicates
  } = options;

  const rawData = await apparaturaClient.getAllConstructions(forceRefresh);
  const rawRows = rawData.rows || [];

  // 1. Strict deduplication by unique ID (prevents double-counting from mode=perp and mode=spot)
  const seenIds = new Set();
  const dedupedRows = [];
  for (const r of rawRows) {
    if (r.id && seenIds.has(r.id)) continue;
    if (r.id) seenIds.add(r.id);
    dedupedRows.push(r);
  }

  const allOpportunities = [];

  for (const r of dedupedRows) {
    const long = r.long;
    const short = r.short;
    if (!long || !short) continue;

    const longEx = (long.exchange || '').toLowerCase();
    const shortEx = (short.exchange || '').toLowerCase();
    if (['mexc', 'bitget', 'kucoin'].includes(longEx) || ['mexc', 'bitget', 'kucoin'].includes(shortEx)) {
      continue;
    }

    const longAsk = Number(long.askPrice);
    const shortBid = Number(short.bidPrice);
    const longBid = Number(long.bidPrice) || longAsk;
    const shortAsk = Number(short.askPrice) || shortBid;

    if (!longAsk || !shortBid || longAsk <= 0 || shortBid <= 0) continue;

    // Detect actual strategy from market types (e.g. spot-perp or perp-perp)
    const strategy = detectStrategyType(long.marketType, short.marketType);

    // Mode filter (if user selected 'perp' or 'spot')
    if (mode === 'perp' && strategy.code !== 'perp-perp') continue;
    if (mode === 'spot' && strategy.code !== 'spot-perp') continue;

    // Gross spread %: Buy at Long Ask, Sell at Short Bid
    const denom = Number(long.referencePrice) || longAsk;
    const grossEntrySpread = ((shortBid - longAsk) / denom) * 100;
    const grossExitSpread = ((shortAsk - longBid) / denom) * 100;
    const baCost = Math.max(0, grossExitSpread - grossEntrySpread);

    // Reject extreme anomalies (> 20% or < -20%)
    // These are 99.9% token splits, 1000x multiplier mismatches, or halted/closed deposits
    if (Math.abs(grossEntrySpread) > 20) continue;

    // Taker fees: Entry + Round-Trip
    const longFee = getTakerFee(long.exchange, long.marketType);
    const shortFee = getTakerFee(short.exchange, short.marketType);
    const totalFees = Number((longFee + shortFee).toFixed(3));
    const roundTripFees = Number((totalFees * 2).toFixed(3));

    const netSpread = Number((grossEntrySpread - totalFees).toFixed(3));
    const netRoundTripSpread = Number((grossEntrySpread - roundTripFees).toFixed(3));

    // Reject negative net spreads
    if (netSpread <= 0) continue;

    // Liquidity metrics
    const longVol = Number(long.volumeUsd24h) || 0;
    const shortVol = Number(short.volumeUsd24h) || 0;
    const shortOi = Number(short.openInterestUsd) || 0;

    // Minimum volume check
    if (longVol < minVolume || shortVol < minVolume) continue;

    // Risk Evaluation
    const isLongT1 = TIER1_EXCHANGES.includes(longEx);
    const isShortT1 = TIER1_EXCHANGES.includes(shortEx);
    const isLongT2 = TIER2_EXCHANGES.includes(longEx);
    const isShortT2 = TIER2_EXCHANGES.includes(shortEx);

    const isHighVolume = longVol >= 250000 && shortVol >= 250000;
    const isMedVolume = longVol >= 75000 && shortVol >= 75000;
    const isOiSafe = strategy.code === 'spot-perp' || shortOi >= 150000;

    let grade = 'C';
    let riskScore = 50;
    const riskBadges = [];

    if (isLongT1 && isShortT1) {
      riskBadges.push({ label: 'Tier-1 Venues', type: 'success' });
      riskScore += 25;
    } else if ((isLongT1 || isShortT1) && (isLongT2 || isShortT2)) {
      riskBadges.push({ label: 'Tier-1/2 Mix', type: 'info' });
      riskScore += 15;
    } else {
      riskBadges.push({ label: 'Alternative Venues', type: 'warning' });
    }

    if (isHighVolume) {
      riskBadges.push({ label: 'Высокий объем', type: 'success' });
      riskScore += 20;
    } else if (isMedVolume) {
      riskBadges.push({ label: 'Средний объем', type: 'info' });
      riskScore += 10;
    }

    if (isOiSafe) {
      riskBadges.push({ label: 'Достаточный OI', type: 'success' });
      riskScore += 10;
    }

    if (baCost <= 0.25) {
      riskBadges.push({ label: 'Плотный стакан', type: 'success' });
      riskScore += 10;
    } else if (baCost > 0.8) {
      riskBadges.push({ label: 'Широкий B/A спред', type: 'warning' });
      riskScore -= 15;
    }

    // Determine Grade
    if (isHighVolume && isOiSafe && (isLongT1 || isShortT1) && netSpread >= 0.15 && netSpread <= 6.0 && baCost <= 0.5) {
      grade = 'A';
    } else if (isMedVolume && netSpread >= 0.25 && netSpread <= 10.0) {
      grade = 'B';
    } else {
      grade = 'C';
    }

    // Max risk filter
    if (maxRisk === 'A' && grade !== 'A') continue;
    if (maxRisk === 'B' && grade !== 'A' && grade !== 'B') continue;

    // Search filter
    if (search) {
      const q = search.toLowerCase().trim();
      const matchSymbol = (r.symbol || '').toLowerCase().includes(q) || (r.canonicalSymbol || '').toLowerCase().includes(q);
      const matchLongEx = (long.exchange || '').toLowerCase().includes(q);
      const matchShortEx = (short.exchange || '').toLowerCase().includes(q);
      if (!matchSymbol && !matchLongEx && !matchShortEx) continue;
    }

    const estProfitUSD = (netSpread / 100) * depositSize;

    allOpportunities.push({
      id: r.id || `${r.canonicalSymbol}_${long.exchange}_${short.exchange}_${strategy.code}`,
      symbol: r.symbol || r.canonicalSymbol?.split('/')[0] || 'TOKEN',
      canonicalSymbol: r.canonicalSymbol || r.symbol,
      strategyMode: strategy.code,
      strategyLabel: strategy.label,
      strategyDesc: strategy.desc,
      quote: r.quote || 'USDT',
      grade,
      riskScore: Math.min(100, Math.max(10, riskScore)),
      riskBadges,
      long: {
        instrumentId: long.instrumentId,
        exchange: long.exchange,
        marketType: long.marketType,
        nativeSymbol: long.exchangeSymbol || long.marketNativeId,
        exchangeSymbol: long.exchangeSymbol || long.marketNativeId,
        askPrice: longAsk,
        referencePrice: Number(long.referencePrice) || longAsk,
        volume24h: longVol,
        feePercent: longFee,
        url: getExchangeUrl(long.exchange, long.exchangeSymbol || long.marketNativeId, long.marketType, long.baseRaw, long.quoteRaw)
      },
      short: {
        instrumentId: short.instrumentId,
        exchange: short.exchange,
        marketType: short.marketType,
        nativeSymbol: short.exchangeSymbol || short.marketNativeId,
        exchangeSymbol: short.exchangeSymbol || short.marketNativeId,
        bidPrice: shortBid,
        referencePrice: Number(short.referencePrice) || shortBid,
        volume24h: shortVol,
        openInterest: shortOi,
        feePercent: shortFee,
        url: getExchangeUrl(short.exchange, short.exchangeSymbol || short.marketNativeId, short.marketType, short.baseRaw, short.quoteRaw)
      },
      spreads: {
        grossEntrySpread: Number(grossEntrySpread.toFixed(3)),
        grossExitSpread: Number(grossExitSpread.toFixed(3)),
        baCost: Number(baCost.toFixed(3)),
        totalFees: Number(totalFees.toFixed(3)),
        roundTripFees: Number(roundTripFees.toFixed(3)),
        exitFees: Number(totalFees.toFixed(3)),
        netSpread: Number(netSpread.toFixed(3)),
        netRoundTripSpread: Number(netRoundTripSpread.toFixed(3))
      },
      depositSize,
      estProfitUSD: Number(estProfitUSD.toFixed(2)),
      estRoundTripProfitUSD: Number(((netRoundTripSpread / 100) * depositSize).toFixed(2)),
      updatedAt: r.updatedAt || new Date().toISOString()
    });
  }

  // Sort by netSpread descending
  allOpportunities.sort((a, b) => b.spreads.netSpread - a.spreads.netSpread);

  // 2. Group by canonicalSymbol if onePairPerSymbol is true (eliminate duplicate coins!)
  let finalOpportunities = allOpportunities;
  if (onePairPerSymbol) {
    const symbolMap = new Map();
    for (const opp of allOpportunities) {
      const sym = opp.canonicalSymbol || opp.symbol;
      if (!symbolMap.has(sym)) {
        symbolMap.set(sym, {
          ...opp,
          alternatives: []
        });
      } else {
        // Add as alternative pair for this coin
        symbolMap.get(sym).alternatives.push(opp);
      }
    }
    finalOpportunities = Array.from(symbolMap.values());
  }

  // Stats calculation
  const totalScanned = dedupedRows.length;
  const gradeACount = finalOpportunities.filter(o => o.grade === 'A').length;
  const gradeBCount = finalOpportunities.filter(o => o.grade === 'B').length;
  const gradeCCount = finalOpportunities.filter(o => o.grade === 'C').length;
  const maxNetSpread = finalOpportunities.length > 0 ? finalOpportunities[0].spreads.netSpread : 0;
  const avgNetSpread = finalOpportunities.length > 0
    ? Number((finalOpportunities.reduce((acc, o) => acc + o.spreads.netSpread, 0) / finalOpportunities.length).toFixed(2))
    : 0;

  return {
    success: true,
    timestamp: new Date().toISOString(),
    totalScanned,
    totalProfitable: finalOpportunities.length,
    stats: {
      gradeACount,
      gradeBCount,
      gradeCCount,
      maxNetSpread,
      avgNetSpread,
      perpCount: finalOpportunities.filter(o => o.strategyMode === 'perp-perp').length,
      spotCount: finalOpportunities.filter(o => o.strategyMode === 'spot-perp').length
    },
    opportunities: finalOpportunities
  };
}

export {
  getAnalyzedOpportunities,
  getExchangeUrl,
  getTakerFee,
  detectStrategyType,
  VENUE_TAKER_FEES,
  TIER1_EXCHANGES,
  TIER2_EXCHANGES,
};

export default {
  getAnalyzedOpportunities,
  getExchangeUrl,
  getTakerFee,
  detectStrategyType,
  VENUE_TAKER_FEES,
  TIER1_EXCHANGES,
  TIER2_EXCHANGES,
};
