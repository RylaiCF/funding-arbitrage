/**
 * Squeeze & Negative Funding Radar Scanner
 * Detects extreme negative funding rates across 44+ exchanges from Loris.tools live snapshot,
 * computes daily yield payments to Long positions, and structures actionable delta-neutral setups:
 * 1. Spot Margin Short + Perp Long (Single Exchange)
 * 2. Cross-Exchange Perp Arbitrage (Long Squeezed Perp + Short Hedge Perp)
 */

import lorisClient from './lorisClient.js';
import volatility from './volatility.js';
import db from './db.js';
import borrowChecker from './borrowChecker.js';

const BPS_8H_TO_APY_PERCENT = 10.95;

function toApy(bps8h) {
  if (bps8h === null || bps8h === undefined || isNaN(bps8h)) return 0;
  return Number((bps8h * BPS_8H_TO_APY_PERCENT).toFixed(2));
}

/**
 * Evaluates the market risk profile for short-squeeze arbitrage:
 * - Price momentum & 24h pump intensity
 * - 24h High/Low volatility range
 * - Spot Margin Borrow safety factor (Unified Margin protects against liquidation)
 * - 24h Trading Volume & Liquidity
 * - Calculated Liquidation points for short hedge leg at 1x, 2x, 3x, 5x leverage
 */
function evaluateSqueezeRisk(symbol, oiRank, ticker, borrowInfo, ratePerPeriodPercent) {
  let score = 2; // base score (scale 1 - 10)
  const factors = [];
  const warnings = [];

  const change24h = ticker?.rawPriceChangePercent !== undefined ? ticker.rawPriceChangePercent : 0;
  const highLowRange = ticker?.highLowRangePercent !== undefined ? ticker.highLowRangePercent : 0;
  const price = ticker?.lastPrice || null;
  const volumeUsd = ticker?.volumeUsd || 0;

  // 1. Momentum & 24h pump factor
  if (change24h >= 40) {
    score += 4.5;
    warnings.push(`Сильный памп (+${change24h}% за 24ч) — повышенный риск выноса шорт-ноги`);
  } else if (change24h >= 20) {
    score += 2.5;
    warnings.push(`Умеренный памп (+${change24h}% за 24ч) — контролируйте маржинальное обеспечение`);
  } else if (change24h <= -20) {
    score += 1.5;
    warnings.push(`Дамп (-${Math.abs(change24h)}% за 24ч) — возможно расширение дисконта фьючерса к споту`);
  } else {
    factors.push(`Спокойная динамика цены (${change24h >= 0 ? '+' : ''}${change24h}% за 24ч) — низкий риск резкого выноса`);
  }

  // 2. High-Low volatility range
  if (highLowRange >= 60) {
    score += 2;
    warnings.push(`Широкий суточный размах High/Low (${highLowRange}%) — высокая внутридневная турбулентность`);
  } else if (highLowRange >= 30) {
    score += 1;
    warnings.push(`Суточный размах High/Low (${highLowRange}%)`);
  } else if (highLowRange > 0) {
    factors.push(`Умеренная волатильность (размах High/Low ${highLowRange}%)`);
  }

  // 3. Magnitude of negative funding
  if (Math.abs(ratePerPeriodPercent) >= 1.0) {
    score += 1.5;
    warnings.push(`Агрессивный шорт-сквиз (${ratePerPeriodPercent}% за период) — сильное давление шортистов`);
  } else if (Math.abs(ratePerPeriodPercent) >= 0.5) {
    score += 0.5;
  }

  // 4. Spot Margin Borrow Safety factor (HUGE safety reducer!)
  const borrowCount = borrowInfo?.availableExchanges?.length || 0;
  if (borrowInfo?.isBorrowable) {
    score -= 2.5; // Having spot margin drastically lowers liquidation risk because 1:1 spot hedge has no perp liquidation!
    factors.push(`🛡️ Доступен спотовый заем (${borrowCount} бирж: ${borrowInfo.availableExchanges.join(', ')}) — ликвидация исключена при Unified Margin!`);
  } else {
    score += 1;
    warnings.push(`❌ Нет спотового заема — хеджирование только через фьючерсы (риск ликвидации шорта при росте)`);
  }

  // 5. Liquidity / Volume factor
  if (volumeUsd > 0 && volumeUsd < 2_000_000) {
    score += 1.5;
    warnings.push(`Низкая ликвидность (< $2M суточный объем) — риск проскальзывания при входе/выходе`);
  } else if (volumeUsd >= 15_000_000) {
    factors.push(`Высокая ликвидность ($${(volumeUsd / 1_000_000).toFixed(1)}M суточный объем)`);
  }

  // Clamp score 1 to 10
  const finalScore = Math.min(10, Math.max(1, Math.round(score)));

  // Risk categorization
  let level = 'low';
  let label = 'Низкий риск';
  let badgeColor = 'emerald';

  if (finalScore >= 8) {
    level = 'critical';
    label = 'Экстремальный';
    badgeColor = 'rose';
  } else if (finalScore >= 6) {
    level = 'high';
    label = 'Высокий риск';
    badgeColor = 'orange';
  } else if (finalScore >= 4) {
    level = 'medium';
    label = 'Умеренный';
    badgeColor = 'amber';
  } else {
    level = 'low';
    label = 'Низкий риск';
    badgeColor = 'emerald';
  }

  // Estimated liquidation price for Short hedge leg at different leverages:
  const liquidation = price
    ? {
        price1x: Number((price * 1.95).toFixed(price < 0.01 ? 6 : 4)),
        buffer1x: '+95%',
        price2x: Number((price * 1.45).toFixed(price < 0.01 ? 6 : 4)),
        buffer2x: '+45%',
        price3x: Number((price * 1.28).toFixed(price < 0.01 ? 6 : 4)),
        buffer3x: '+28%',
        price5x: Number((price * 1.16).toFixed(price < 0.01 ? 6 : 4)),
        buffer5x: '+16%',
      }
    : null;

  return {
    score: finalScore,
    level,
    label,
    badgeColor,
    change24h,
    highLowRange,
    liquidation,
    factors,
    warnings,
    isPump: change24h >= 20,
  };
}

