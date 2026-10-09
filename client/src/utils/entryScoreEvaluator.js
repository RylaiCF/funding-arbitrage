import { getBreakEven, getTrend } from './metricsHelper.js';
import { evaluateRisk } from './riskEvaluator.js';

/**
 * Evaluates comprehensive Arbitrage Entry Score (0 to 100 points).
 * 
 * Factor Weights:
 * 1. Yield Factor (Доходность): up to 30 pts
 *    - Trimmed Mean APY (0-25 pts)
 *    - Current Spread APY alignment (0-5 pts)
 * 
 * 2. Stability Factor (Устойчивость фандинга): up to 25 pts
 *    - Funding Sharpe Ratio (0-15 pts)
 *    - Positive hours & days Win-Rate (0-10 pts)
 * 
 * 3. Payback & Trend Factor (Окупаемость комиссий и тренд): up to 25 pts
 *    - Trading fees Break-Even time (0-15 pts)
 *    - 24h vs 7d Funding Trend momentum (0-10 pts)
 * 
 * 4. Safety & Liquidity Factor (Безопасность и ликвидность): up to 20 pts
 *    - Open Interest Market Rank (0-10 pts)
 *    - Historical Deep Inversion / Min Spread (0-5 pts)
 *    - Base token price volatility & ATR % (0-5 pts)
 * 
 * Hard Penalties & Caps:
 * - Current spread <= 0: -25 pts and hard-capped at 35 pts
 * - High asset risk (level === 'high'): -15 pts and hard-capped at 60 pts (max Tier B, never S/A)
 * - Decaying trend with slow break-even (> 2.5 days): -15 pts
 * - Negative average yield (unprofitable): -20 pts
 * - Extreme anomaly spike (> 3.5x trimmed and > 120% APY): -5 pts
 */

