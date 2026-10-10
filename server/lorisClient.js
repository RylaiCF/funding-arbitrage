const axios = require('axios');
const db = require('./db');

class LorisClient {
  constructor() {
    this.sessionCookie = null;
    this.cookieExpiry = 0;
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    // Rate limiting pacing: ensure at least 1500ms between Loris requests to prevent WAF bans
    this.minIntervalMs = 1500;
    this.lastRequestTime = 0;
    this.queuePromise = Promise.resolve();

    // In-memory cache for live funding snapshot (60 seconds TTL)
    this.liveCache = null;
    this.liveCacheExpiry = 0;
  }

  // Throttle to prevent exceeding rate limits
  async throttle() {
    const now = Date.now();
    const timeSinceLast = now - this.lastRequestTime;
    if (timeSinceLast < this.minIntervalMs) {
      const waitTime = this.minIntervalMs - timeSinceLast;
      await new Promise(r => setTimeout(r, waitTime));
    }
    this.lastRequestTime = Date.now();
  }

  // Sequential queue execution for all external requests
  async schedule(fn) {
    this.queuePromise = this.queuePromise.then(async () => {
      await this.throttle();
      return fn();
    }).catch(async () => {
      await this.throttle();
      return fn();
    });
    return this.queuePromise;
  }

  extractCookie(setCookieHeaders) {
    if (!setCookieHeaders) return;
    const headers = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
    for (const h of headers) {
      const match = h.match(/loris_session=([^;]+)/);
      if (match) {
        this.sessionCookie = match[1];
        // 12 minutes session duration
        this.cookieExpiry = Date.now() + 12 * 60 * 1000;
        break;
      }
    }
  }

