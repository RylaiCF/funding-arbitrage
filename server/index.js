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
const squeezeScanner = require('./squeezeScanner');
const spreadAnalyzer = require('./spreadAnalyzer');
const spreadHistory = require('./spreadHistory');

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

// 3.6 Squeeze Radar Endpoints (Negative Funding & Short Squeeze Scanner)
app.get('/api/squeeze/cached', (req, res) => {
  try {
    const cache = db.getSqueezeScanCache();
    res.json({ success: true, cache });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/squeeze/status', (req, res) => {
  res.json({
    success: true,
    ...squeezeScanner.getScanStatus(),
  });
});

app.post('/api/squeeze/scan', async (req, res) => {
  try {
    const results = await squeezeScanner.executeScan(req.body);
    res.json({ success: true, results, status: squeezeScanner.getScanStatus() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3.8 Price / Spread Arbitrage Endpoints (Apparatura & Cross-Exchange Basis Screener)
app.get('/api/spread/opportunities', async (req, res) => {
  try {
    const {
      mode,
      minNetSpread,
      minVolume,
      maxRisk,
      depositSize,
      search,
      forceRefresh,
      onePairPerSymbol
    } = req.query;

    const data = await spreadAnalyzer.getAnalyzedOpportunities({
      mode: mode || 'all',
      minNetSpread: minNetSpread ? Number(minNetSpread) : 0.15,
      minVolume: minVolume ? Number(minVolume) : 30000,
      maxRisk: maxRisk || 'all',
      depositSize: depositSize ? Number(depositSize) : 1000,
      search: search || '',
      forceRefresh: forceRefresh === 'true' || forceRefresh === '1',
      onePairPerSymbol: onePairPerSymbol !== 'false'
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, opportunities: [] });
  }
});

app.post('/api/spread/scan', async (req, res) => {
  try {
    const { mode, minNetSpread, minVolume, maxRisk, depositSize, search, onePairPerSymbol } = req.body || {};
    const data = await spreadAnalyzer.getAnalyzedOpportunities({
      mode: mode || 'all',
      minNetSpread: minNetSpread !== undefined ? Number(minNetSpread) : 0.15,
      minVolume: minVolume !== undefined ? Number(minVolume) : 30000,
      maxRisk: maxRisk || 'all',
      depositSize: depositSize !== undefined ? Number(depositSize) : 1000,
      search: search || '',
      forceRefresh: true,
      onePairPerSymbol: onePairPerSymbol !== false
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3.9 Historical Spread Convergence Chart Endpoint
app.get('/api/spread/history', async (req, res) => {
  try {
    const {
      symbol,
      longExchange,
      longMarketType,
      longSymbol,
      longNativeSymbol,
      longExchangeSymbol,
      longInstrumentId,
      longAskPrice,
      shortExchange,
      shortMarketType,
      shortSymbol,
      shortNativeSymbol,
      shortExchangeSymbol,
      shortInstrumentId,
      shortBidPrice,
      currentSpread,
      limit,
      interval,
      step
    } = req.query;

    if (!longExchange || !shortExchange) {
      return res.status(400).json({ success: false, error: 'longExchange and shortExchange are required' });
    }

    if (['mexc', 'bitget', 'kucoin'].includes(String(longExchange).toLowerCase()) || ['mexc', 'bitget', 'kucoin'].includes(String(shortExchange).toLowerCase())) {
      return res.status(400).json({ success: false, error: 'Exchange is disabled' });
    }

    const hrsLimit = limit ? parseInt(limit) : 72;

    const history = await spreadHistory.getSpreadConvergenceHistory(
      {
        exchange: longExchange,
        marketType: longMarketType || 'spot',
        symbol: symbol || longSymbol || longNativeSymbol,
        nativeSymbol: longNativeSymbol,
        exchangeSymbol: longExchangeSymbol || longNativeSymbol,
        instrumentId: longInstrumentId,
        askPrice: Number(longAskPrice) || 0
      },
      {
        exchange: shortExchange,
        marketType: shortMarketType || 'perp',
        symbol: symbol || shortSymbol || shortNativeSymbol,
        nativeSymbol: shortNativeSymbol,
        exchangeSymbol: shortExchangeSymbol || shortNativeSymbol,
        instrumentId: shortInstrumentId,
        bidPrice: Number(shortBidPrice) || 0,
        currentSpread: Number(currentSpread) || 0
      },
      hrsLimit,
      {
        interval: interval || `${hrsLimit}H`,
        step: step || '3600'
      }
    );

    res.json({ success: true, history });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
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
    db.clearSqueezeScanCache();
    db.cleanupExpiredHistoricalCache(0);
    scanState.results = null;
    scanState.progress = 0;
    scanState.stepText = 'Готов к сканированию';
    forexScanState.results = null;
    forexScanState.progress = 0;
    forexScanState.stepText = 'Готов к сканированию Forex';
    squeezeScanner.scanState.results = null;
    squeezeScanner.scanState.progress = 0;
    squeezeScanner.scanState.stepText = 'Готов к сканированию радара сквизов';
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

// Helper: Analyze a single coin on-demand with full historical & cross-exchange metrics
async function analyzeSingleCoin(rawSymbol, customTimeframe = null) {
  const sym = String(rawSymbol || '').trim().toUpperCase();
  if (!sym) {
    throw new Error('Символ монеты не указан');
  }

  const currentSettings = db.getAllSettings();
  const timeframe = customTimeframe || currentSettings.timeframe || '30d';
  const enabledExchanges = db.getEnabledExchangeIds();
  if (enabledExchanges.size < 2) {
    throw new Error('Для поиска арбитража необходимо включить как минимум 2 биржи в настройках.');
  }

  // 1. Fetch live funding snapshot if not in cache (for OI ranking)
  let liveData = null;
  try {
    liveData = await lorisClient.getLiveFunding();
  } catch (e) {
    // Ignore minor live funding warning
  }

  const oiRank = (liveData?.oi_rankings && liveData.oi_rankings[sym] !== undefined)
    ? liveData.oi_rankings[sym]
    : 999;

  // 2. Fetch historical funding & token price volatility in parallel
  const [histData, priceVol] = await Promise.all([
    lorisClient.getHistoricalFunding(sym, '30d', true),
    volatility.fetchTokenVolatility(sym).catch(() => null),
  ]);

  if (!histData || !histData.series || Object.keys(histData.series).length === 0) {
    throw new Error(`По монете ${sym} не найдено исторических данных фандинга на loris.tools`);
  }

  // Check how many enabled exchanges have series
  const availableExchanges = Object.keys(histData.series).filter(
    (ex) => enabledExchanges.has(ex) && Array.isArray(histData.series[ex]) && histData.series[ex].length > 0
  );

  if (availableExchanges.length < 2) {
    throw new Error(
      `По монете ${sym} найдено менее 2 поддерживаемых бирж среди включенных (${availableExchanges.length ? availableExchanges.join(', ') : 'нет данных'}). Включите нужные биржи в настройках.`
    );
  }

  // 3. Analyze exchanges with flexible constraints for custom coin
  const coinResult = analyzer.analyzeCoinExchanges(
    histData,
    enabledExchanges,
    sym,
    oiRank,
    10, // top 10 pairs for deep insight
    timeframe,
    {
      isCustom: true,
      allowZeroScore: true,
      minHistoryPoints: 24, // at least 24 hours of data
    }
  );

  if (!coinResult) {
    throw new Error(`Не удалось сопоставить пересекающиеся временные ряды для ${sym} между включенными биржами.`);
  }

  if (priceVol) {
    coinResult.priceVolatility = priceVol;
    if (Array.isArray(coinResult.allPairs)) {
      coinResult.allPairs.forEach((p) => {
        p.priceVolatility = priceVol;
        p.isCustom = true;
      });
    }
  }

  coinResult.isCustom = true;

  // 4. Update scanState and SQLite scan_cache so it is immediately reflected and persisted
  if (Array.isArray(scanState.results)) {
    scanState.results = [
      coinResult,
      ...scanState.results.filter((c) => c.symbol !== sym),
    ];
  } else {
    scanState.results = [coinResult];
  }

  const currentCache = db.getScanCache();
  const existingResults = (currentCache && Array.isArray(currentCache.results))
    ? currentCache.results.filter((c) => c.symbol !== sym)
    : [];
  const updatedCacheResults = [coinResult, ...existingResults];
  db.saveScanCache(
    currentCache?.params || { custom: true, timeframe },
    updatedCacheResults
  );

  return coinResult;
}

// 2.7 Custom / User-Tracked Coins Endpoints
app.get('/api/symbols', async (req, res) => {
  try {
    let symbols = [];
    if (lorisClient.liveCache?.symbols) {
      symbols = lorisClient.liveCache.symbols;
    } else {
      const live = await lorisClient.getLiveFunding();
      symbols = live.symbols || [];
    }
    res.json({ success: true, symbols });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, symbols: [] });
  }
});

app.get('/api/custom-coins', (req, res) => {
  try {
    const customCoins = db.getCustomCoins();
    res.json({ success: true, customCoins });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/custom-coins', async (req, res) => {
  try {
    const rawSymbol = req.body?.symbol;
    const sym = String(rawSymbol || '').trim().toUpperCase();
    if (!sym) {
      return res.status(400).json({ success: false, error: 'Символ монеты не указан' });
    }

    db.addCustomCoin(sym);
    const opportunity = await analyzeSingleCoin(sym, req.body?.timeframe);
    res.json({
      success: true,
      opportunity,
      customCoins: db.getCustomCoins(),
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
      customCoins: db.getCustomCoins(),
    });
  }
});

app.delete('/api/custom-coins/:symbol', (req, res) => {
  try {
    const sym = String(req.params.symbol || '').trim().toUpperCase();
    db.removeCustomCoin(sym);

    if (Array.isArray(scanState.results)) {
      scanState.results = scanState.results.filter((c) => c.symbol !== sym);
    }

    const currentCache = db.getScanCache();
    if (currentCache && Array.isArray(currentCache.results)) {
      const updatedResults = currentCache.results.filter((c) => c.symbol !== sym);
      db.saveScanCache(currentCache.params, updatedResults);
    }

    res.json({ success: true, customCoins: db.getCustomCoins() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/custom-coins/:symbol/reanalyze', async (req, res) => {
  try {
    const sym = String(req.params.symbol || '').trim().toUpperCase();
    const opportunity = await analyzeSingleCoin(sym, req.body?.timeframe);
    res.json({ success: true, opportunity, customCoins: db.getCustomCoins() });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
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
  scanState.results = [];
  scanState.error = null;
  db.clearScanCache();

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

  // Step 2: Screen candidates with fast pre-filtering + guarantee custom user-added coins
  const customCoinsList = db.getCustomCoins().map((c) => c.symbol);
  const customCoinSet = new Set(customCoinsList);

  const candidates = analyzer.screenCandidates(liveData, enabledExchanges, maxOiRank, candidateCount, {
    marketTickers,
    filterHighVolatility: filterHighVol,
    maxSpreadCap,
    max24hChange: 18,
    max24hRange: 25,
    customCoins: customCoinsList,
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
  const customText = customCoinsList.length > 0 ? ` (включая ${customCoinsList.length} польз. монет)` : '';
  scanState.progress = 35;
  scanState.stepText = `Отобрано ${candidates.length} лучших монет${volFilteredText}${customText}. Загрузка истории (30 дней) для расчета ${timeframe}...`;

  // Step 3: Fetch historical time series for each screened candidate
  const opportunities = [];
  const total = candidates.length;

  for (let i = 0; i < total; i++) {
    const cand = candidates[i];
    const isCustom = Boolean(cand.isCustom || customCoinSet.has(cand.symbol));
    const pct = 35 + Math.floor(((i + 1) / total) * 55);
    scanState.progress = pct;
    scanState.stepText = `[${i + 1}/${total}] Загрузка и кросс-анализ всех бирж для ${cand.symbol}${isCustom ? ' (Моя монета)' : ''}...`;

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
        timeframe, // adapt calculations to active timeframe (15d or 30d)
        {
          isCustom,
          allowZeroScore: isCustom,
          minHistoryPoints: isCustom ? 24 : undefined,
        }
      );

      if (coinResult) {
        coinResult.isCustom = isCustom;
        if (priceVol) {
          coinResult.priceVolatility = priceVol;
          if (Array.isArray(coinResult.allPairs)) {
            coinResult.allPairs.forEach((p) => {
              p.priceVolatility = priceVol;
              p.isCustom = isCustom;
            });
          }
        }
        opportunities.push(coinResult);
        // Live update partial results sorted by score so UI receives coins progressively
        scanState.results = [...opportunities].sort((a, b) => (b.metrics?.trimmed?.score ?? 0) - (a.metrics?.trimmed?.score ?? 0));
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

  scanState.isScanning = true;
  scanState.progress = 5;
  scanState.stepText = 'Запуск сканирования...';
  scanState.results = [];
  scanState.error = null;
  db.clearScanCache();

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
  forexScanState.results = [];
  forexScanState.error = null;
  db.clearForexScanCache();

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

      // Live update partial results so UI receives forex currencies progressively
      forexScanState.results = [...opportunities].sort((a, b) => {
        const scoreB = (timeframe === '15d' && b.stats15d ? b.stats15d : b.stats30d).metrics?.trimmed?.score ?? 0;
        const scoreA = (timeframe === '15d' && a.stats15d ? a.stats15d : a.stats30d).metrics?.trimmed?.score ?? 0;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return (b.currentSpreadApy ?? 0) - (a.currentSpreadApy ?? 0);
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

  forexScanState.isScanning = true;
  forexScanState.progress = 5;
  forexScanState.stepText = 'Запуск сканирования Forex...';
  forexScanState.results = [];
  forexScanState.error = null;
  db.clearForexScanCache();

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