class SqueezeScanner {
  constructor() {
    this.scanState = {
      isScanning: false,
      progress: 0,
      stepText: 'Готов к сканированию радара сквизов',
      results: null,
      error: null,
      lastScannedAt: null,
    };
  }

  getScanStatus() {
    return {
      ...this.scanState,
      cachedCount: this.scanState.results ? this.scanState.results.length : 0,
    };
  }

  /**
   * Fast scan pipeline: processes live funding snapshot & market tickers.
   * Runs in ~1-2 seconds without making hundreds of historical requests.
   */
  async executeScan(params = {}) {
    const minNegativeBps = Number(params.min_negative_bps ?? -5); // default <= -5 bps (-0.05% per 8h)
    const maxOiRank = Number(params.max_oi_rank ?? 2000);
    const minDailyYield = Number(params.min_daily_yield ?? 0);

    this.scanState.isScanning = true;
    this.scanState.progress = 15;
    this.scanState.stepText = 'Получение актуального снимка рынка со всех 44 бирж...';
    this.scanState.error = null;

    try {
      // 1. Fetch live funding snapshot from Loris, market tickers & margin catalogs concurrently
      const [liveData, marketTickers, marginCatalogs] = await Promise.all([
        lorisClient.getLiveFunding(Boolean(params.forceRefresh)),
        volatility.fetchFastMarketTickers().catch(() => null),
        borrowChecker.fetchMarginCatalogs().catch(() => null),
      ]);

      this.scanState.progress = 50;
      this.scanState.stepText = 'Анализ отрицательных ставок и шорт-сквизов...';

      const enabledExchangeIds = db.getEnabledExchangeIds();
      const allExchanges = db.getAllExchanges();
      const exchangeMap = new Map(allExchanges.map((e) => [e.id, e]));

      const symbols = liveData.symbols || [];
      const fundingRates = liveData.funding_rates || {};
      const oiRankings = liveData.oi_rankings || {};

      const opportunities = [];

      for (const symbol of symbols) {
        const oiRank = oiRankings[symbol] !== undefined ? oiRankings[symbol] : 999;
        if (oiRank > maxOiRank) continue;

        // Gather all rates on enabled exchanges for this symbol
        const exchangeRates = [];
        let hasSqueezeRate = false;

        for (const exId of enabledExchangeIds) {
          if (db.HARD_DISABLED_EXCHANGES && db.HARD_DISABLED_EXCHANGES.has(exId.toLowerCase())) continue;
          const rateVal = fundingRates[exId]?.[symbol];
          if (rateVal !== undefined && rateVal !== null && !isNaN(rateVal)) {
            const rateBps = Number(rateVal);
            const exInfo = exchangeMap.get(exId) || {
              id: exId,
              display_name: exId.toUpperCase(),
              type: 'cex',
              interval_hours: 8,
            };

            const intervalHours = exInfo.interval_hours || 8;
            const ratePercent = Number((rateBps * 0.01).toFixed(4));
            const rateApy = toApy(rateBps);

            if (rateBps <= minNegativeBps) {
              hasSqueezeRate = true;
            }

            exchangeRates.push({
              exchange: exId,
              displayName: exInfo.display_name,
              type: exInfo.type,
              intervalHours,
              rateBps,
              ratePercent,
              rateApy,
            });
          }
        }

        // If no exchange has a negative funding meeting the threshold, skip
        if (!hasSqueezeRate || exchangeRates.length === 0) continue;

        // Sort by rateBps ascending (most negative first)
        exchangeRates.sort((a, b) => a.rateBps - b.rateBps);

        const squeezedLeg = exchangeRates[0]; // Most negative rate
        const squeezedInterval = squeezedLeg.intervalHours || 8;
        const settlementsPerDay = 24 / squeezedInterval;
        const ratePerPeriodPercent = squeezedLeg.ratePercent;
        const dailyYieldLongPercent = Number((Math.abs(ratePerPeriodPercent) * settlementsPerDay).toFixed(3));
        const squeezedApy = squeezedLeg.rateApy;

        if (dailyYieldLongPercent < minDailyYield) continue;

        // Severity evaluation (Squeeze Intensity / Payout)
        let severity = 'minor';
        let severityLabel = 'Небольшой минус';
        if (Math.abs(ratePerPeriodPercent) >= 1.0 || dailyYieldLongPercent >= 4.5) {
          severity = 'extreme';
          severityLabel = 'Сверхсквиз 💥';
        } else if (Math.abs(ratePerPeriodPercent) >= 0.5 || dailyYieldLongPercent >= 2.0) {
          severity = 'high';
          severityLabel = 'Высокий сквиз ⚡';
        } else if (Math.abs(ratePerPeriodPercent) >= 0.15 || dailyYieldLongPercent >= 0.6) {
          severity = 'moderate';
          severityLabel = 'Умеренный сквиз 📊';
        }

        // Ticker data
        const ticker = marketTickers?.get(symbol) || null;
        const price = ticker?.lastPrice || null;
        const priceChange24h = ticker?.rawPriceChangePercent !== undefined ? ticker.rawPriceChangePercent : null;
        const highLowRangePercent = ticker?.highLowRangePercent !== undefined ? ticker.highLowRangePercent : null;
        const volumeUsd = ticker?.volumeUsd || null;

        // Spot margin borrow availability check across 6 CEXes
        const borrowInfo = borrowChecker.checkBorrow(symbol, squeezedLeg.exchange, marginCatalogs);

        // Comprehensive Market & Liquidation Risk Evaluation
        const risk = evaluateSqueezeRisk(symbol, oiRank, ticker, borrowInfo, ratePerPeriodPercent);

        // Strategy 1: Spot Margin Short + Perp Long (Single Exchange)
        const estDailyBorrowPercent = 0.08; // Typical ~30% APR margin borrow
        const netDailySpot = Number(Math.max(0, dailyYieldLongPercent - estDailyBorrowPercent).toFixed(3));
        const netApySpot = Number((netDailySpot * 365).toFixed(2));

        // Strategy 2: Cross-Exchange Perp Hedge
        let hedgeLeg = null;
        let crossNetDailySpread = 0;
        let crossNetSpreadApy = 0;

        if (exchangeRates.length > 1) {
          hedgeLeg = exchangeRates[exchangeRates.length - 1];
          if (hedgeLeg.exchange !== squeezedLeg.exchange) {
            const hedgeInterval = hedgeLeg.intervalHours || 8;
            const hedgeSettlements = 24 / hedgeInterval;
            const hedgeDailyContribution = Number((hedgeLeg.ratePercent * hedgeSettlements).toFixed(3));
            crossNetDailySpread = Number((dailyYieldLongPercent + hedgeDailyContribution).toFixed(3));
            crossNetSpreadApy = Number((hedgeLeg.rateApy - squeezedApy).toFixed(2));
          } else {
            hedgeLeg = null;
          }
        }

        // Tag all exchange entries for UI highlighting
        const allExchangeRates = exchangeRates.map((ex) => ({
          ...ex,
          isSqueezed: ex.exchange === squeezedLeg.exchange,
          isHedge: hedgeLeg ? ex.exchange === hedgeLeg.exchange : false,
        }));

        opportunities.push({
          symbol,
          oiRank,
          price,
          priceChange24h,
          highLowRangePercent,
          volumeUsd,
          severity,
          severityLabel,
          risk,
          borrowInfo,
          squeezedExchange: squeezedLeg.exchange,
          squeezedDisplayName: squeezedLeg.displayName,
          squeezedType: squeezedLeg.type,
          intervalHours: squeezedInterval,
          settlementsPerDay,
          ratePerPeriodPercent,
          dailyYieldLongPercent,
          squeezedApy,
          strategies: {
            spotMargin: {
              exchange: squeezedLeg.exchange,
              displayName: squeezedLeg.displayName,
              estDailyBorrowPercent,
              netDailyYield: netDailySpot,
              netApy: netApySpot,
              borrowInfo,
            },
            crossExchange: hedgeLeg
              ? {
                  longExchange: squeezedLeg.exchange,
                  longDisplayName: squeezedLeg.displayName,
                  shortExchange: hedgeLeg.exchange,
                  shortDisplayName: hedgeLeg.displayName,
                  hedgeRatePerPeriod: hedgeLeg.ratePercent,
                  hedgeRateApy: hedgeLeg.rateApy,
                  netSpreadApy: crossNetSpreadApy,
                  netDailySpread: crossNetDailySpread,
                }
              : null,
          },
          allExchangeRates,
        });
      }

      this.scanState.progress = 85;
      this.scanState.stepText = 'Сортировка и сохранение результатов в SQLite...';

      // Sort by daily yield descending (highest profit first)
      opportunities.sort((a, b) => b.dailyYieldLongPercent - a.dailyYieldLongPercent);

      // Save to SQLite
      db.saveSqueezeScanCache(
        {
          min_negative_bps: minNegativeBps,
          max_oi_rank: maxOiRank,
          min_daily_yield: minDailyYield,
        },
        opportunities
      );

      this.scanState.progress = 100;
      this.scanState.isScanning = false;
      this.scanState.stepText = `Сканирование завершено! Обнаружено ${opportunities.length} монет с отрицательным фандингом.`;
      this.scanState.results = opportunities;
      this.scanState.lastScannedAt = new Date().toISOString();

      return opportunities;
    } catch (err) {
      console.error('[SqueezeScanner] Scan error:', err);
      this.scanState.isScanning = false;
      this.scanState.progress = 0;
      this.scanState.error = err.message;
      this.scanState.stepText = `Ошибка сканирования: ${err.message}`;
      throw err;
    }
  }
}

const squeezeScanner = new SqueezeScanner();
export default squeezeScanner;
export { SqueezeScanner };
