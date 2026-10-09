/**
 * Analyzer module for Funding Arbitrage Scanner
 * Computes APY, spreads, and 3 stability metrics without spike distortion.
 */

const volatility = require('./volatility');

// 1 bp per 8h annualized to APY (%): 1 bp = 0.01%
// 3 times a day * 365 days = 1095 payments per year
// 1 bp * 1095 = 1095 bps = 10.95% APY
const BPS_8H_TO_APY_PERCENT = 10.95;

function toApy(bps8h) {
  if (bps8h === null || bps8h === undefined || isNaN(bps8h)) return 0;
  return Number((bps8h * BPS_8H_TO_APY_PERCENT).toFixed(2));
}

function downsampleTimeline(timeline, maxPoints = 150) {
  if (timeline.length <= maxPoints) return timeline;
  const step = Math.ceil(timeline.length / maxPoints);
  const sampled = [];
  for (let i = 0; i < timeline.length; i += step) {
    sampled.push(timeline[i]);
  }
  // Ensure the latest point is included
  if (sampled[sampled.length - 1] !== timeline[timeline.length - 1]) {
    sampled.push(timeline[timeline.length - 1]);
  }
  return sampled;
}

/**
 * Computes stability metrics on a window of hourly data points.
 * Days are calculated in full 24-hour holding periods (n / 24).
 */
function analyzePoints(points) {
  const n = points.length;
  if (n === 0) return null;

  const spreadsApy = points.map(p => p.spreadApy);

  // 1. Raw Metrics
  const rawMeanApy = spreadsApy.reduce((acc, v) => acc + v, 0) / n;
  const maxSpikeApy = Math.max(...spreadsApy);
  const minSpreadApy = Math.min(...spreadsApy);
  const positiveHours = spreadsApy.filter(s => s > 0).length;
  const winRateHoursPercent = Number(((positiveHours / n) * 100).toFixed(1));

  // 2. Metric 1: Trimmed Mean (Cut off top 5% positive spikes)
  const sortedApy = [...spreadsApy].sort((a, b) => a - b);
  const cutoffIndex = Math.max(1, Math.floor(n * 0.95));
  const trimmedSubset = sortedApy.slice(0, cutoffIndex);
  const trimmedMeanApy = trimmedSubset.reduce((acc, v) => acc + v, 0) / trimmedSubset.length;
  const scoreTrimmed = Number((Math.max(0, trimmedMeanApy) * (winRateHoursPercent / 100)).toFixed(2));

  // 3. Metric 2: Median APY + 24-hour Period Win Rate
  let medianApy = 0;
  const mid = Math.floor(n / 2);
  if (n % 2 !== 0) {
    medianApy = sortedApy[mid];
  } else {
    medianApy = (sortedApy[mid - 1] + sortedApy[mid]) / 2;
  }

  // True 24-hour period daily win rate: exactly 30 days for 720h, 15 days for 360h
  const totalDays = Math.max(1, Math.round(n / 24));
  let profitableDays = 0;
  for (let i = 0; i < n; i += 24) {
    const chunk = points.slice(i, i + 24);
    const sumSpread = chunk.reduce((acc, p) => acc + p.spreadApy, 0);
    if (sumSpread > 0) profitableDays++;
  }
  // Guard against chunk count exceeding rounded totalDays
  if (profitableDays > totalDays) profitableDays = totalDays;
  const dailyWinRatePercent = Number(((profitableDays / totalDays) * 100).toFixed(1));
  const scoreMedian = Number((Math.max(0, medianApy) * (dailyWinRatePercent / 100)).toFixed(2));

  // 4. Metric 3: Funding Sharpe Ratio
  const variance = spreadsApy.reduce((acc, v) => acc + Math.pow(v - rawMeanApy, 2), 0) / (n - 1 || 1);
  const stdDev = Math.sqrt(variance);
  let sharpeRatio = 0;
  if (stdDev > 0.001) {
    sharpeRatio = rawMeanApy / stdDev;
  }
  const scoreSharpe = Number(sharpeRatio.toFixed(2));

  return {
    dataPoints: n,
    startDate: points[0].timestamp,
    endDate: points[points.length - 1].timestamp,
    rawMeanApy: Number(rawMeanApy.toFixed(2)),
    maxSpikeApy: Number(maxSpikeApy.toFixed(2)),
    minSpreadApy: Number(minSpreadApy.toFixed(2)),
    winRateHoursPercent,
    dailyWinRatePercent,
    totalDays,
    profitableDays,
    metrics: {
      trimmed: {
        trimmedMeanApy: Number(trimmedMeanApy.toFixed(2)),
        score: scoreTrimmed,
      },
      median: {
        medianApy: Number(medianApy.toFixed(2)),
        score: scoreMedian,
      },
      sharpe: {
        sharpeRatio: Number(sharpeRatio.toFixed(2)),
        volatilityStdDev: Number(stdDev.toFixed(2)),
        score: scoreSharpe,
      },
    },
    timeline: downsampleTimeline(points, 150),
  };
}

