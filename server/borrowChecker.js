/**
 * Spot Margin Borrow Availability Checker
 * Queries public margin catalogues from 6 major CEX exchanges (no API keys required):
 * 1. Binance (isMarginTradingAllowed)
 * 2. Bybit (marginTrading === 'utaOnly')
 * 3. OKX (instType === 'MARGIN')
 * 4. Gate.io (/api/v4/margin/currency_pairs)
 * 5. Bitget (/api/v2/margin/currencies, isBorrowable)
 * 6. KuCoin (cross & isolated margin symbols with borrow enabled)
 *
 * (Note: MEXC and Phemex do not support spot margin borrowing for retail traders;
 * for MEXC/Phemex, the checker directs the user to borrow on Binance/Gate/OKX/Bitget or use Cross-Perp).
 */

import axios from 'axios';

class BorrowChecker {
  constructor() {
    this.cache = null;
    this.cacheExpiry = 0;
    this.CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes cache
    this.isFetching = false;
  }

  normalizeSymbol(rawSymbol) {
    if (!rawSymbol) return '';
    let sym = String(rawSymbol).trim().toUpperCase();
    // Strip common contract prefixes like 1000, 10000, k
    sym = sym.replace(/^10+/, '').replace(/^K/, '');
    // Strip quote currencies if present
    sym = sym.replace(/USDT$|USDC$|USD$|PERP$/, '');
    return sym;
  }

  async fetchMarginCatalogs(forceRefresh = false) {
    if (!forceRefresh && this.cache && Date.now() < this.cacheExpiry) {
      return this.cache;
    }

    if (this.isFetching && this.cache) {
      return this.cache;
    }

    this.isFetching = true;

    try {
      const [
        binanceRes,
        bybitRes,
        okxRes,
        gateRes,
      ] = await Promise.all([
        // 1. Binance Spot ExchangeInfo
        axios.get('https://api.binance.com/api/v3/exchangeInfo', {
          timeout: 6500,
          headers: { 'User-Agent': 'Mozilla/5.0' },
        }).catch((e) => {
          console.warn('[BorrowChecker] Binance error:', e.message);
          return { data: null };
        }),

        // 2. Bybit Spot Instruments
        axios.get('https://api.bybit.com/v5/market/instruments-info?category=spot&limit=1000', {
          timeout: 6500,
          headers: { 'User-Agent': 'Mozilla/5.0' },
        }).catch((e) => {
          console.warn('[BorrowChecker] Bybit error:', e.message);
          return { data: null };
        }),

        // 3. OKX Margin Instruments
        axios.get('https://www.okx.com/api/v5/public/instruments?instType=MARGIN', {
          timeout: 6500,
          headers: { 'User-Agent': 'Mozilla/5.0' },
        }).catch((e) => {
          console.warn('[BorrowChecker] OKX error:', e.message);
          return { data: null };
        }),

        // 4. Gate.io Margin Pairs (700+ altcoins)
        axios.get('https://api.gateio.ws/api/v4/margin/currency_pairs', {
          timeout: 6500,
          headers: { 'User-Agent': 'Mozilla/5.0' },
        }).catch((e) => {
          console.warn('[BorrowChecker] Gate.io error:', e.message);
          return { data: null };
        }),
      ]);

      // 1. Binance set
      const binanceCoins = new Set();
      if (binanceRes.data?.symbols && Array.isArray(binanceRes.data.symbols)) {
        for (const s of binanceRes.data.symbols) {
          if (s.isMarginTradingAllowed && (s.quoteAsset === 'USDT' || s.quoteAsset === 'USDC')) {
            binanceCoins.add(s.baseAsset.toUpperCase());
          }
        }
      }

      // 2. Bybit set
      const bybitCoins = new Set();
      if (bybitRes.data?.result?.list && Array.isArray(bybitRes.data.result.list)) {
        for (const item of bybitRes.data.result.list) {
          if (item.marginTrading === 'utaOnly' || item.marginTrading === 'both') {
            bybitCoins.add(item.baseCoin.toUpperCase());
          }
        }
      }

      // 3. OKX set
      const okxCoins = new Set();
      if (okxRes.data?.data && Array.isArray(okxRes.data.data)) {
        for (const item of okxRes.data.data) {
          if (item.baseCcy) {
            okxCoins.add(item.baseCcy.toUpperCase());
          }
        }
      }

      // 4. Gate.io set
      const gateCoins = new Set();
      if (Array.isArray(gateRes.data)) {
        for (const pair of gateRes.data) {
          if (pair.status === 1 && pair.base) {
            gateCoins.add(pair.base.toUpperCase());
          }
        }
      }

      // 5. Bitget: Hard-disabled, catalog is empty
      const bitgetCoins = new Set();

      // 6. KuCoin: Hard-disabled, catalog is empty
      const kucoinCoins = new Set();

      this.cache = {
        binance: binanceCoins,
        bybit: bybitCoins,
        okx: okxCoins,
        gateio: gateCoins,
        bitget: bitgetCoins,
        kucoin: kucoinCoins,
        timestamp: Date.now(),
      };
      this.cacheExpiry = Date.now() + this.CACHE_TTL_MS;

      console.log(
        `[BorrowChecker] Updated margin catalogs across 4 CEXes: Gate.io=${gateCoins.size}, Binance=${binanceCoins.size}, OKX=${okxCoins.size}, Bybit=${bybitCoins.size} coins`
      );

      return this.cache;
    } catch (err) {
      console.error('[BorrowChecker] Failed to update margin catalogs:', err.message);
      if (this.cache) return this.cache;
      return {
        binance: new Set(),
        bybit: new Set(),
        okx: new Set(),
        gateio: new Set(),
        bitget: new Set(),
        kucoin: new Set(),
        timestamp: Date.now(),
      };
    } finally {
      this.isFetching = false;
    }
  }

