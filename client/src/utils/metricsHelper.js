/**
 * Helpers for calculating and formatting:
 * 1. Break-even time (trading fee payback horizon)
 * 2. Funding spread trend & momentum (24h vs 7d vs 30d)
 */

export function getBreakEven(item, activeMetric = 'trimmed') {
  if (item?.breakEven?.text && item.breakEven.text !== '—') {
    return item.breakEven;
  }

  // Active APY for yield estimation
  let apy = item?.metrics?.trimmed?.trimmedMeanApy;
  if (activeMetric === 'median') {
    apy = item?.metrics?.median?.medianApy;
  } else if (activeMetric === 'current') {
    apy = item?.currentSpreadApy;
  }

  apy = apy ?? item?.currentSpreadApy ?? 0;

  if (apy <= 0) {
    return {
      days: null,
      hours: null,
      text: 'Убыток',
      status: 'negative',
      feePercent: 0.18,
    };
  }

  // Round-trip fee: 4 legs * ~0.045% taker = ~0.18%
  const roundTripFeePercent = 0.18;
  const dailyYieldPercent = apy / 365;
  const days = Number((roundTripFeePercent / dailyYieldPercent).toFixed(1));
  const hours = Math.round(days * 24);

  let text = '';
  let status = 'normal';

  if (hours < 24) {
    text = `${hours} ч.`;
    status = 'fast';
  } else if (days <= 2.5) {
    text = `${days} дн.`;
    status = 'fast';
  } else if (days <= 5) {
    text = `${days} дн.`;
    status = 'normal';
  } else {
    text = `${days} дн.`;
    status = 'slow';
  }

  return {
    days,
    hours,
    text,
    status,
    feePercent: 0.18,
  };
}

export function getTrend(item) {
  if (item?.trend?.label) {
    return item.trend;
  }

  // Fallback from timeline if available
  if (item?.timeline && Array.isArray(item.timeline) && item.timeline.length >= 6) {
    const pts = item.timeline;
    // Downsampled timeline: slice last ~10-15% of points for 24h approximation
    const pts24Count = Math.max(2, Math.floor(pts.length * 0.12));
    const pts24 = pts.slice(-pts24Count);
    const s24 = pts24.reduce((acc, p) => acc + p.spreadApy, 0) / pts24.length;

    const pts7dCount = Math.max(pts24Count, Math.floor(pts.length * 0.45));
    const pts7d = pts.slice(-pts7dCount);
    const s7 = pts7d.reduce((acc, p) => acc + p.spreadApy, 0) / pts7d.length;

    const sAll = pts.reduce((acc, p) => acc + p.spreadApy, 0) / pts.length;

    let dir = 'stable';
    let label = 'Стабильный';
    const baseline = s7 !== 0 ? s7 : sAll;

    if (s24 > baseline * 1.25 && s24 > 15) {
      dir = 'expanding';
      label = 'Растущий';
    } else if (s24 < 0 || (baseline > 15 && s24 < baseline * 0.5)) {
      dir = 'decaying';
      label = 'Угасающий';
    }

    return {
      spread24hApy: Number(s24.toFixed(1)),
      spread7dApy: Number(s7.toFixed(1)),
      spread30dApy: Number(sAll.toFixed(1)),
      direction: dir,
      label,
    };
  }

  return {
    spread24hApy: item?.currentSpreadApy ?? 0,
    spread7dApy: item?.metrics?.trimmed?.trimmedMeanApy ?? 0,
    spread30dApy: item?.rawMeanApy ?? 0,
    direction: 'stable',
    label: 'Стабильный',
  };
}