function computeTrendAndBreakEven(timeline, stats30d) {
  if (!timeline || timeline.length === 0 || !stats30d) {
    return {
      trend: {
        spread24hApy: 0,
        spread7dApy: 0,
        spread30dApy: 0,
        direction: 'stable',
        label: 'Стабильный',
      },
      breakEven: {
        days: null,
        hours: null,
        text: '—',
        status: 'normal',
        feePercent: 0.18,
      },
    };
  }

  // Recent windows: 24h and 7d (168h)
  const points24h = timeline.slice(-24);
  const points7d = timeline.slice(-168);

  const spread24hApy = points24h.length > 0
    ? Number((points24h.reduce((acc, p) => acc + p.spreadApy, 0) / points24h.length).toFixed(2))
    : stats30d.rawMeanApy;

  const spread7dApy = points7d.length > 0
    ? Number((points7d.reduce((acc, p) => acc + p.spreadApy, 0) / points7d.length).toFixed(2))
    : stats30d.rawMeanApy;

  // Trend direction
  let trendDirection = 'stable';
  let trendLabel = 'Стабильный';
  const baselineApy = spread7dApy !== 0 ? spread7dApy : stats30d.rawMeanApy;

  if (spread24hApy > baselineApy * 1.25 && spread24hApy > 15) {
    trendDirection = 'expanding';
    trendLabel = 'Растущий';
  } else if (spread24hApy < 0 || (baselineApy > 15 && spread24hApy < baselineApy * 0.5)) {
    trendDirection = 'decaying';
    trendLabel = 'Угасающий';
  }

  const trend = {
    spread24hApy,
    spread7dApy,
    spread30dApy: stats30d.rawMeanApy,
    direction: trendDirection,
    label: trendLabel,
  };

  // Break-even horizon (round-trip trading fees ~0.18%)
  const trimmedApy = stats30d.metrics?.trimmed?.trimmedMeanApy ?? stats30d.rawMeanApy;
  let breakEvenDays = null;
  let breakEvenHours = null;
  let breakEvenText = '—';
  let breakEvenStatus = 'normal';

  if (trimmedApy > 0) {
    const roundTripFeePercent = 0.18;
    const dailyYieldPercent = trimmedApy / 365;
    breakEvenDays = Number((roundTripFeePercent / dailyYieldPercent).toFixed(1));
    breakEvenHours = Math.round(breakEvenDays * 24);

    if (breakEvenHours < 24) {
      breakEvenText = `${breakEvenHours} ч.`;
      breakEvenStatus = 'fast';
    } else if (breakEvenDays <= 2.5) {
      breakEvenText = `${breakEvenDays} дн.`;
      breakEvenStatus = 'fast';
    } else if (breakEvenDays <= 5) {
      breakEvenText = `${breakEvenDays} дн.`;
      breakEvenStatus = 'normal';
    } else {
      breakEvenText = `${breakEvenDays} дн.`;
      breakEvenStatus = 'slow';
    }
  } else {
    breakEvenText = 'Убыток';
    breakEvenStatus = 'negative';
  }

    const breakEven = {
    days: breakEvenDays,
    hours: breakEvenHours,
    text: breakEvenText,
    status: breakEvenStatus,
    feePercent: 0.18,
  };

  const halfLife = computeHalfLife(timeline, breakEvenDays);

  return { trend, breakEven, halfLife };
}

