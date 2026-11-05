import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { toApy, analyzePoints, calculatePairMetrics } from './analyzer.js';

describe('Quantitative Analyzer (server/analyzer.js)', () => {
  describe('toApy conversion', () => {
    it('converts 8h basis points to annualized APY correctly', () => {
      // 1 bp per 8h * 1095 payments = 10.95% APY
      assert.equal(toApy(1), 10.95);
      assert.equal(toApy(10), 109.5);
      assert.equal(toApy(-5), -54.75);
      assert.equal(toApy(0), 0);
    });

    it('gracefully handles null, undefined and NaN values', () => {
      assert.equal(toApy(null), 0);
      assert.equal(toApy(undefined), 0);
      assert.equal(toApy(NaN), 0);
    });
  });

  describe('analyzePoints: stability metrics & outlier resistance', () => {
    it('returns null for an empty series', () => {
      assert.equal(analyzePoints([]), null);
    });

    it('calculates consistent metrics on steady positive funding series', () => {
      const steadyPoints = Array.from({ length: 48 }, (_, i) => ({
        timestamp: new Date(Date.now() - (48 - i) * 3600000).toISOString(),
        spreadApy: 20.0,
      }));

      const res = analyzePoints(steadyPoints);
      assert.ok(res);
      assert.equal(res.dataPoints, 48);
      assert.equal(res.rawMeanApy, 20.0);
      assert.equal(res.metrics.trimmed.trimmedMeanApy, 20.0);
      assert.equal(res.metrics.median.medianApy, 20.0);
      assert.equal(res.winRateHoursPercent, 100);
      assert.equal(res.dailyWinRatePercent, 100);
      // Sharpe ratio is 0 because stdDev is 0
      assert.equal(res.metrics.sharpe.sharpeRatio, 0);
    });

    it('trims transient liquidation spikes without distorting trimmed mean and median', () => {
      // 100 data points: 95 normal points at 15.0% APY, 5 extreme liquidation spikes at +500.0% APY
      const points = [];
      const baseTime = Date.now();
      for (let i = 0; i < 95; i++) {
        points.push({
          timestamp: new Date(baseTime + i * 3600000).toISOString(),
          spreadApy: 15.0,
        });
      }
      for (let i = 0; i < 5; i++) {
        points.push({
          timestamp: new Date(baseTime + (95 + i) * 3600000).toISOString(),
          spreadApy: 500.0,
        });
      }

      const res = analyzePoints(points);
      assert.ok(res);
      // Raw mean is heavily distorted by the 5 spikes: (95*15 + 5*500) / 100 = 39.25
      assert.equal(res.rawMeanApy, 39.25);
      assert.equal(res.maxSpikeApy, 500.0);

      // Trimmed mean truncates top 5% (cutoffIndex = floor(100 * 0.95) = 95)
      // So trimmed mean must be exactly 15.0%
      assert.equal(res.metrics.trimmed.trimmedMeanApy, 15.0);
      assert.equal(res.metrics.trimmed.score, 15.0);

      // Median APY must also remain immune to single-candle spikes
      assert.equal(res.metrics.median.medianApy, 15.0);
    });

    it('penalizes score when funding is intermittent or unprofitable', () => {
      // 48 hours: 24h positive (+20% APY), 24h negative (-10% APY)
      const points = [];
      const baseTime = Date.now();
      for (let i = 0; i < 24; i++) {
        points.push({
          timestamp: new Date(baseTime + i * 3600000).toISOString(),
          spreadApy: 20.0,
        });
      }
      for (let i = 24; i < 48; i++) {
        points.push({
          timestamp: new Date(baseTime + i * 3600000).toISOString(),
          spreadApy: -10.0,
        });
      }

      const res = analyzePoints(points);
      assert.ok(res);
      assert.equal(res.winRateHoursPercent, 50.0);
      assert.equal(res.profitableDays, 1);
      assert.equal(res.totalDays, 2);
      assert.equal(res.dailyWinRatePercent, 50.0);
      // Score must be discounted by win rate
      assert.ok(res.metrics.trimmed.score < res.metrics.trimmed.trimmedMeanApy);
      assert.ok(res.metrics.median.score < res.metrics.median.medianApy);
    });

    it('computes Funding Sharpe Ratio correctly for varying yield spreads', () => {
      // Alternating spreads: 30%, 10%, 30%, 10%... mean = 20%, stdDev > 0
      const points = Array.from({ length: 40 }, (_, i) => ({
        timestamp: new Date(Date.now() + i * 3600000).toISOString(),
        spreadApy: i % 2 === 0 ? 30.0 : 10.0,
      }));

      const res = analyzePoints(points);
      assert.ok(res);
      assert.equal(res.rawMeanApy, 20.0);
      assert.ok(res.metrics.sharpe.sharpeRatio > 0);
      assert.equal(res.metrics.sharpe.score, res.metrics.sharpe.sharpeRatio);
    });
  });

  describe('calculatePairMetrics: timelines and break-even', () => {
    it('computes pair metrics and break-even for aligned timelines', () => {
      const baseTime = 1700000000000;
      // 30 days of hourly points (720 points)
      const seriesLong = [];
      const seriesShort = [];
      for (let i = 0; i < 720; i++) {
        const t = new Date(baseTime + i * 3600000).toISOString();
        seriesLong.push({ t, y: 1.0 }); // 1 bp
        seriesShort.push({ t, y: 3.0 }); // 3 bps -> spread 2 bps
      }

      const result = calculatePairMetrics(seriesLong, seriesShort, 'BTC', 'binance', 'bybit', '30d');
      assert.ok(result);
      assert.equal(result.symbol, 'BTC');
      assert.equal(result.longExchange, 'binance');
      assert.equal(result.shortExchange, 'bybit');
      assert.ok(result.stats30d);
      assert.ok(result.breakEven);
      assert.ok(result.halfLife);
      assert.equal(result.breakEven.feePercent, 0.18);
    });

    it('rejects pairs with disabled exchanges', () => {
      const result = calculatePairMetrics([{ t: '2026-01-01T00:00:00Z', y: 1 }], [{ t: '2026-01-01T00:00:00Z', y: 2 }], 'BTC', 'binance', 'disabled_ex');
      assert.equal(result, null);
    });
  });
});
