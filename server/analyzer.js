/**
 * Analyzer module for Funding Arbitrage Scanner
 * Computes APY, spreads, and 3 stability metrics without spike distortion.
 */

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

  if (commonTimestamps.length < 12) {
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
    // By default, expose top-level properties from stats30d for backwards compatibility
    ...stats30d,
  };
}

/**
 * Screen live market data:
 * 1. Filter enabled exchanges
 * 2. Filter OI rank <= maxOiRank
 * 3. Find candidate coin pairs with highest current APY spread
 */
function screenCandidates(liveData, enabledExchangeIds, maxOiRank = 100, candidateLimit = 25) {
  const { symbols, funding_rates, oi_rankings } = liveData;
  if (!symbols || !funding_rates) return [];

  const candidates = [];

  for (const symbol of symbols) {
    const oiRank = (oi_rankings && oi_rankings[symbol] !== undefined) ? oi_rankings[symbol] : 999;
    if (oiRank > maxOiRank) continue;

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

    // Only consider positive spread opportunities
    if (currentSpreadApy > 0) {
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
  }

  // Sort candidates by current APY descending
  candidates.sort((a, b) => b.currentSpreadApy - a.currentSpreadApy);

  return candidates.slice(0, candidateLimit);
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

      if (commonTimestamps.length < 12) continue;
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
      if (!stats30d || stats30d.metrics.trimmed.score <= 0) continue;

      // Analyze 15d
      const points15d = timeline.slice(-360);
      const stats15d = points15d.length >= 12 ? analyzePoints(points15d) : stats30d;

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
