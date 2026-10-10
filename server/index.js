const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const db = require('./db');
const lorisClient = require('./lorisClient');
const analyzer = require('./analyzer');
const volatility = require('./volatility');
const exchangeMonitor = require('./exchangeMonitor');
const forexConfig = require('./forexConfig');
const forexDirectClient = require('./forexDirectClient');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// In-memory scan state for live tracking
let scanState = {
  isScanning: false,
  progress: 0,
  stepText: 'Готов к сканированию',
  results: null,
  error: null,
};

// Independent in-memory scan state for Forex tracking
let forexScanState = {
  isScanning: false,
  progress: 0,
  stepText: 'Готов к сканированию Forex',
  results: null,
  error: null,
};

// 1. Settings Endpoints
app.get('/api/settings', (req, res) => {
  try {
    const settings = db.getAllSettings();
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/settings', (req, res) => {
  try {
    const updated = db.updateSettings(req.body);
    res.json({ success: true, settings: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Exchanges Endpoints
app.get('/api/exchanges', (req, res) => {
  try {
    const exchanges = db.getAllExchanges();
    res.json({ success: true, exchanges });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/exchanges/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { is_enabled } = req.body;
    db.setExchangeStatus(id, Boolean(is_enabled));
    const exchanges = db.getAllExchanges();
    res.json({ success: true, exchanges });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/exchanges/batch', (req, res) => {
  try {
    const { items } = req.body; // array of { id, is_enabled }
    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, error: 'items must be an array' });
    }
    const exchanges = db.batchSetExchanges(items);
    res.json({ success: true, exchanges });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2.5 New Loris.tools Exchange Detection Endpoints
app.get('/api/exchanges/new', (req, res) => {
  try {
    const status = exchangeMonitor.getMonitoringStatus();
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/exchanges/check-new', async (req, res) => {
  try {
    const forceRefresh = Boolean(req.body?.forceRefresh);
    const status = await exchangeMonitor.checkLorisExchanges(forceRefresh);
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/exchanges/new/dismiss', (req, res) => {
  try {
    const id = req.body?.id || 'all';
    const status = exchangeMonitor.dismissNewExchanges(id);
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/exchanges/new/undismiss', (req, res) => {
  try {
    const id = req.body?.id || 'all';
    const status = exchangeMonitor.undismissNewExchanges(id);
    res.json({ success: true, ...status });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/exchanges/integrate', async (req, res) => {
  try {
    const id = req.body?.id || 'all';
    const result = await exchangeMonitor.integrateExchange(id);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Scan Status & Cached Results (Crypto)
app.get('/api/scan/cached', (req, res) => {
  try {
    const cache = db.getScanCache();
    res.json({ success: true, cache });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/scan/status', (req, res) => {
  res.json({
    success: true,
    ...scanState,
  });
});

// 3.5 Forex Scan Status & Cached Results (Completely Independent)
app.get('/api/forex/currencies', (req, res) => {
  try {
    res.json({ success: true, currencies: forexConfig.FOREX_GROUPS });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/forex/scan/cached', (req, res) => {
  try {
    const cache = db.getForexScanCache();
    res.json({ success: true, cache });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/forex/scan/status', (req, res) => {
  res.json({
    success: true,
    ...forexScanState,
  });
});

// Cache management & auto-cleanup endpoints
app.post('/api/cache/cleanup', (req, res) => {
  try {
    const hours = Number(req.body?.maxAgeHours || 24);
    const removed = db.cleanupExpiredHistoricalCache(hours);
    res.json({ success: true, removedCount: removed });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/cache/clear', (req, res) => {
  try {
    db.clearScanCache();
    db.clearForexScanCache();
    db.cleanupExpiredHistoricalCache(0);
    scanState.results = null;
    scanState.progress = 0;
    scanState.stepText = 'Готов к сканированию';
    forexScanState.results = null;
    forexScanState.progress = 0;
    forexScanState.stepText = 'Готов к сканированию Forex';
    res.json({ success: true, message: 'Кэш полностью очищен' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Price volatility endpoints
app.get('/api/volatility/:symbol', async (req, res) => {
  try {
    const data = await volatility.fetchTokenVolatility(req.params.symbol);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/volatility/batch', async (req, res) => {
  try {
    const symbols = Array.isArray(req.body?.symbols) ? req.body.symbols : [];
    const results = {};
    await Promise.all(
      symbols.map(async (s) => {
        try {
          const v = await volatility.fetchTokenVolatility(s);
          if (v) results[s] = v;
        } catch (e) {}
      })
    );
    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper: Run the multi-step scanning pipeline
async function executeScan(customParams = {}) {
  // 0. Auto-cleanup historical cache older than 24 hours
  db.cleanupExpiredHistoricalCache(24);

  const currentSettings = db.getAllSettings();
  const maxOiRank = Number(customParams.max_oi_rank || currentSettings.max_oi_rank || 100);
  const timeframe = customParams.timeframe || currentSettings.timeframe || '30d';
  const candidateCount = Number(customParams.candidate_count || currentSettings.candidate_count || 25);
  const filterHighVol = customParams.filter_high_volatility !== undefined
    ? String(customParams.filter_high_volatility) === 'true'
    : (currentSettings.filter_high_volatility !== 'false');
  const maxSpreadCap = Number(customParams.max_spread_cap || currentSettings.max_spread_cap || 300);

  const enabledExchanges = db.getEnabledExchangeIds();
  if (enabledExchanges.size < 2) {
    throw new Error('Для поиска арбитража необходимо включить как минимум 2 биржи в настройках.');
  }

  scanState.isScanning = true;
  scanState.progress = 5;
  scanState.stepText = 'Получение актуального снимка рынка с loris.tools...';
  scanState.error = null;

  // Step 1: Live snapshot
  const liveData = await lorisClient.getLiveFunding();

  // Auto-sync newly detected exchanges from Loris.tools live snapshot
  try {
    exchangeMonitor.syncFromLiveData(liveData);
  } catch (syncErr) {
    console.warn('[Scanner] Exchange sync warning:', syncErr.message);
  }

  // Step 1.5: Fast 24h market snapshot to filter out extreme volatility & pumps/dumps (1 request ~300ms)
  let marketTickers = null;
  if (filterHighVol) {
    scanState.progress = 18;
    scanState.stepText = 'Экспресс-скрининг волатильности цен (Binance/Bybit 24h tickers)...';
    try {
      marketTickers = await volatility.fetchFastMarketTickers();
    } catch (e) {
      console.warn('[Scanner] Fast market tickers error:', e.message);
    }
  }

  scanState.progress = 28;
  const filterSummary = [
    `OI <= ${maxOiRank}`,
    filterHighVol ? 'без памп/дамп' : null,
    maxSpreadCap > 0 ? `спред < ${maxSpreadCap}%` : null,
  ].filter(Boolean).join(', ');
  scanState.stepText = `Отбор кандидатов (${filterSummary})...`;

  // Step 2: Screen candidates with fast pre-filtering
  const candidates = analyzer.screenCandidates(liveData, enabledExchanges, maxOiRank, candidateCount, {
    marketTickers,
    filterHighVolatility: filterHighVol,
    maxSpreadCap,
    max24hChange: 18,
    max24hRange: 25,
  });

  const stats = candidates.stats || {};
  if (stats.skippedHighVol > 0 || stats.skippedSpike > 0) {
    console.log(`[Scanner] Скрининг отсеял ${stats.skippedHighVol || 0} волатильных монет и ${stats.skippedSpike || 0} спайков.`);
  }

  if (candidates.length === 0) {
    scanState.progress = 100;
    scanState.isScanning = false;
    scanState.stepText = 'Подходящих связок по текущим фильтрам не найдено.';
    scanState.results = [];
    return [];
  }

  const volFilteredText = stats.skippedHighVol ? ` (отсеяно ${stats.skippedHighVol} волатильных)` : '';
  scanState.progress = 35;
  scanState.stepText = `Отобрано ${candidates.length} лучших монет${volFilteredText}. Загрузка истории (30 дней) для расчета ${timeframe}...`;

  // Step 3: Fetch historical time series for each screened candidate
  const opportunities = [];
  const total = candidates.length;

  for (let i = 0; i < total; i++) {
    const cand = candidates[i];
    const pct = 35 + Math.floor(((i + 1) / total) * 55);
    scanState.progress = pct;
    scanState.stepText = `[${i + 1}/${total}] Загрузка и кросс-анализ всех бирж для ${cand.symbol}...`;

    try {
      const [histData, priceVol] = await Promise.all([
        lorisClient.getHistoricalFunding(cand.symbol, '30d'),
        volatility.fetchTokenVolatility(cand.symbol).catch(() => null),
      ]);
      const coinResult = analyzer.analyzeCoinExchanges(
        histData,
        enabledExchanges,
        cand.symbol,
        cand.oiRank,
        4, // top 4 best historical pairs per coin
        timeframe // adapt calculations to active timeframe (15d or 30d)
      );

      if (coinResult) {
        if (priceVol) {
          coinResult.priceVolatility = priceVol;
          if (Array.isArray(coinResult.allPairs)) {
            coinResult.allPairs.forEach((p) => (p.priceVolatility = priceVol));
          }
        }
        opportunities.push(coinResult);
      }
    } catch (e) {
      console.warn(`Error analyzing ${cand.symbol}:`, e.message);
    }

    // Delay between requests with random jitter (1.2s - 1.6s) to avoid WAF / rate limits
    const delayMs = 1200 + Math.floor(Math.random() * 400);
    await new Promise(r => setTimeout(r, delayMs));
  }

  // Step 4: Finalize and sort by Trimmed Mean score by default
  opportunities.sort((a, b) => (b.metrics?.trimmed?.score ?? 0) - (a.metrics?.trimmed?.score ?? 0));

  scanState.progress = 100;
  scanState.isScanning = false;
  scanState.stepText = `Сканирование завершено! Найдено ${opportunities.length} подтвержденных связок.`;
  scanState.results = opportunities;

  // Save to SQLite cache
  db.saveScanCache({
    maxOiRank,
    timeframe,
    candidateCount,
    filter_high_volatility: filterHighVol,
    max_spread_cap: maxSpreadCap,
  }, opportunities);

  return opportunities;
}

// 4. Start Scan Trigger
app.post('/api/scan/start', async (req, res) => {
  if (scanState.isScanning) {
    return res.json({
      success: true,
      message: 'Сканирование уже выполняется',
      ...scanState,
    });
  }

  // Run in background and respond immediately
  executeScan(req.body).catch((err) => {
    scanState.isScanning = false;
    scanState.progress = 0;
    scanState.error = err.message;
    scanState.stepText = `Ошибка сканирования: ${err.message}`;
  });

  res.json({
    success: true,
    message: 'Сканирование успешно запущено',
    ...scanState,
  });
});

// Helper: Run the Forex scanning pipeline (Completely Independent from Crypto scanner)
async function executeForexScan(customParams = {}) {
  const currentSettings = db.getAllSettings();
  const timeframe = customParams.timeframe || currentSettings.timeframe || '30d';

  const enabledExchanges = db.getEnabledExchangeIds();
  if (enabledExchanges.size < 2) {
    throw new Error('Для поиска арбитража необходимо включить как минимум 2 биржи в настройках.');
  }

  forexScanState.isScanning = true;
  forexScanState.progress = 5;
  forexScanState.stepText = 'Получение актуального снимка рынка для Forex с loris.tools...';
  forexScanState.error = null;

  // 1. Live snapshot to auto-detect any newly added forex coins
  let liveData = null;
  try {
    liveData = await lorisClient.getLiveFunding();
  } catch (err) {
    console.warn('[ForexScanner] Could not fetch fresh live funding, proceeding with target symbols:', err.message);
  }

  // 2. Canonical currency groups (unconditionally scans all known forex currencies, no OI or APY cutoff!)
  const groups = forexConfig.getForexGroups(liveData);

  forexScanState.progress = 10;
  forexScanState.stepText = `Начало анализа ${groups.length} валют Forex по включенным биржам...`;

  const opportunities = [];
  const total = groups.length;

  for (let i = 0; i < total; i++) {
    const group = groups[i];
    const pct = 10 + Math.floor(((i + 1) / total) * 85);
    forexScanState.progress = pct;
    forexScanState.stepText = `[${i + 1}/${total}] Загрузка и кросс-анализ ${group.symbol} (${group.name})...`;

    // 1. Fetch & merge all historical series across all aliases of this currency group
    const mergedSeries = {};
    const exchangeContractMap = {};

    for (const sym of group.aliases) {
      try {
        const histData = await lorisClient.getHistoricalFunding(sym, '30d');
        await forexDirectClient.supplementForexHistory(sym, histData, enabledExchanges);

        if (histData && histData.series) {
          for (const [ex, pts] of Object.entries(histData.series)) {
            if (!Array.isArray(pts) || pts.length === 0) continue;
            if (!exchangeContractMap[ex] || sym.length > exchangeContractMap[ex].length) {
              exchangeContractMap[ex] = sym;
            }
            if (!mergedSeries[ex]) {
              mergedSeries[ex] = [...pts];
            } else {
              const seen = new Set(mergedSeries[ex].map((p) => p.t));
              for (const p of pts) {
                if (!seen.has(p.t)) {
                  mergedSeries[ex].push(p);
                  seen.add(p.t);
                }
              }
              mergedSeries[ex].sort((a, b) => a.t.localeCompare(b.t));
            }
          }
        }
      } catch (e) {
        console.warn(`[ForexScanner] Error fetching ${sym} in group ${group.symbol}:`, e.message);
      }
      await new Promise((r) => setTimeout(r, 300));
    }

    const coinResult = analyzer.analyzeCoinExchanges(
      { symbol: group.symbol, series: mergedSeries },
      enabledExchanges,
      group.symbol,
      0, // Forex currencies bypass crypto OI ranking
      35, // top 35 pairs per currency
      timeframe,
      {
        isForex: true,
        forexMeta: group,
        allowZeroScore: true,
        minHistoryPoints: 48, // Require at least 48 hours (2 days) of sample data
      }
    );

    if (coinResult && Array.isArray(coinResult.allPairs) && coinResult.allPairs.length > 0) {
      const groupPairs = coinResult.allPairs.map((p) => {
        const longSource = forexDirectClient.getDirectExchangeMetadata(p.longExchange, group.symbol);
        const shortSource = forexDirectClient.getDirectExchangeMetadata(p.shortExchange, group.symbol);

        // Detect weekend market closure (Friday evening close on traditional forex)
        const endDate = new Date(p.endDate);
        const dayOfWeek = endDate.getUTCDay(); // 5 = Friday
        const hour = endDate.getUTCHours();
        const isFridayEvening = (dayOfWeek === 5 && hour >= 20);
        const now = new Date();
        const nowDay = now.getUTCDay();
        const isCurrentlyWeekend = (nowDay === 6 || (nowDay === 0 && now.getUTCHours() < 22));
        const isWeekendClose = isFridayEvening && isCurrentlyWeekend;

        return {
          ...p,
          symbol: group.symbol,
          contractSymbol: exchangeContractMap[p.shortExchange] || exchangeContractMap[p.longExchange] || group.symbol,
          isForex: true,
          forexMeta: group,
          sources: {
            long: longSource,
            short: shortSource,
            hasDirect: Boolean(longSource.isDirect || shortSource.isDirect),
          },
          isWeekendClose,
        };
      });

      const primary = groupPairs[0];
      opportunities.push({
        ...primary,
        symbol: group.symbol,
        contractSymbol: primary.contractSymbol,
        name: group.name,
        aliases: group.aliases,
        isForex: true,
        forexMeta: group,
        allPairs: groupPairs,
        alternatives: groupPairs.slice(1),
      });
    }
  }

  // Sort opportunities by active score descending
  opportunities.sort((a, b) => {
    const scoreB = (timeframe === '15d' && b.stats15d ? b.stats15d : b.stats30d).metrics?.trimmed?.score ?? 0;
    const scoreA = (timeframe === '15d' && a.stats15d ? a.stats15d : a.stats30d).metrics?.trimmed?.score ?? 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return (b.currentSpreadApy ?? 0) - (a.currentSpreadApy ?? 0);
  });

  forexScanState.progress = 100;
  forexScanState.isScanning = false;
  forexScanState.stepText = `Сканирование Forex завершено! Найдено ${opportunities.length} активных валют.`;
  forexScanState.results = opportunities;

  // Save to SQLite Forex cache
  db.saveForexScanCache({ timeframe }, opportunities);

  return opportunities;
}

// 5. Forex Scan Trigger
app.post('/api/forex/scan/start', async (req, res) => {
  if (forexScanState.isScanning) {
    return res.json({
      success: true,
      message: 'Сканирование Forex уже выполняется',
      ...forexScanState,
    });
  }

  // Run in background and respond immediately
  executeForexScan(req.body).catch((err) => {
    forexScanState.isScanning = false;
    forexScanState.progress = 0;
    forexScanState.error = err.message;
    forexScanState.stepText = `Ошибка сканирования Forex: ${err.message}`;
  });

  res.json({
    success: true,
    message: 'Сканирование Forex успешно запущено',
    ...forexScanState,
  });
});

// Serve static frontend in production
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(clientDistPath, 'index.html'));
    }
    next();
  });
}

// Global error protection
process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection]', reason);
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);

  // Run auto-cleanup on startup
  db.cleanupExpiredHistoricalCache(24);

  // Periodic auto-cleanup every 6 hours
  setInterval(() => {
    db.cleanupExpiredHistoricalCache(24);
  }, 6 * 60 * 60 * 1000);

  // Однократная проверка наличия новых бирж на Loris при старте сервера
  setTimeout(() => {
    exchangeMonitor.checkLorisExchanges(false).catch((e) => {
      console.warn('[Startup] Ошибка проверки бирж при старте:', e.message);
    });
  }, 3000);
});