function computeHalfLife(timeline, breakEvenDays = null) {
  if (!timeline || timeline.length < 10) {
    return {
      halfLifeHours: null,
      halfLifeDays: null,
      phi: null,
      text: '—',
      status: 'unknown',
      label: 'Нет данных',
      sustainability: 'unknown',
      ratio: null,
      warning: false,
    };
  }

  const s = timeline.map((p) => p.spreadApy);
  const n = s.length;

  const t0 = new Date(timeline[0].timestamp).getTime();
  const tEnd = new Date(timeline[n - 1].timestamp).getTime();
  const totalHours = (tEnd - t0) / (1000 * 3600);
  if (totalHours <= 0) {
    return {
      halfLifeHours: null,
      halfLifeDays: null,
      phi: null,
      text: '—',
      status: 'unknown',
      label: 'Нет данных',
      sustainability: 'unknown',
      ratio: null,
      warning: false,
    };
  }

  const dtHours = totalHours / (n - 1);
  const y = s.slice(1);
  const x = s.slice(0, n - 1);
  const m = y.length;

  const meanX = x.reduce((a, b) => a + b, 0) / m;
  const meanY = y.reduce((a, b) => a + b, 0) / m;

  let covXY = 0;
  let varX = 0;
  for (let i = 0; i < m; i++) {
    covXY += (x[i] - meanX) * (y[i] - meanY);
    varX += Math.pow(x[i] - meanX, 2);
  }

  if (varX < 1e-9) {
    return {
      halfLifeHours: Infinity,
      halfLifeDays: Infinity,
      phi: 1,
      text: '>14 дн.',
      status: 'persistent',
      label: 'Сверхживучий',
      sustainability: 'high',
      ratio: 99,
      warning: false,
    };
  }

  const phi = covXY / varX;

  if (phi >= 0.999) {
    return {
      halfLifeHours: Infinity,
      halfLifeDays: Infinity,
      phi: Number(phi.toFixed(3)),
      text: '>14 дн.',
      status: 'persistent',
      label: 'Сверхживучий',
      sustainability: 'high',
      ratio: 99,
      warning: false,
    };
  }

  if (phi <= 0) {
    const hlHours = Number((dtHours * 0.5).toFixed(1));
    return {
      halfLifeHours: hlHours,
      halfLifeDays: Number((hlHours / 24).toFixed(1)),
      phi: Number(phi.toFixed(3)),
      text: '<1 ч.',
      status: 'fast_decay',
      label: 'Мгновенное сжатие',
      sustainability: 'risk',
      ratio: 0.1,
      warning: true,
    };
  }

  const lambda = -Math.log(phi) / dtHours;
  if (lambda <= 0) {
    return {
      halfLifeHours: Infinity,
      halfLifeDays: Infinity,
      phi: Number(phi.toFixed(3)),
      text: '>14 дн.',
      status: 'persistent',
      label: 'Сверхживучий',
      sustainability: 'high',
      ratio: 99,
      warning: false,
    };
  }

  const halfLifeHours = Number((Math.log(2) / lambda).toFixed(1));
  const halfLifeDays = Number((halfLifeHours / 24).toFixed(1));

  let text = '';
  let status = 'moderate';
  let label = 'Умеренное';

  if (halfLifeHours < 24) {
    text = `${halfLifeHours} ч.`;
    status = 'fast_decay';
    label = 'Быстрое сжатие';
  } else if (halfLifeDays <= 4) {
    text = `${halfLifeDays} дн.`;
    status = 'moderate';
    label = 'Умеренное';
  } else {
    text = halfLifeDays > 14 ? '>14 дн.' : `${halfLifeDays} дн.`;
    status = 'persistent';
    label = 'Высокая живучесть';
  }

  let sustainability = 'moderate';
  let ratio = null;
  let warning = false;

  if (breakEvenDays !== null && breakEvenDays > 0) {
    ratio = Number((halfLifeDays / breakEvenDays).toFixed(1));
    if (ratio >= 2.5 || halfLifeDays >= 7) {
      sustainability = 'high';
    } else if (ratio >= 1.0) {
      sustainability = 'moderate';
    } else {
      sustainability = 'risk';
      warning = true;
    }
  } else if (halfLifeDays >= 4) {
    sustainability = 'high';
  } else if (halfLifeHours < 12) {
    sustainability = 'risk';
  }

  return {
    halfLifeHours,
    halfLifeDays,
    phi: Number(phi.toFixed(3)),
    text,
    status,
    label,
    sustainability,
    ratio,
    warning,
  };
}

