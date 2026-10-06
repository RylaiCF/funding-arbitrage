/**
 * Evaluates comprehensive arbitrage risk based on:
 * 1. Funding Sharpe Ratio (yield stability vs spread variance)
 * 2. Spread Win-Rate (percent of hours and days in profit)
 * 3. Historical deep inversion (minSpreadApy)
 * 4. Funding spike anomaly (maxSpikeApy vs trimmedMeanApy)
 * 5. Open Interest Liquidity Rank (oiRank)
 * 6. Base token realized price volatility & ATR % (from Binance/Bybit)
 */

export function evaluateRisk(item, externalVolatility = null) {
  if (!item) {
    return {
      level: 'medium',
      label: 'Умеренный риск',
      badgeText: 'Умеренный',
      color: 'amber',
      reasons: [],
      recommendedLeverage: '3x–5x',
      priceVol: null,
      avgAtr: null,
    };
  }

  const sharpe = item.metrics?.sharpe?.sharpeRatio ?? 1.0;
  const winRateHours = item.winRateHoursPercent ?? 50;
  const dailyWinRate = item.dailyWinRatePercent ?? 50;
  const minSpread = item.minSpreadApy ?? 0;
  const maxSpike = item.maxSpikeApy ?? 0;
  const trimmed = item.metrics?.trimmed?.trimmedMeanApy ?? 0;
  const oiRank = item.oiRank ?? 100;

  const volData = externalVolatility || item.priceVolatility || null;
  const priceVol = volData?.annualizedVol ?? null;
  const avgAtr = volData?.avgAtr ?? null;

  let riskPoints = 0;
  const reasons = [];

  // 1. Funding Sharpe Ratio
  if (sharpe >= 1.4) {
    reasons.push(`Высокий Шарп ${sharpe} (предсказуемый спред)`);
  } else if (sharpe >= 0.75) {
    riskPoints += 1;
    reasons.push(`Шарп фандинга ${sharpe} (умеренные колебания)`);
  } else {
    riskPoints += 2;
    reasons.push(`Низкий Шарп ${sharpe} (нестабильный спред)`);
  }

  // 2. Win Rate
  if (winRateHours < 35 || dailyWinRate < 40) {
    riskPoints += 2;
    reasons.push(`Низкий вин-рейт (${winRateHours}% часов в плюс)`);
  } else if (winRateHours < 50) {
    riskPoints += 1;
    reasons.push(`Вин-рейт ниже среднего (${winRateHours}%)`);
  }

  // 3. Deep Inversion / Negative Spread
  if (minSpread < -60) {
    riskPoints += 2;
    reasons.push(`Периоды сильной инверсии (мин. спред ${minSpread}%)`);
  } else if (minSpread < -25) {
    riskPoints += 1;
    reasons.push(`Отрицательный спред на истории (${minSpread}%)`);
  }

  // 4. Spike Anomaly
  if (maxSpike > trimmed * 3 && maxSpike > 100) {
    riskPoints += 1;
    reasons.push(`Аномальный спайк фандинга (+${maxSpike}%)`);
  }

  // 5. Token Liquidity
  if (oiRank > 150) {
    riskPoints += 1;
    reasons.push(`Низкая ликвидность (OI Rank #${oiRank})`);
  }

  // 6. Token Price Volatility (if available)
  if (priceVol !== null) {
    if (priceVol > 95) {
      riskPoints += 2;
      reasons.push(`Высокая волатильность цены: ${priceVol}% год. (ATR ±${avgAtr}%/день)`);
    } else if (priceVol > 65) {
      riskPoints += 1;
      reasons.push(`Умеренная волатильность цены: ${priceVol}% год. (ATR ±${avgAtr}%/день)`);
    } else {
      reasons.push(`Спокойная цена токена: ${priceVol}% год. (ATR ±${avgAtr}%/день)`);
    }
  }

  if (riskPoints <= 1) {
    return {
      level: 'low',
      label: 'Низкий риск',
      badgeText: 'Низкий',
      color: 'emerald',
      score: riskPoints,
      reasons,
      recommendedLeverage: 'до 5x–10x',
      priceVol,
      avgAtr,
    };
  }

  if (riskPoints <= 3) {
    return {
      level: 'medium',
      label: 'Умеренный риск',
      badgeText: 'Умеренный',
      color: 'amber',
      score: riskPoints,
      reasons,
      recommendedLeverage: '3x–5x',
      priceVol,
      avgAtr,
    };
  }

  return {
    level: 'high',
    label: 'Высокий риск',
    badgeText: 'Высокий',
    color: 'rose',
    score: riskPoints,
    reasons,
    recommendedLeverage: '1x–2x',
    priceVol,
    avgAtr,
  };
}
