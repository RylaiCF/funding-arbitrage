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
  const riskFactors = [];

  // 1. Funding Sharpe Ratio
  if (sharpe >= 1.4) {
    reasons.push(`Высокий Шарп ${sharpe} (предсказуемый спред)`);
  } else if (sharpe >= 0.75) {
    riskPoints += 1;
    const msg = `Шарп фандинга ${sharpe} (умеренные колебания)`;
    reasons.push(msg);
  } else {
    riskPoints += 2;
    const msg = `Низкий Шарп ${sharpe} (нестабильный спред)`;
    reasons.push(msg);
    riskFactors.push(msg);
  }

  // 2. Win Rate
  if (winRateHours < 35 || dailyWinRate < 40) {
    riskPoints += 2;
    const msg = `Низкий вин-рейт (${winRateHours}% часов в плюс)`;
    reasons.push(msg);
    riskFactors.push(msg);
  } else if (winRateHours < 50) {
    riskPoints += 1;
    const msg = `Вин-рейт ниже среднего (${winRateHours}%)`;
    reasons.push(msg);
    riskFactors.push(msg);
  }

  // 3. Deep Inversion / Negative Spread
  if (minSpread < -60) {
    riskPoints += 2;
    const msg = `Периоды сильной инверсии (мин. спред ${minSpread}%)`;
    reasons.push(msg);
    riskFactors.push(msg);
  } else if (minSpread < -25) {
    riskPoints += 1;
    const msg = `Отрицательный спред на истории (${minSpread}%)`;
    reasons.push(msg);
    riskFactors.push(msg);
  }

  // 4. Spike Anomaly
  if (maxSpike > trimmed * 3 && maxSpike > 100) {
    riskPoints += 1;
    const msg = `Аномальный спайк фандинга (+${maxSpike}%)`;
    reasons.push(msg);
    riskFactors.push(msg);
  }

  // 5. Token Liquidity
  if (oiRank > 150) {
    riskPoints += 1;
    const msg = `Низкая ликвидность (OI Rank #${oiRank})`;
    reasons.push(msg);
    riskFactors.push(msg);
  }

  // 6. Token Price Volatility (if available)
  if (priceVol !== null) {
    if (priceVol > 95) {
      riskPoints += 2;
      const msg = `Высокая волатильность цены: ${priceVol}% год. (ATR ±${avgAtr}%/день)`;
      reasons.push(msg);
      riskFactors.push(msg);
    } else if (priceVol > 65) {
      riskPoints += 1;
      const msg = `Умеренная волатильность цены: ${priceVol}% год. (ATR ±${avgAtr}%/день)`;
      reasons.push(msg);
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
      riskFactors,
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
      riskFactors,
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
    riskFactors,
    recommendedLeverage: '1x–2x',
    priceVol,
    avgAtr,
  };
}