function calculatePairMetrics(seriesLong, seriesShort, coinSymbol, longExchange, shortExchange) {
  if (!seriesLong || !seriesShort || seriesLong.length === 0 || seriesShort.length === 0) {
    return null;
  }

  // Create timestamp map for fast alignment
  const longMap = new Map();
  for (const pt of seriesLong) {
    if (pt.t && pt.y !== null && pt.y !== undefined && !isNaN(pt.y)) {
      longMap.set(pt.t, Number(pt.y));
    }
  }

  const shortMap = new Map();
  for (const pt of seriesShort) {
    if (pt.t && pt.y !== null && pt.y !== undefined && !isNaN(pt.y)) {
      shortMap.set(pt.t, Number(pt.y));
    }
  }

  // Find overlapping timestamps
  const commonTimestamps = [];
  for (const t of longMap.keys()) {
    if (shortMap.has(t)) {
      commonTimestamps.push(t);
    }
  }

  // Sort chronologically
  commonTimestamps.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  // Require at least 10 full days of sample data (~230+ hourly points),
  // but allow newly added exchanges with limited history (>= 12 hourly points)
  const isRecentExchange = (seriesLong.length < 230 || seriesShort.length < 230);
  const minRequiredPoints = isRecentExchange ? 12 : 230;
  if (commonTimestamps.length < minRequiredPoints) {
    return null;
  }

  // Build aligned time series of spreads in APY %
  const timeline = [];
  for (const t of commonTimestamps) {
    const rateLongBps = longMap.get(t);
    const rateShortBps = shortMap.get(t);
    const spreadBps = rateShortBps - rateLongBps;
    const spreadApy = toApy(spreadBps);

    timeline.push({
      timestamp: t,
      rateLongBps,
      rateShortBps,
      rateLongApy: toApy(rateLongBps),
      rateShortApy: toApy(rateShortBps),
      spreadBps: Number(spreadBps.toFixed(4)),
      spreadApy,
    });
  }

  // Calculate full window stats (typically 30d ~ 720 points)
  const stats30d = analyzePoints(timeline);
  if (!stats30d) return null;

  // Calculate 15d window stats (last 360 hourly points)
  const points15d = timeline.slice(-360);
  const stats15d = points15d.length >= 12 ? analyzePoints(points15d) : stats30d;

  const { trend, breakEven, halfLife } = computeTrendAndBreakEven(timeline, stats30d);
  const latestPoint = timeline[timeline.length - 1];

  return {
    symbol: coinSymbol,
    longExchange,
    shortExchange,
    currentSpreadApy: latestPoint ? latestPoint.spreadApy : 0,
    currentRateLongApy: latestPoint ? latestPoint.rateLongApy : 0,
    currentRateShortApy: latestPoint ? latestPoint.rateShortApy : 0,
    stats30d,
    stats15d,
    trend,
    breakEven,
    halfLife,
    // By default, expose top-level properties from stats30d for backwards compatibility
    ...stats30d,
  };
}

/**
 * Screen live market data:
 * 1. Filter enabled exchanges
 * 2. Filter OI rank <= maxOiRank
 * 3. Filter abnormal spike spreads (> maxSpreadCap, e.g. 300% APY)
 * 4. Filter tokens with extreme 24h price volatility (pump/dump protection)
 * 5. Find candidate coin pairs with highest current APY spread
 */
