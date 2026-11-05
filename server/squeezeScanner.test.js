import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSqueezeRisk } from './squeezeScanner.js';

describe('Squeeze & Negative Funding Risk Engine (server/squeezeScanner.js)', () => {
  it('evaluates calm market with spot borrow as low risk', () => {
    const ticker = {
      rawPriceChangePercent: 2.1,
      highLowRangePercent: 5.4,
      lastPrice: 100.0,
      volumeUsd: 25_000_000,
    };
    const borrowInfo = {
      isBorrowable: true,
      availableExchanges: ['binance', 'bybit'],
    };

    const risk = evaluateSqueezeRisk('SOL', 5, ticker, borrowInfo, -0.05);
    assert.ok(risk);
    assert.equal(risk.level, 'low');
    assert.equal(risk.isPump, false);
    assert.ok(risk.score <= 3);
    assert.equal(risk.warnings.length, 0);
    // Factors must note calm momentum, spot borrow and high liquidity
    assert.ok(risk.factors.some(f => f.includes('спотовый заем')));
    assert.ok(risk.factors.some(f => f.includes('Высокая ликвидность')));
  });

  it('escalates risk level during aggressive pumps and high volatility', () => {
    const ticker = {
      rawPriceChangePercent: 45.0, // extreme pump >= 40%
      highLowRangePercent: 65.0,   // extreme range >= 60%
      lastPrice: 1.0,
      volumeUsd: 1_000_000,       // low volume
    };
    const borrowInfo = {
      isBorrowable: false,
      availableExchanges: [],
    };

    const risk = evaluateSqueezeRisk('MEME', 120, ticker, borrowInfo, -1.2);
    assert.ok(risk);
    assert.equal(risk.isPump, true);
    assert.ok(risk.score >= 8, `Expected critical score >= 8, got ${risk.score}`);
    assert.equal(risk.level, 'critical');
    assert.ok(risk.warnings.some(w => w.includes('Сильный памп')));
    assert.ok(risk.warnings.some(w => w.includes('Широкий суточный размах')));
    assert.ok(risk.warnings.some(w => w.includes('Агрессивный шорт-сквиз')));
    assert.ok(risk.warnings.some(w => w.includes('Нет спотового заема')));
  });

  it('calculates short hedge liquidation estimates across leverage tiers', () => {
    const ticker = {
      rawPriceChangePercent: 0,
      highLowRangePercent: 0,
      lastPrice: 100.0,
      volumeUsd: 10_000_000,
    };

    const risk = evaluateSqueezeRisk('BTC', 1, ticker, null, -0.1);
    assert.ok(risk.liquidation);
    assert.equal(risk.liquidation.price1x, 195.0);
    assert.equal(risk.liquidation.buffer1x, '+95%');
    assert.equal(risk.liquidation.price2x, 145.0);
    assert.equal(risk.liquidation.buffer2x, '+45%');
    assert.equal(risk.liquidation.price3x, 128.0);
    assert.equal(risk.liquidation.buffer3x, '+28%');
    assert.equal(risk.liquidation.price5x, 116.0);
    assert.equal(risk.liquidation.buffer5x, '+16%');
  });

  it('handles missing or partial ticker data gracefully', () => {
    const risk = evaluateSqueezeRisk('UNKNOWN', null, null, null, 0);
    assert.ok(risk);
    assert.equal(risk.liquidation, null);
    assert.equal(risk.change24h, 0);
    assert.equal(risk.highLowRange, 0);
    assert.ok(risk.score >= 1 && risk.score <= 10);
  });
});