  async ensureSession() {
    if (this.sessionCookie && Date.now() < this.cookieExpiry) {
      return this.sessionCookie;
    }

    return this.schedule(async () => {
      try {
        console.log('[LorisClient] Obtaining fresh session cookie...');
        const resp = await axios.get('https://loris.tools/', {
          headers: {
            'User-Agent': this.userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          timeout: 10000,
          validateStatus: () => true,
        });

        this.extractCookie(resp.headers['set-cookie']);

        if (this.sessionCookie) {
          try {
            const refreshResp = await axios.post('https://loris.tools/api/session/refresh', {}, {
              headers: {
                'User-Agent': this.userAgent,
                'Cookie': `loris_session=${this.sessionCookie}`,
                'Origin': 'https://loris.tools',
                'Referer': 'https://loris.tools/',
              },
              timeout: 6000,
              validateStatus: () => true,
            });
            this.extractCookie(refreshResp.headers['set-cookie']);
          } catch (e) {
            // Ignore minor refresh warning
          }
        }

        if (!this.sessionCookie) {
          throw new Error('Failed to acquire loris_session cookie from loris.tools');
        }

        return this.sessionCookie;
      } catch (err) {
        console.error('[LorisClient] Session establishment error:', err.message);
        throw err;
      }
    });
  }

  // Request wrapper with exponential backoff on HTTP 429 / 503
  async requestWithBackoff(url, config = {}, retries = 3) {
    await this.ensureSession();

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await this.schedule(async () => {
          return await axios.get(url, {
            ...config,
            headers: {
              'User-Agent': this.userAgent,
              'Cookie': `loris_session=${this.sessionCookie}`,
              'Accept': 'application/json',
              'Origin': 'https://loris.tools',
              'Referer': 'https://loris.tools/',
              ...(config.headers || {}),
            },
            timeout: 15000,
          });
        });
      } catch (err) {
        const status = err.response ? err.response.status : null;

        // 401 Unauthorized -> Refresh session and retry
        if (status === 401 && attempt < retries) {
          console.warn(`[LorisClient] 401 Unauthorized on ${url}. Refreshing session...`);
          this.sessionCookie = null;
          await this.ensureSession();
          continue;
        }

        // 429 Too Many Requests or 503 Service Unavailable -> Exponential Backoff
        if ((status === 429 || status === 503) && attempt < retries) {
          const retryAfterSec = err.response.headers && err.response.headers['retry-after']
            ? parseInt(err.response.headers['retry-after'], 10)
            : Math.pow(2, attempt + 1);

          const backoffMs = (isNaN(retryAfterSec) ? 2 : retryAfterSec) * 1000 + Math.random() * 500;
          console.warn(`[LorisClient] Rate limited (${status}) on ${url}. Backing off for ${Math.round(backoffMs)}ms (attempt ${attempt + 1}/${retries})...`);
          await new Promise(r => setTimeout(r, backoffMs));
          continue;
        }

        // Fatal or last attempt
        if (attempt === retries) {
          throw err;
        }

        // Transient network error
        const retryDelay = 1000 * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, retryDelay));
      }
    }
  }

  // Get live funding snapshot (with 60-second in-memory cache)
  async getLiveFunding(forceRefresh = false) {
    if (!forceRefresh && this.liveCache && Date.now() < this.liveCacheExpiry) {
      console.log('[LorisClient] Serving live funding from 60s memory cache');
      return this.liveCache;
    }

    const resp = await this.requestWithBackoff('https://api.loris.tools/funding');

    if (!resp.data || !resp.data.symbols) {
      throw new Error('Invalid live funding response from Loris API');
    }

    this.liveCache = resp.data;
    this.liveCacheExpiry = Date.now() + 60 * 1000;
    return this.liveCache;
  }

  // Get historical funding with SQLite persistent caching (3 hours TTL) and rate limit protection.
  // ALWAYS requests full 30-day window (720 hourly points) from Loris API so the complete dataset
  // is cached in SQLite regardless of whether the user is viewing 15d or 30d calculations.
  async getHistoricalFunding(symbol, timeframe = '30d', forceRefresh = false) {
    const sym = symbol.toUpperCase();
    const CACHE_TTL_MS = 3 * 60 * 60 * 1000;

    // 1. Check SQLite cache first for full 30d dataset
    if (!forceRefresh) {
      const cached30 = db.getCachedHistorical(sym, '30d', CACHE_TTL_MS);
      if (cached30 && cached30.series && Object.keys(cached30.series).length > 0) {
        const firstEx = Object.keys(cached30.series)[0];
        const pointsCount = cached30.series[firstEx]?.length || 0;
        if (pointsCount > 200) {
          return cached30;
        }
      }

      // Fallback check: any cached entry for this symbol
      const cached = db.getCachedHistorical(sym, timeframe, CACHE_TTL_MS);
      if (cached && cached.series && Object.keys(cached.series).length > 0) {
        const firstEx = Object.keys(cached.series)[0];
        const pointsCount = cached.series[firstEx]?.length || 0;
        if (pointsCount > 200) {
          return cached;
        }
      }
    }

    // 2. Fetch full 30 days (720 hours) from Loris API with backoff and rate limit pacing
    const now = new Date();
    const end = now.toISOString();
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    try {
      const resp = await this.requestWithBackoff('https://api.loris.tools/funding/historical', {
        params: {
          symbol: sym,
          start,
          end,
        },
      });

      const data = resp.data || { symbol: sym, series: {} };

      // 3. Save full 30d to SQLite cache for future scans
      if (data && data.series && Object.keys(data.series).length > 0) {
        db.saveCachedHistorical(sym, '30d', data);
      }

      return data;
    } catch (err) {
      console.warn(`[LorisClient] Historical fetch error for ${sym}: ${err.message}`);
      // Fallback to expired cache if available during rate limit
      const stale = db.getCachedHistorical(sym, '30d', 7 * 24 * 3600 * 1000)
        || db.getCachedHistorical(sym, timeframe, 7 * 24 * 3600 * 1000);
      if (stale) {
        console.log(`[LorisClient] Using stale cached data for ${sym}`);
        return stale;
      }
      return { symbol: sym, series: {} };
    }
  }
}

module.exports = new LorisClient();