function screenCandidates(liveData, enabledExchangeIds, maxOiRank = 100, candidateLimit = 25, options = {}) {
  const { symbols, funding_rates, oi_rankings } = liveData;
  if (!symbols || !funding_rates) return [];

  const maxSpreadCap = options.maxSpreadCap !== undefined && options.maxSpreadCap !== null && Number(options.maxSpreadCap) > 0
    ? Number(options.maxSpreadCap)
    : 300; // default cap 300% APY to reject anomaly spikes

  const filterHighVol = options.filterHighVolatility !== false; // default true
  const marketTickers = options.marketTickers || null;
  const max24hChange = Number(options.max24hChange || 18);
  const max24hRange = Number(options.max24hRange || 25);

  const candidates = [];
  let skippedHighVol = 0;
  let skippedSpike = 0;

  for (const symbol of symbols) {
    const oiRank = (oi_rankings && oi_rankings[symbol] !== undefined) ? oi_rankings[symbol] : 999;
    if (oiRank > maxOiRank) continue;

    // Fast Pre-filter: Check 24h price volatility BEFORE processing exchange data
    if (filterHighVol && marketTickers) {
      const volCheck = volatility.isUltraVolatile(symbol, marketTickers, {
        max24hChange,
        max24hRange,
      });
      if (volCheck.isVolatile) {
        skippedHighVol++;
        continue;
      }
    }

    // Gather available rates on enabled exchanges for this symbol
    const exchangeRates = [];
    for (const exId of enabledExchangeIds) {
      if (funding_rates[exId] && funding_rates[exId][symbol] !== undefined && funding_rates[exId][symbol] !== null) {
        exchangeRates.push({
          exchange: exId,
          rateBps: Number(funding_rates[exId][symbol]),
          rateApy: toApy(Number(funding_rates[exId][symbol])),
        });
      }
    }

    if (exchangeRates.length < 2) continue;

    // Find best pair: Lowest rate = Long, Highest rate = Short
    exchangeRates.sort((a, b) => a.rateBps - b.rateBps);
    const longLeg = exchangeRates[0];
    const shortLeg = exchangeRates[exchangeRates.length - 1];
    const currentSpreadBps = shortLeg.rateBps - longLeg.rateBps;
    const currentSpreadApy = toApy(currentSpreadBps);

    // Filter non-positive spreads
    if (currentSpreadApy <= 0) continue;

    // Filter abnormal spike / pump spreads (e.g. > 300% APY)
    if (maxSpreadCap > 0 && currentSpreadApy > maxSpreadCap) {
      skippedSpike++;
      continue;
    }

    candidates.push({
      symbol,
      oiRank,
      longExchange: longLeg.exchange,
      shortExchange: shortLeg.exchange,
      currentRateLongApy: longLeg.rateApy,
      currentRateShortApy: shortLeg.rateApy,
      currentSpreadApy,
      availableExchangesCount: exchangeRates.length,
    });
  }

  // Sort candidates by current APY descending
  candidates.sort((a, b) => b.currentSpreadApy - a.currentSpreadApy);

  const finalCandidates = candidates.slice(0, candidateLimit);
  finalCandidates.stats = {
    totalScreened: symbols.length,
    candidatesFound: candidates.length,
    selected: finalCandidates.length,
    skippedHighVol,
    skippedSpike,
  };

  return finalCandidates;
}

/**
 * Analyzes all pairs of enabled exchanges for a given coin across its historical funding series.
 * Automatically finds the best historical arbitrage pairs based on Trimmed Mean score.
 */
