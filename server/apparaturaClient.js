const https = require('https');
const fs = require('fs');
const path = require('path');

/**
 * Apparatura API Client
 * Fetches normalized cross-exchange market constructions and spreads.
 * Supports persistent disk caching for uninterrupted uptime.
 */
class ApparaturaClient {
  constructor() {
    this.baseUrl = 'https://apparatura.xyz';
    this.cacheDir = path.join(__dirname, 'cache');
    this.cacheFile = path.join(this.cacheDir, 'apparatura_cache.json');
    this.cache = {
      perp: { timestamp: 0, data: null },
      spot: { timestamp: 0, data: null }
    };
    this.CACHE_TTL_MS = 30 * 1000; // 30 seconds memory cache

    this.loadDiskCache();
  }

  loadDiskCache() {
    try {
      if (fs.existsSync(this.cacheFile)) {
        const raw = fs.readFileSync(this.cacheFile, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed.perp?.data?.rows?.length) this.cache.perp = parsed.perp;
        if (parsed.spot?.data?.rows?.length) this.cache.spot = parsed.spot;
        console.log('[ApparaturaClient] Loaded persistent disk cache:', {
          perpRows: this.cache.perp?.data?.rows?.length || 0,
          spotRows: this.cache.spot?.data?.rows?.length || 0
        });
      }
    } catch (e) {
      console.warn('[ApparaturaClient] Failed to load disk cache:', e.message);
    }
  }

  saveDiskCache() {
    try {
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }
      fs.writeFileSync(this.cacheFile, JSON.stringify(this.cache), 'utf8');
    } catch (e) {
      console.warn('[ApparaturaClient] Failed to save disk cache:', e.message);
    }
  }

  request(endpoint) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'apparatura.xyz',
        path: endpoint,
        method: 'GET',
        headers: {
          Host: 'apparatura.xyz',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*'
        },
        servername: 'apparatura.xyz',
        timeout: 10000,
        lookup: (hostname, opts, cb) => {
          // Bypass blocked Cloudflare 188.114.x.x range using healthy Cloudflare Anycast edge IP
          if (opts && opts.all) {
            cb(null, [{ address: '172.67.180.1', family: 4 }]);
          } else {
            cb(null, '172.67.180.1', 4);
          }
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsed = JSON.parse(body);
              resolve(parsed);
            } catch (e) {
              reject(new Error(`Failed to parse Apparatura JSON response: ${e.message}`));
            }
          } else {
            reject(new Error(`Apparatura HTTP error ${res.statusCode}: ${body.slice(0, 200)}`));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Apparatura request timeout (10s)'));
      });

      req.on('error', err => reject(err));
      req.end();
    });
  }

  async getConstructions(mode = 'perp', forceRefresh = false, limit = 1000) {
    const now = Date.now();
    const cached = this.cache[mode];

    if (!forceRefresh && cached && cached.data && (now - cached.timestamp < this.CACHE_TTL_MS)) {
      return cached.data;
    }

    try {
      const res = await this.request(`/api/arb/constructions?mode=${mode}&limit=${limit}`);
      if (res && res.rows && res.rows.length > 0) {
        this.cache[mode] = {
          timestamp: now,
          data: res
        };
        this.saveDiskCache();
        return res;
      }
      return cached?.data || { ok: false, rows: [], total: 0 };
    } catch (err) {
      console.error(`[ApparaturaClient] Error fetching mode=${mode}:`, err.message);
      if (cached && cached.data && cached.data.rows?.length > 0) {
        console.log(`[ApparaturaClient] Using cached data for mode=${mode} (${cached.data.rows.length} rows)`);
        return cached.data;
      }
      return { ok: false, rows: [], total: 0 };
    }
  }

  async getAllConstructions(forceRefresh = false) {
    const [perpRes, spotRes] = await Promise.allSettled([
      this.getConstructions('perp', forceRefresh, 1000),
      this.getConstructions('spot', forceRefresh, 1000)
    ]);

    const perpRows = perpRes.status === 'fulfilled' && perpRes.value?.rows
      ? perpRes.value.rows.map(r => ({ ...r, strategyMode: 'perp' }))
      : [];

    const spotRows = spotRes.status === 'fulfilled' && spotRes.value?.rows
      ? spotRes.value.rows.map(r => ({ ...r, strategyMode: 'spot' }))
      : [];

    return {
      perpCount: perpRows.length,
      spotCount: spotRows.length,
      rows: [...perpRows, ...spotRows],
      timestamp: new Date().toISOString()
    };
  }

  async getPairHistory(params = {}) {
    const {
      symbol,
      longExchange,
      longMarket = 'spot',
      longExchangeSymbol,
      longInstrumentId,
      shortExchange,
      shortMarket = 'perp',
      shortExchangeSymbol,
      shortInstrumentId,
      interval = '72H',
      step = '3600',
      hours = 72
    } = params;

    const hrs = parseInt(hours) || (interval === '24H' ? 24 : interval === '48H' ? 48 : 72);
    const now = new Date();
    const from = new Date(now.getTime() - hrs * 3600 * 1000);

    const cleanSym = (symbol || '').replace(/[-_/]/g, '').replace(/USDT$|USD$|USDC$/, '');

    const query = new URLSearchParams({
      symbol: cleanSym,
      longExchange: (longExchange || '').toLowerCase(),
      longMarket: (longMarket || 'spot').toLowerCase(),
      shortExchange: (shortExchange || '').toLowerCase(),
      shortMarket: (shortMarket || 'perp').toLowerCase(),
      from: from.toISOString(),
      to: now.toISOString(),
      interval: interval || `${hrs}H`,
      step: String(step || 3600),
      includeStale: 'false'
    });

    if (longInstrumentId) query.set('longInstrumentId', String(longInstrumentId));
    if (shortInstrumentId) query.set('shortInstrumentId', String(shortInstrumentId));
    if (longExchangeSymbol) query.set('longExchangeSymbol', longExchangeSymbol);
    if (shortExchangeSymbol) query.set('shortExchangeSymbol', shortExchangeSymbol);

    try {
      const res = await this.request(`/api/arb/market/pair-history?${query.toString()}`);
      if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
        return res.data;
      }
      return null;
    } catch (err) {
      console.warn(`[ApparaturaClient] Failed pair-history for ${cleanSym} (${longExchange}->${shortExchange}):`, err.message);
      return null;
    }
  }
}

module.exports = new ApparaturaClient();
