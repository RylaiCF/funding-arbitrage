/**
 * Configuration and metadata for Forex & Fiat perpetual currencies.
 * Groups variations like 'USDJPY' and 'JPY', 'USDCAD' and 'CAD' into single canonical currency assets.
 */

const FOREX_GROUPS = [
  {
    symbol: 'EUR',
    name: 'Евро',
    englishName: 'Euro',
    aliases: ['EUR'],
    category: 'major',
  },
  {
    symbol: 'GBP',
    name: 'Британский фунт',
    englishName: 'British Pound',
    aliases: ['GBP'],
    category: 'major',
  },
  {
    symbol: 'JPY',
    name: 'Японская иена',
    englishName: 'Japanese Yen',
    aliases: ['USDJPY', 'JPY'],
    category: 'major',
  },
  {
    symbol: 'AUD',
    name: 'Австралийский доллар',
    englishName: 'Australian Dollar',
    aliases: ['AUD'],
    category: 'major',
  },
  {
    symbol: 'CAD',
    name: 'Канадский доллар',
    englishName: 'Canadian Dollar',
    aliases: ['CAD', 'USDCAD'],
    category: 'major',
  },
  {
    symbol: 'CHF',
    name: 'Швейцарский франк',
    englishName: 'Swiss Franc',
    aliases: ['CHF', 'USDCHF'],
    category: 'major',
  },
  {
    symbol: 'NZD',
    name: 'Новозеландский доллар',
    englishName: 'New Zealand Dollar',
    aliases: ['NZD'],
    category: 'major',
  },
  {
    symbol: 'BRL',
    name: 'Бразильский реал',
    englishName: 'Brazilian Real',
    aliases: ['USDBRL', 'BRL'],
    category: 'cross',
  },
  {
    symbol: 'KRW',
    name: 'Южнокорейская вона',
    englishName: 'South Korean Won',
    aliases: ['USDKRW', 'KRW'],
    category: 'cross',
  },
  {
    symbol: 'NOK',
    name: 'Норвежская крона',
    englishName: 'Norwegian Krone',
    aliases: ['NOK'],
    category: 'cross',
  },
  {
    symbol: 'SEK',
    name: 'Шведская крона',
    englishName: 'Swedish Krona',
    aliases: ['SEK'],
    category: 'cross',
  },
  {
    symbol: 'TRY',
    name: 'Турецкая лира',
    englishName: 'Turkish Lira',
    aliases: ['TRY'],
    category: 'cross',
  },
  {
    symbol: 'HKD',
    name: 'Гонконгский доллар',
    englishName: 'Hong Kong Dollar',
    aliases: ['USDHKD', 'HKD'],
    category: 'cross',
  },
];

const CURRENCY_METADATA_MAP = new Map(
  FOREX_GROUPS.map((g) => [g.symbol.toUpperCase(), g])
);

// Map each alias to its parent group
const ALIAS_TO_GROUP_MAP = new Map();
for (const group of FOREX_GROUPS) {
  for (const alias of group.aliases) {
    ALIAS_TO_GROUP_MAP.set(alias.toUpperCase(), group);
  }
}

function getForexMetadata(symbol) {
  if (!symbol) return { name: 'Forex', englishName: 'Forex', category: 'fiat' };
  const sym = symbol.toUpperCase();
  if (CURRENCY_METADATA_MAP.has(sym)) {
    return CURRENCY_METADATA_MAP.get(sym);
  }
  if (ALIAS_TO_GROUP_MAP.has(sym)) {
    return ALIAS_TO_GROUP_MAP.get(sym);
  }

  return {
    symbol: sym,
    name: sym,
    englishName: sym,
    category: 'forex',
  };
}

function isForexTickerMatch(sym, curCode) {
  const u = sym.toUpperCase();
  const c = curCode.toUpperCase();
  if (u === c) return true;
  if (u === 'USD' + c || u === c + 'USD') return true;
  if (u === c + 'USDT' || u === 'USDT' + c) return true;
  if (u === '1000' + c || u === 'USD1000' + c || u === '1000' + c + 'USD') return true;
  return false;
}

/**
 * Returns canonical currency groups to scan, with dynamically discovered forex tickers.
 */
function getForexGroups(liveData = null) {
  const groups = FOREX_GROUPS.map((g) => ({
    ...g,
    aliases: [...g.aliases],
  }));

  if (liveData && Array.isArray(liveData.symbols)) {
    const existingAliases = new Set();
    groups.forEach((g) => g.aliases.forEach((a) => existingAliases.add(a.toUpperCase())));

    for (const sym of liveData.symbols) {
      const u = sym.toUpperCase();
      if (existingAliases.has(u)) continue;

      // Check if matches any existing canonical group (e.g. JPY, USDJPY, JPYUSD, etc.)
      for (const g of groups) {
        if (isForexTickerMatch(u, g.symbol)) {
          g.aliases.push(u);
          existingAliases.add(u);
          break;
        }
      }
    }
  }

  return groups;
}

module.exports = {
  FOREX_GROUPS,
  getForexMetadata,
  getForexGroups,
};