function analyzeCoinExchanges(histData, enabledExchangeIds, coinSymbol, oiRank, maxPairsPerCoin = 4) {
  if (!histData || !histData.series) return null;

  // Filter valid enabled exchanges with >= 12 data points
  const validExchanges = Object.keys(histData.series).filter(ex => 
    enabledExchangeIds.has(ex) && Array.isArray(histData.series[ex]) && histData.series[ex].length >= 12
  );

  if (validExchanges.length < 2) return null;

  // Build Map of timestamp -> rate in bps for fast O(1) alignment
  const exMaps = new Map();
  for (const ex of validExchanges) {
    const m = new Map();
    for (const pt of histData.series[ex]) {
      if (pt.t && pt.y !== null && pt.y !== undefined && !isNaN(pt.y)) {
        m.set(pt.t, Number(pt.y));
      }
    }
    exMaps.set(ex, m);
  }

  const coinOpportunities = [];

  // Evaluate every distinct unordered pair of exchanges
  for (let i = 0; i < validExchanges.length; i++) {
    for (let j = i + 1; j < validExchanges.length; j++) {
      const exA = validExchanges[i];
      const exB = validExchanges[j];
      const mapA = exMaps.get(exA);
      const mapB = exMaps.get(exB);

      // Intersect timestamps
      const commonTimestamps = [];
      for (const t of mapA.keys()) {
        if (mapB.has(t)) {
          commonTimestamps.push(t);
        }
      }

      // Require at least 10 full days of sample data (~230+ hourly points),
      // but allow newly added exchanges with limited history (>= 12 hourly points)
      const isRecentExchange = ((histData.series[exA]?.length || 0) < 230 || (histData.series[exB]?.length || 0) < 230);
      const minRequiredPoints = isRecentExchange ? 12 : 230;

      if (commonTimestamps.length < minRequiredPoints) continue;
      commonTimestamps.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

      // Quick check: which direction has positive net spread on average?
      let sumSpreadBminusA = 0;
      for (const t of commonTimestamps) {
        sumSpreadBminusA += (mapB.get(t) - mapA.get(t));
      }

      if (Math.abs(sumSpreadBminusA) < 0.0001) continue;

      let longEx, shortEx, longMap, shortMap;
      if (sumSpreadBminusA > 0) {
        // Long A (lower rate), Short B (higher rate)
        longEx = exA;
        shortEx = exB;
        longMap = mapA;
        shortMap = mapB;
      } else {
        // Long B (lower rate), Short A (higher rate)
        longEx = exB;
        shortEx = exA;
        longMap = mapB;
        shortMap = mapA;
      }

      // Build timeline
      const timeline = [];
      for (const t of commonTimestamps) {
        const rateLongBps = longMap.get(t);
        const rateShortBps = shortMap.get(t);
        const spreadBps = rateShortBps - rateLongBps;
        const spreadApy = toApy(spreadBps);

        timeline.push({
          timestamp: t,
          rateLongBps,
          rateShortBps,
          rateLongApy: toApy(rateLongBps),
          rateShortApy: toApy(rateShortBps),
          spreadBps: Number(spreadBps.toFixed(4)),
          spreadApy,
        });
      }

      // Analyze 30d
      const stats30d = analyzePoints(timeline);
      if (!stats30d || (!isRecentExchange && stats30d.totalDays < 10) || stats30d.metrics.trimmed.score <= 0) continue;

      // Analyze 15d
      const points15d = timeline.slice(-360);
      const stats15d = points15d.length >= minRequiredPoints ? analyzePoints(points15d) : stats30d;

      const { trend, breakEven, halfLife } = computeTrendAndBreakEven(timeline, stats30d);
      const latestPoint = timeline[timeline.length - 1];

      coinOpportunities.push({
        symbol: coinSymbol,
        longExchange: longEx,
        shortExchange: shortEx,
        oiRank,
        currentSpreadApy: latestPoint ? latestPoint.spreadApy : 0,
        currentRateLongApy: latestPoint ? latestPoint.rateLongApy : 0,
        currentRateShortApy: latestPoint ? latestPoint.rateShortApy : 0,
        stats30d,
        stats15d,
        trend,
        breakEven,
        halfLife,
        ...stats30d,
      });
    }
  }

  // Sort by Trimmed score descending
  coinOpportunities.sort((a, b) => b.metrics.trimmed.score - a.metrics.trimmed.score);

  const topPairs = coinOpportunities.slice(0, maxPairsPerCoin);
  if (topPairs.length === 0) return null;

  const primary = topPairs[0];
  return {
    ...primary,
    symbol: coinSymbol,
    oiRank,
    allPairs: topPairs,
    alternatives: topPairs.slice(1),
  };
}

module.exports = {
  toApy,
  analyzePoints,
  calculatePairMetrics,
  analyzeCoinExchanges,
  screenCandidates,
};