export function evaluateEntryScore(item, externalVolatility = null) {
  if (!item) {
    return {
      score: 0,
      tier: 'D',
      tierLabel: 'Нет данных',
      tierColor: 'rose',
      riskLevel: 'medium',
      breakdown: {
        yield: { score: 0, max: 30 },
        stability: { score: 0, max: 25 },
        payback: { score: 0, max: 25 },
        safety: { score: 0, max: 20 },
      },
      penalties: [],
      recommendation: 'Недостаточно данных для анализа.',
    };
  }

  const risk = evaluateRisk(item, externalVolatility);
  const trimmedApy = item.metrics?.trimmed?.trimmedMeanApy ?? 0;
  const currentSpread = item.currentSpreadApy ?? 0;
  const sharpe = item.metrics?.sharpe?.sharpeRatio ?? 0;
  const winRateHours = item.winRateHoursPercent ?? 50;
  const oiRank = item.oiRank ?? 999;
  const minSpread = item.minSpreadApy ?? 0;
  const maxSpike = item.maxSpikeApy ?? 0;

  const breakEven = getBreakEven(item, 'trimmed');
  const trend = getTrend(item);

  const volData = externalVolatility || item.priceVolatility || null;
  const priceVol = volData?.annualizedVol ?? null;
  const avgAtr = volData?.avgAtr ?? null;

  // ==========================================
  // 1. Yield Score (max 30 pts)
  // ==========================================
  let baseYieldPts = 0;
  if (trimmedApy > 0) {
    if (trimmedApy <= 15) {
      baseYieldPts = (trimmedApy / 15) * 8; // 0 - 8 pts
    } else if (trimmedApy <= 40) {
      baseYieldPts = 8 + ((trimmedApy - 15) / 25) * 10; // 8 - 18 pts
    } else if (trimmedApy <= 80) {
      baseYieldPts = 18 + ((trimmedApy - 40) / 40) * 7; // 18 - 25 pts
    } else {
      baseYieldPts = 25; // 25 pts max cap for spike protection
    }
  }

  // Active spread alignment (up to 5 pts)
  let activeSpreadBonus = 0;
  if (currentSpread > 0 && trimmedApy > 0) {
    const ratio = currentSpread / trimmedApy;
    if (ratio >= 0.8) {
      activeSpreadBonus = 5;
    } else if (ratio >= 0.4) {
      activeSpreadBonus = 3;
    } else {
      activeSpreadBonus = 1;
    }
  } else if (currentSpread > 0) {
    activeSpreadBonus = 3;
  }
  const yieldScore = Math.min(30, Math.round(baseYieldPts + activeSpreadBonus));

  // ==========================================
  // 2. Stability Score (max 25 pts)
  // ==========================================
  let sharpePts = 0;
  if (sharpe >= 2.0) {
    sharpePts = 15;
  } else if (sharpe >= 1.2) {
    sharpePts = 11 + ((sharpe - 1.2) / 0.8) * 4; // 11 - 15 pts
  } else if (sharpe >= 0.7) {
    sharpePts = 6 + ((sharpe - 0.7) / 0.5) * 5; // 6 - 11 pts
  } else if (sharpe > 0) {
    sharpePts = Math.min(6, (sharpe / 0.7) * 5 + 1); // 1 - 6 pts
  }

  let winRatePts = 0;
  if (winRateHours >= 85) {
    winRatePts = 10;
  } else if (winRateHours >= 70) {
    winRatePts = 7 + ((winRateHours - 70) / 15) * 3; // 7 - 10 pts
  } else if (winRateHours >= 50) {
    winRatePts = 3 + ((winRateHours - 50) / 20) * 4; // 3 - 7 pts
  } else {
    winRatePts = 0;
  }
  const stabilityScore = Math.min(25, Math.round(sharpePts + winRatePts));

  // ==========================================
  // 3. Payback & Trend Score (max 25 pts)
  // ==========================================
  let bePts = 0;
  const beDays = breakEven.days;
  if (beDays !== null && breakEven.status !== 'negative') {
    if (beDays <= 1.0) {
      bePts = 15; // окупается < 24 часов (отличный результат)
    } else if (beDays <= 2.5) {
      bePts = 10 + ((2.5 - beDays) / 1.5) * 5; // 10 - 15 pts
    } else if (beDays <= 5.0) {
      bePts = 4 + ((5.0 - beDays) / 2.5) * 6; // 4 - 10 pts
    } else {
      bePts = Math.max(0, 4 - (beDays - 5.0) * 0.8); // 0 - 4 pts
    }
  }

  // Pure empirical trend momentum (24h vs 7d)
  let trendPts = 7; // stable default
  if (trend.direction === 'expanding') {
    trendPts = 10; // спред растет за 24h
  } else if (trend.direction === 'decaying') {
    trendPts = 2; // спред схлопывается
  }
  const paybackScore = Math.min(25, Math.round(bePts + trendPts));

  // ==========================================
  // 4. Safety & Liquidity Score (max 20 pts)
  // ==========================================
  let oiPts = 1;
  if (oiRank <= 30) {
    oiPts = 10;
  } else if (oiRank <= 75) {
    oiPts = 8;
  } else if (oiRank <= 150) {
    oiPts = 6;
  } else if (oiRank <= 250) {
    oiPts = 3;
  }

  let minSpreadPts = 5;
  if (minSpread < -60) {
    minSpreadPts = 0;
  } else if (minSpread < -30) {
    minSpreadPts = 2;
  } else if (minSpread < -15) {
    minSpreadPts = 3.5;
  }

  let volPts = 3; // neutral default if no price vol data
  if (priceVol !== null) {
    if (priceVol <= 60 && (avgAtr === null || avgAtr <= 4.5)) {
      volPts = 5;
    } else if (priceVol <= 90 && (avgAtr === null || avgAtr <= 7.5)) {
      volPts = 3;
    } else {
      volPts = 0; // high volatility pump token
    }
  }
  const safetyScore = Math.min(20, Math.round(oiPts + minSpreadPts + volPts));

  // ==========================================
  // 5. Penalties & Hard Caps
  // ==========================================
  const penalties = [];
  let penaltyPoints = 0;

  // Penalty 1: Current spread is <= 0
  if (currentSpread <= 0) {
    penaltyPoints += 25;
    penalties.push(`Текущий спред отрицательный (${currentSpread}% APY): вход невыгоден`);
  }

  // Penalty 2: Decaying trend with long break-even payback horizon
  if (trend.direction === 'decaying' && (beDays === null || beDays > 2.5)) {
    penaltyPoints += 15;
    penalties.push(`Затухающий тренд: спред сжимается быстрее окупаемости комиссий`);
  }

  // Penalty 3: Negative break-even / unprofitable spread
  if (breakEven.status === 'negative') {
    penaltyPoints += 20;
    penalties.push(`Связка убыточна по средней ставке`);
  }

  // Penalty 4: Extreme anomalous spike (manipulation trap)
  if (maxSpike > trimmedApy * 3.5 && maxSpike > 120) {
    penaltyPoints += 5;
    penalties.push(`Аномальный спайк фандинга (+${maxSpike}%) искажает статистику`);
  }

  // Penalty 5: High asset/market risk (high volatility, weak OI, or deep inversions)
  if (risk.level === 'high') {
    penaltyPoints += 15;
    const topFactors = risk.riskFactors && risk.riskFactors.length > 0
      ? risk.riskFactors.slice(0, 2).join('; ')
      : 'высокая волатильность цены или слабая ликвидность';
    penalties.push(`Высокий риск инструмента: ${topFactors}`);
  }

  // Calculate Raw & Clamped Total
  let rawTotal = yieldScore + stabilityScore + paybackScore + safetyScore - penaltyPoints;

  // Hard Cap 1: If current spread is negative, score cannot exceed 35
  if (currentSpread <= 0 && rawTotal > 35) {
    rawTotal = 35;
  }

  // Hard Cap 2: High-risk coins can NEVER exceed score 60 (max Tier B, never S/A)
  if (risk.level === 'high' && rawTotal > 60) {
    rawTotal = 60;
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(rawTotal)));

  // ==========================================
  // 6. Tier, Colors & Recommendations
  // ==========================================
  let tier = 'D';
  let tierLabel = 'Не рекомендуется';
  let tierColor = 'rose';
  let recommendation = 'Высокий риск или отрицательный спред. Вход не рекомендуется.';

  if (finalScore >= 85) {
    tier = 'S';
    tierLabel = 'Идеальный вход';
    tierColor = 'emerald';
    if (risk.level === 'medium') {
      recommendation = `Отличный спред, но умеренный риск токена. Рекомендуемое плечо: ${risk.recommendedLeverage}.`;
    } else {
      recommendation = 'Отличная связка. Быстрая окупаемость, высокая ликвидность и стабильный спред. Плечо: 5x–7x.';
    }
  } else if (finalScore >= 70) {
    tier = 'A';
    tierLabel = 'Отличный вход';
    tierColor = 'cyan';
    if (risk.level === 'low') {
      recommendation = 'Сбалансированная связка. Надежный спред фандинга и низкий риск. Плечо: 4x–6x.';
    } else {
      recommendation = `Сбалансированная связка. Надежный спред фандинга, умеренный риск. Плечо: ${risk.recommendedLeverage}.`;
    }
  } else if (finalScore >= 55) {
    tier = 'B';
    if (risk.level === 'high') {
      tierLabel = 'Спекулятивный доход';
      tierColor = 'amber';
      const topFactors = risk.riskFactors && risk.riskFactors.length > 0
        ? risk.riskFactors.slice(0, 2).join('; ')
        : 'высокий риск инструмента';
      recommendation = `Высокая доходность, но высокий риск монеты (${topFactors}). Опасность ликвидации при сквизе. Плечо строго ${risk.recommendedLeverage}.`;
    } else {
      tierLabel = 'Умеренный вход';
      tierColor = 'amber';
      recommendation = `Рабочий вариант. Обратите внимание на ликвидность (OI) или срок окупаемости. Плечо: ${risk.recommendedLeverage}.`;
    }
  } else if (finalScore >= 40) {
    tier = 'C';
    tierLabel = 'Спекулятивный';
    tierColor = 'orange';
    if (risk.level === 'high') {
      recommendation = `Высокий риск монеты и нестабильный спред. Опасность сквиза. Плечо строго ${risk.recommendedLeverage}.`;
    } else {
      recommendation = 'Повышенный риск. Спред может быстро схлопнуться или долго окупать комиссии. Плечо: 1x–2x.';
    }
  } else {
    tier = 'D';
    tierLabel = 'Не рекомендуется';
    tierColor = 'rose';
    recommendation = currentSpread <= 0
      ? `Текущий спред отрицательный (${currentSpread}% APY): вход невыгоден.`
      : 'Высокий риск инструмента или нестабильный спред. Вход не рекомендуется.';
  }

  return {
    score: finalScore,
    tier,
    tierLabel,
    tierColor,
    riskLevel: risk.level,
    breakdown: {
      yield: {
        score: yieldScore,
        max: 30,
        trimmedApy,
        currentSpread,
      },
      stability: {
        score: stabilityScore,
        max: 25,
        sharpe,
        winRateHours,
      },
      payback: {
        score: paybackScore,
        max: 25,
        breakEvenDays: beDays,
        trend: trend.label,
        trendDirection: trend.direction,
      },
      safety: {
        score: safetyScore,
        max: 20,
        oiRank,
        minSpread,
        priceVol,
        avgAtr,
      },
    },
    penalties,
    recommendation,
  };
}
