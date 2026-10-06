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

/**
 * 3. Spread Half-Life (Ornstein-Uhlenbeck Mean-Reversion Model)
 * Evaluates how quickly an anomalous spread decays by 50% vs break-even payback horizon.
 */
export function getHalfLife(item, activeMetric = 'trimmed') {
  if (item?.halfLife?.text && item.halfLife.text !== '—') {
    return item.halfLife;
  }

  const breakEven = getBreakEven(item, activeMetric);
  const breakEvenDays = breakEven?.days ?? null;

  if (!item?.timeline || !Array.isArray(item.timeline) || item.timeline.length < 8) {
    return {
      halfLifeHours: null,
      halfLifeDays: null,
      phi: null,
      text: '—',
      status: 'unknown',
      label: 'Нет данных',
      sustainability: 'unknown',
      ratio: null,
      warning: false,
    };
  }

  const s = item.timeline.map((p) => p.spreadApy);
  const n = s.length;

  const t0 = new Date(item.timeline[0].timestamp).getTime();
  const tEnd = new Date(item.timeline[n - 1].timestamp).getTime();
  const totalHours = (tEnd - t0) / (1000 * 3600);
  if (totalHours <= 0) {
    return {
      halfLifeHours: null,
      halfLifeDays: null,
      phi: null,
      text: '—',
      status: 'unknown',
      label: 'Нет данных',
      sustainability: 'unknown',
      ratio: null,
      warning: false,
    };
  }

  const dtHours = totalHours / (n - 1);
  const y = s.slice(1);
  const x = s.slice(0, n - 1);
  const m = y.length;

  const meanX = x.reduce((a, b) => a + b, 0) / m;
  const meanY = y.reduce((a, b) => a + b, 0) / m;

  let covXY = 0;
  let varX = 0;
  for (let i = 0; i < m; i++) {
    covXY += (x[i] - meanX) * (y[i] - meanY);
    varX += Math.pow(x[i] - meanX, 2);
  }

  if (varX < 1e-9) {
    return {
      halfLifeHours: Infinity,
      halfLifeDays: Infinity,
      phi: 1,
      text: '>14 дн.',
      status: 'persistent',
      label: 'Сверхживучий',
      sustainability: 'high',
      ratio: 99,
      warning: false,
    };
  }

  const phi = covXY / varX;

  if (phi >= 0.999) {
    return {
      halfLifeHours: Infinity,
      halfLifeDays: Infinity,
      phi: Number(phi.toFixed(3)),
      text: '>14 дн.',
      status: 'persistent',
      label: 'Сверхживучий',
      sustainability: 'high',
      ratio: 99,
      warning: false,
    };
  }

  if (phi <= 0) {
    const hlHours = Number((dtHours * 0.5).toFixed(1));
    return {
      halfLifeHours: hlHours,
      halfLifeDays: Number((hlHours / 24).toFixed(1)),
      phi: Number(phi.toFixed(3)),
      text: '<1 ч.',
      status: 'fast_decay',
      label: 'Мгновенное сжатие',
      sustainability: 'risk',
      ratio: 0.1,
      warning: true,
    };
  }

  const lambda = -Math.log(phi) / dtHours;
  if (lambda <= 0) {
    return {
      halfLifeHours: Infinity,
      halfLifeDays: Infinity,
      phi: Number(phi.toFixed(3)),
      text: '>14 дн.',
      status: 'persistent',
      label: 'Сверхживучий',
      sustainability: 'high',
      ratio: 99,
      warning: false,
    };
  }

  const halfLifeHours = Number((Math.log(2) / lambda).toFixed(1));
  const halfLifeDays = Number((halfLifeHours / 24).toFixed(1));

  let text = '';
  let status = 'moderate';
  let label = 'Умеренное';

  if (halfLifeHours < 24) {
    text = `${halfLifeHours} ч.`;
    status = 'fast_decay';
    label = 'Быстрое сжатие';
  } else if (halfLifeDays <= 4) {
    text = `${halfLifeDays} дн.`;
    status = 'moderate';
    label = 'Умеренное';
  } else {
    text = halfLifeDays > 14 ? '>14 дн.' : `${halfLifeDays} дн.`;
    status = 'persistent';
    label = 'Высокая живучесть';
  }

  let sustainability = 'moderate';
  let ratio = null;
  let warning = false;

  if (breakEvenDays !== null && breakEvenDays > 0) {
    ratio = Number((halfLifeDays / breakEvenDays).toFixed(1));
    if (ratio >= 2.5 || halfLifeDays >= 7) {
      sustainability = 'high';
    } else if (ratio >= 1.0) {
      sustainability = 'moderate';
    } else {
      sustainability = 'risk';
      warning = true;
    }
  } else if (halfLifeDays >= 4) {
    sustainability = 'high';
  } else if (halfLifeHours < 12) {
    sustainability = 'risk';
  }

  return {
    halfLifeHours,
    halfLifeDays,
    phi: Number(phi.toFixed(3)),
    text,
    status,
    label,
    sustainability,
    ratio,
    warning,
  };
}
