const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const db = require('./db');
const lorisClient = require('./lorisClient');
const analyzer = require('./analyzer');
const volatility = require('./volatility');

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

// 3. Scan Status & Cached Results
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
    db.cleanupExpiredHistoricalCache(0);
    scanState.results = null;
    scanState.progress = 0;
    scanState.stepText = 'Готов к сканированию';
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
  scanState.progress = 25;
  scanState.stepText = `Анализ ${liveData.symbols.length} монет и отбор кандидатов с OI Rank <= ${maxOiRank}...`;

  // Step 2: Screen candidates
  const candidates = analyzer.screenCandidates(liveData, enabledExchanges, maxOiRank, candidateCount);
  if (candidates.length === 0) {
    scanState.progress = 100;
    scanState.isScanning = false;
    scanState.stepText = 'Подходящих связок по текущим фильтрам не найдено.';
    scanState.results = [];
    return [];
  }

  scanState.progress = 35;
  scanState.stepText = `Отобрано ${candidates.length} лучших монет. Загрузка ${timeframe} истории...`;

  // Step 3: Fetch historical time series for each candidate
  const opportunities = [];
  const total = candidates.length;

  for (let i = 0; i < total; i++) {
    const cand = candidates[i];
    const pct = 35 + Math.floor(((i + 1) / total) * 55);
    scanState.progress = pct;
    scanState.stepText = `[${i + 1}/${total}] Загрузка и кросс-анализ всех бирж для ${cand.symbol}...`;

    try {
      const [histData, priceVol] = await Promise.all([
        lorisClient.getHistoricalFunding(cand.symbol, timeframe),
        volatility.fetchTokenVolatility(cand.symbol).catch(() => null),
      ]);
      const coinResult = analyzer.analyzeCoinExchanges(
        histData,
        enabledExchanges,
        cand.symbol,
        cand.oiRank,
        4 // top 4 best historical pairs per coin
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

    // Small delay between requests to be polite to the API
    await new Promise(r => setTimeout(r, 200));
  }

  // Step 4: Finalize and sort by Trimmed Mean score by default
  opportunities.sort((a, b) => b.metrics.trimmed.score - a.metrics.trimmed.score);

  scanState.progress = 100;
  scanState.isScanning = false;
  scanState.stepText = `Сканирование завершено! Найдено ${opportunities.length} подтвержденных связок.`;
  scanState.results = opportunities;

  // Save to SQLite cache
  db.saveScanCache({ maxOiRank, timeframe, candidateCount }, opportunities);

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

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);

  // Run auto-cleanup on startup
  db.cleanupExpiredHistoricalCache(24);

  // Periodic auto-cleanup every 6 hours
  setInterval(() => {
    db.cleanupExpiredHistoricalCache(24);
  }, 6 * 60 * 60 * 1000);
});
