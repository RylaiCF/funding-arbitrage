import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getTakerFee,
  detectStrategyType,
  getExchangeUrl,
  VENUE_TAKER_FEES,
  TIER1_EXCHANGES,
  TIER2_EXCHANGES,
} from './spreadAnalyzer.js';

describe('Spread Analyzer Engine (server/spreadAnalyzer.js)', () => {
  describe('Venue taker fee calculation (getTakerFee)', () => {
    it('returns exact VIP0 taker fee for Tier-1 spot and perpetual markets', () => {
      // Binance
      assert.equal(getTakerFee('binance', 'spot'), 0.10);
      assert.equal(getTakerFee('binance', 'perp'), 0.05);
      assert.equal(getTakerFee('binance-usdm', 'perp'), 0.05);

      // Bybit
      assert.equal(getTakerFee('bybit', 'spot'), 0.10);
      assert.equal(getTakerFee('bybit', 'perp'), 0.055);

      // OKX
      assert.equal(getTakerFee('okx', 'spot'), 0.10);
      assert.equal(getTakerFee('okx', 'perp'), 0.05);

      // Hyperliquid (DEX)
      assert.equal(getTakerFee('hyperliquid', 'spot'), 0.05);
      assert.equal(getTakerFee('hyperliquid', 'perp'), 0.035);
    });

    it('returns specific fees for secondary venues', () => {
      assert.equal(getTakerFee('gate', 'spot'), 0.15);
      assert.equal(getTakerFee('gate', 'perp'), 0.05);
      assert.equal(getTakerFee('lighter', 'perp'), 0.03);
    });

    it('falls back to default fee rates for unknown venues', () => {
      assert.equal(getTakerFee('unknown_cex', 'spot'), VENUE_TAKER_FEES.default.spot);
      assert.equal(getTakerFee('unknown_cex', 'perp'), VENUE_TAKER_FEES.default.perp);
      assert.equal(getTakerFee(null, 'perp'), VENUE_TAKER_FEES.default.perp);
    });
  });

  describe('detectStrategyType', () => {
    it('correctly maps SPOT and PERP combinations to strategy models', () => {
      assert.deepEqual(detectStrategyType('spot', 'perp'), {
        code: 'spot-perp',
        label: 'SPOT ➔ PERP',
        desc: 'Cash & Carry (Базисный)',
      });

      assert.deepEqual(detectStrategyType('perp', 'perp'), {
        code: 'perp-perp',
        label: 'PERP ➔ PERP',
        desc: 'Фьючерсный спред',
      });

      assert.deepEqual(detectStrategyType('spot', 'spot'), {
        code: 'spot-spot',
        label: 'SPOT ➔ SPOT',
        desc: 'Физический арбитраж',
      });

      assert.deepEqual(detectStrategyType('perp', 'spot'), {
        code: 'perp-spot',
        label: 'PERP ➔ SPOT',
        desc: 'Reverse Cash & Carry',
      });
    });

    it('handles unexpected market types with fallback', () => {
      const res = detectStrategyType('future', 'options');
      assert.equal(res.code, 'cross');
      assert.equal(res.label, 'FUTURE ➔ OPTIONS');
    });
  });

  describe('getExchangeUrl trade link generation', () => {
    it('generates direct deep links for Binance Spot and Futures', () => {
      assert.equal(
        getExchangeUrl('binance', 'BTCUSDT', 'spot', 'BTC', 'USDT'),
        'https://www.binance.com/en/trade/BTC_USDT'
      );
      assert.equal(
        getExchangeUrl('binance', 'BTCUSDT', 'perp', 'BTC', 'USDT'),
        'https://www.binance.com/en/futures/BTCUSDT'
      );
    });

    it('generates direct deep links for Bybit Spot and Linear Perp', () => {
      assert.equal(
        getExchangeUrl('bybit', 'ETHUSDT', 'spot', 'ETH', 'USDT'),
        'https://www.bybit.com/en/trade/spot/ETH/USDT'
      );
      assert.equal(
        getExchangeUrl('bybit', 'ETHUSDT', 'perp', 'ETH', 'USDT'),
        'https://www.bybit.com/trade/usdt/ETHUSDT'
      );
    });

    it('generates deep links for DEXes (Hyperliquid, Lighter, Paradex)', () => {
      assert.equal(
        getExchangeUrl('hyperliquid', 'SOLUSDC', 'perp', 'SOL', 'USDC'),
        'https://app.hyperliquid.xyz/trade/SOL'
      );
      assert.equal(
        getExchangeUrl('lighter', 'WBTC', 'perp', 'WBTC', 'USDC'),
        'https://app.lighter.xyz/trade/WBTC'
      );
      assert.equal(
        getExchangeUrl('paradex', 'ARB-USD-PERP', 'perp', 'ARB', 'USD'),
        'https://app.paradex.trade/trade/ARB-USD-PERP'
      );
    });

    it('returns null when symbol or exchange is unsupported', () => {
      assert.equal(getExchangeUrl('nonexistent_exchange', 'BTC', 'perp', 'BTC', 'USDT'), null);
      assert.equal(getExchangeUrl('binance', '', 'spot', '', ''), null);
    });
  });

  describe('Arbitrage math: spreads, taker fee drag and risk tiers', () => {
    it('calculates gross spread, total fees and net entry/roundtrip spread', () => {
      // Long Bybit Perp at Ask 100, Short Binance Perp at Bid 101
      const longAsk = 100.0;
      const shortBid = 101.0;
      const denom = longAsk;

      const grossEntrySpread = ((shortBid - longAsk) / denom) * 100; // +1.0%
      assert.equal(grossEntrySpread, 1.0);

      const longFee = getTakerFee('bybit', 'perp'); // 0.055
      const shortFee = getTakerFee('binance', 'perp'); // 0.05
      const totalFees = Number((longFee + shortFee).toFixed(3)); // 0.105%
      const roundTripFees = Number((totalFees * 2).toFixed(3)); // 0.21%

      const netSpread = Number((grossEntrySpread - totalFees).toFixed(3));
      const netRoundTripSpread = Number((grossEntrySpread - roundTripFees).toFixed(3));

      assert.equal(netSpread, 0.895);
      assert.equal(netRoundTripSpread, 0.79);
      assert.ok(netRoundTripSpread > 0, 'Must remain profitable after full round-trip taker fees');
    });

    it('identifies Tier-1 and Tier-2 exchange classifications', () => {
      assert.ok(TIER1_EXCHANGES.includes('binance'));
      assert.ok(TIER1_EXCHANGES.includes('bybit'));
      assert.ok(TIER1_EXCHANGES.includes('okx'));
      assert.ok(TIER1_EXCHANGES.includes('hyperliquid'));

      assert.ok(TIER2_EXCHANGES.includes('gate'));
      assert.ok(TIER2_EXCHANGES.includes('lighter'));
      assert.ok(TIER2_EXCHANGES.includes('backpack'));
    });
  });
});
