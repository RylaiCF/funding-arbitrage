import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isUltraVolatile } from './volatility.js';

describe('Market Volatility Guard (server/volatility.js)', () => {
  it('returns not volatile when inputs or tickersMap are empty', () => {
    assert.deepEqual(isUltraVolatile(null, new Map()), { isVolatile: false });
    assert.deepEqual(isUltraVolatile('BTC', null), { isVolatile: false });
    assert.deepEqual(isUltraVolatile('BTC', new Map()), { isVolatile: false });
  });

  it('marks calm assets as not volatile under default thresholds', () => {
    const tickersMap = new Map();
    tickersMap.set('BTC', {
      priceChangePercent: 2.5,
      highLowRangePercent: 4.8,
    });

    const res = isUltraVolatile('BTC', tickersMap);
    assert.equal(res.isVolatile, false);
    assert.equal(res.priceChangePercent, 2.5);
    assert.equal(res.highLowRangePercent, 4.8);
  });

  it('detects extreme 24h price change exceeding default 18% threshold', () => {
    const tickersMap = new Map();
    tickersMap.set('SOL', {
      priceChangePercent: 22.4,
      highLowRangePercent: 20.0,
    });

    const res = isUltraVolatile('SOL', tickersMap);
    assert.equal(res.isVolatile, true);
    assert.match(res.reason, /24h change: 22.4%/);
  });

  it('detects extreme 24h high-low range exceeding default 25% threshold', () => {
    const tickersMap = new Map();
    tickersMap.set('ETH', {
      priceChangePercent: 5.0,
      highLowRangePercent: 32.1,
    });

    const res = isUltraVolatile('ETH', tickersMap);
    assert.equal(res.isVolatile, true);
    assert.match(res.reason, /размах: 32.1%/);
  });

  it('resolves 1000x multiplier prefix aliases correctly', () => {
    const tickersMap = new Map();
    // Ticker stored as 1000PEPE
    tickersMap.set('1000PEPE', {
      priceChangePercent: 25.0,
      highLowRangePercent: 40.0,
    });

    // Querying with standard raw symbol PEPE
    const res = isUltraVolatile('PEPE', tickersMap);
    assert.equal(res.isVolatile, true);
    assert.equal(res.priceChangePercent, 25.0);
  });

  it('respects custom user-provided risk thresholds', () => {
    const tickersMap = new Map();
    tickersMap.set('DOGE', {
      priceChangePercent: 12.0,
      highLowRangePercent: 14.0,
    });

    // Calm under default thresholds (18% and 25%)
    assert.equal(isUltraVolatile('DOGE', tickersMap).isVolatile, false);

    // Volatile under stricter custom thresholds (10% and 10%)
    const strictRes = isUltraVolatile('DOGE', tickersMap, { max24hChange: 10, max24hRange: 10 });
    assert.equal(strictRes.isVolatile, true);
  });
});