  /**
   * Evaluates margin borrow availability for a token across all 6 supported CEXes
   * @param {string} rawSymbol - e.g. 'RSR', 'BTC', 'GTC', 'TRB'
   * @param {string} targetExchange - e.g. 'bybit', 'binance', 'okx', 'gateio', 'bitget', 'kucoin', 'mexc', 'phemex'
   */
  checkBorrow(rawSymbol, targetExchange = null, catalogs = null) {
    const cats = catalogs || this.cache;
    const sym = this.normalizeSymbol(rawSymbol);

    if (!cats || !sym) {
      return {
        isBorrowable: false,
        onTargetExchange: false,
        badgeText: 'Проверка...',
        badgeColor: 'slate',
        status: 'unknown',
        availableExchanges: [],
        details: {
          binance: false,
          bybit: false,
          okx: false,
          gateio: false,
          bitget: false,
          kucoin: false,
          mexc: false,
          phemex: false,
        },
      };
    }

    const hasBinance = cats.binance ? cats.binance.has(sym) : false;
    const hasBybit = cats.bybit ? cats.bybit.has(sym) : false;
    const hasOkx = cats.okx ? cats.okx.has(sym) : false;
    const hasGate = cats.gateio ? cats.gateio.has(sym) : false;
    const hasBitget = false; // Bitget is hard-disabled
    const hasKucoin = false; // KuCoin is hard-disabled

    const availableExchanges = [];
    if (hasBinance) availableExchanges.push('Binance');
    if (hasGate) availableExchanges.push('Gate');
    if (hasBybit) availableExchanges.push('Bybit');
    if (hasOkx) availableExchanges.push('OKX');

    const target = String(targetExchange || '').toLowerCase().replace(/[^a-z]/g, '');
    let onTargetExchange = false;

    if (target === 'binance' && hasBinance) onTargetExchange = true;
    else if (target === 'bybit' && hasBybit) onTargetExchange = true;
    else if (target === 'okx' && hasOkx) onTargetExchange = true;
    else if ((target === 'gateio' || target === 'gate') && hasGate) onTargetExchange = true;

    // Check if target is a known futures-only exchange or disabled exchange with no spot margin
    const isNoSpotMarginExchange = ['mexc', 'bitget', 'kucoin', 'phemex', 'hyperliquid', 'aster', 'bullet', 'variational'].includes(target);

    // Evaluate user-facing badge
    let badgeText = 'Только Кросс-Хедж';
    let badgeColor = 'slate';
    let status = 'unavailable';

    if (onTargetExchange) {
      badgeText = 'Заем: ДА 🟢';
      badgeColor = 'emerald';
      status = 'available_target';
    } else if (availableExchanges.length > 0) {
      // Show up to 2-3 exchanges in badge
      const exDisplay = availableExchanges.slice(0, 2).join('/');
      const plusCount = availableExchanges.length > 2 ? `+${availableExchanges.length - 2}` : '';
      badgeText = `Заем: ${exDisplay}${plusCount ? ' ' + plusCount : ''} 🟡`;
      badgeColor = 'amber';
      status = 'available_alternative';
    } else {
      badgeText = 'Заем: НЕТ (Кросс) ⚪';
      badgeColor = 'slate';
      status = 'unavailable';
    }

    return {
      isBorrowable: availableExchanges.length > 0,
      onTargetExchange,
      targetExchangeName: targetExchange,
      isNoSpotMarginExchange,
      badgeText,
      badgeColor,
      status,
      availableExchanges,
      details: {
        binance: hasBinance,
        bybit: hasBybit,
        okx: hasOkx,
        gateio: hasGate,
        bitget: false, // Bitget is hard-disabled
        kucoin: false, // KuCoin is hard-disabled
        mexc: false, // MEXC spot margin is discontinued
        phemex: false, // Phemex does not offer spot margin borrowing
      },
    };
  }
}

const borrowChecker = new BorrowChecker();
export default borrowChecker;
export { BorrowChecker };
