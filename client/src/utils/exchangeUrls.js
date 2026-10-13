/**
 * Utility to generate exchange URLs:
 * 1. Verified direct instrument links (with external link icon)
 * 2. Exchange trading app / terminal links (without external link icon)
 */

const BITGET_FOREX_MAP = {
  EUR: 'EURUSDUSDT',
  EURUSD: 'EURUSDUSDT',
  GBP: 'GBPUSDUSDT',
  GBPUSD: 'GBPUSDUSDT',
  JPY: 'USDJPYUSDT',
  USDJPY: 'USDJPYUSDT',
  BRL: 'USDBRLUSDT',
  USDBRL: 'USDBRLUSDT',
  AUD: 'AUDUSDUSDT',
  AUDUSD: 'AUDUSDUSDT',
  CAD: 'USDCADUSDT',
  USDCAD: 'USDCADUSDT',
  CHF: 'USDCHFUSDT',
  USDCHF: 'USDCHFUSDT',
  NZD: 'NZDUSDUSDT',
  NZDUSD: 'NZDUSDUSDT',
  KRW: 'USDKRWUSDT',
  USDKRW: 'USDKRWUSDT',
  NOK: 'USDNOKUSDT',
  USDNOK: 'USDNOKUSDT',
  SEK: 'USDSEKUSDT',
  USDSEK: 'USDSEKUSDT',
  TRY: 'USDTRYUSDT',
  USDTRY: 'USDTRYUSDT',
  HKD: 'USDHKDUSDT',
  USDHKD: 'USDHKDUSDT',
};

const BYBIT_FOREX_MAP = {
  EUR: 'EURUSDUSDT',
  EURUSD: 'EURUSDUSDT',
  GBP: 'GBPUSDUSDT',
  GBPUSD: 'GBPUSDUSDT',
  JPY: 'USDJPYUSDT',
  USDJPY: 'USDJPYUSDT',
  AUD: 'AUDUSDUSDT',
  AUDUSD: 'AUDUSDUSDT',
  NZD: 'NZDUSDUSDT',
  NZDUSD: 'NZDUSDUSDT',
  CAD: 'USDCADUSDT',
  USDCAD: 'USDCADUSDT',
  CHF: 'USDCHFUSDT',
  USDCHF: 'USDCHFUSDT',
};

const GATE_FOREX_MAP = {
  EUR: 'EURUSD_USDT',
  EURUSD: 'EURUSD_USDT',
  GBP: 'GBPUSD_USDT',
  GBPUSD: 'GBPUSD_USDT',
  BRL: 'USDBRL_USDT',
  USDBRL: 'USDBRL_USDT',
  NOK: 'NOK_USDT',
};

const VERIFIED_EXCHANGE_INSTRUMENT_BUILDERS = {
  binance: (sym) => `https://www.binance.com/en/futures/${sym}USDT`,
  bybit: (sym) => {
    const s = sym.toUpperCase();
    if (BYBIT_FOREX_MAP[s]) {
      return `https://www.bybit.com/trade/usdt/${BYBIT_FOREX_MAP[s]}`;
    }
    return s.endsWith('USDT')
      ? `https://www.bybit.com/trade/usdt/${s}`
      : `https://www.bybit.com/trade/usdt/${s}USDT`;
  },
  okx: (sym) => `https://www.okx.com/trade-swap/${sym.toLowerCase()}-usdt-swap`,
  bitget: (sym) => {
    const s = sym.toUpperCase();
    if (BITGET_FOREX_MAP[s]) {
      return `https://www.bitget.com/futures/usdt/${BITGET_FOREX_MAP[s]}`;
    }
    return s.endsWith('USDT')
      ? `https://www.bitget.com/futures/usdt/${s}`
      : `https://www.bitget.com/futures/usdt/${s}USDT`;
  },
  bingx: (sym) => `https://bingx.com/en/perpetual/${sym}-USDT`,
  gate: (sym) => {
    const s = sym.toUpperCase();
    if (GATE_FOREX_MAP[s]) {
      return `https://www.gate.io/futures/USDT/${GATE_FOREX_MAP[s]}`;
    }
    return `https://www.gate.io/futures/USDT/${s}_USDT`;
  },
  gateio: (sym) => {
    const s = sym.toUpperCase();
    if (GATE_FOREX_MAP[s]) {
      return `https://www.gate.io/futures/USDT/${GATE_FOREX_MAP[s]}`;
    }
    return `https://www.gate.io/futures/USDT/${s}_USDT`;
  },
  kucoin: (sym) => `https://www.kucoin.com/futures/trade/${sym}USDTM`,
  mexc: (sym) => `https://www.mexc.com/futures/${sym}_USDT`,
  hyperliquid: (sym) => `https://app.hyperliquid.xyz/trade/${sym}`,
  // Hyperliquid HIP-3 / HIP-2 Deployers (hosted natively on Hyperliquid L1)
  paragon: (sym) => `https://app.hyperliquid.xyz/trade/para:${sym.toUpperCase()}`,
  tradexyz: (sym) => `https://app.hyperliquid.xyz/trade/xyz:${sym.toUpperCase()}`,
  entropyio: (sym) => `https://app.hyperliquid.xyz/trade/io:${sym.toUpperCase()}`,
  felix: (sym) => `https://app.hyperliquid.xyz/trade/flx:${sym.toUpperCase()}`,
  hyena: (sym) => `https://app.hyperliquid.xyz/trade/hyna:${sym.toUpperCase()}`,
  kinetiq: (sym) => `https://app.hyperliquid.xyz/trade/km:${sym.toUpperCase()}`,
  ventuals: (sym) => `https://app.hyperliquid.xyz/trade/vntl:${sym.toUpperCase()}`,
  dreamcash: (sym) => `https://app.hyperliquid.xyz/trade/cash:${sym.toUpperCase()}`,
  variational: (sym) => {
    const s = sym.toUpperCase();
    const map = {
      NASDAQ100: 'US100S',
      SP500: 'US500S',
      SPY: 'US500',
    };
    return `https://omni.variational.io/perpetual/${map[s] || s}`;
  },
  woofipro: (sym) => `https://pro.woofi.com/en/trade/${sym.toUpperCase()}_PERP`,
  aster: (sym) => `https://www.asterdex.com/en/futures/v1/${sym.toUpperCase()}USDT`,
  bluefin: (sym) => `https://trade.bluefin.io/pro/${sym.toUpperCase()}-PERP`,
  txflow: (sym) => `https://app.txflow.com/trade/${sym.toUpperCase()}`,
  decibel: (sym) => `https://app.decibel.trade/trade/${sym.toUpperCase()}/USD`,
  edgex: (sym) => `https://pro.edgex.exchange/trade/${sym.toUpperCase()}USDT`,
  grvt: (sym) => `https://grvt.io/exchange/perpetual/${sym.toUpperCase()}-USDT`,
  aftermath: (sym) => `https://aftermath.finance/perpetuals/${sym.toUpperCase()}`,
  htx: (sym) => `https://www.htx.com/futures/linear_swap/exchange/#contract_code=${sym}-USDT`,
  huobi: (sym) => `https://www.htx.com/futures/linear_swap/exchange/#contract_code=${sym}-USDT`,
  paradex: (sym) => `https://app.paradex.trade/trade/${sym}-USD-PERP`,
  lighter: (sym) => `https://app.lighter.xyz/trade/${sym}`,
  rhlighter: (sym) => `https://robinhoodchain.lighter.xyz/trade/${sym.toUpperCase()}`,
  phemex: (sym) => `https://phemex.com/futures/${sym}-USDT`,
  arcus: (sym) => `https://app.arcus.xyz/trade/perpetuals/${sym.toUpperCase()}-USD`,
  deribit: (sym) => {
    const s = sym.toUpperCase();
    return (s === 'BTC' || s === 'ETH')
      ? `https://www.deribit.com/futures/${s}-PERPETUAL`
      : `https://www.deribit.com/futures/${s}_USDC-PERPETUAL`;
  },
};

// Direct links to the trading terminal / web app (not marketing landing pages)
const EXCHANGE_APP_URLS = {
  arcus: 'https://app.arcus.xyz/trade/perpetuals',
  deribit: 'https://www.deribit.com/futures',
  aster: 'https://www.asterdex.com/en/trade',
  variational: 'https://omni.variational.io',
  extended: 'https://app.extended.exchange',
  txflow: 'https://app.txflow.com',
  bluefin: 'https://trade.bluefin.io',
  drift: 'https://app.drift.trade',
  zo: 'https://01.xyz/trade',
  '01': 'https://01.xyz/trade',
  bullet: 'https://app.bullet.xyz/trade',
  vest: 'https://alpha.vestmarkets.com',
  nado: 'https://app.nado.xyz',
  hibachi: 'https://hibachi.xyz',
  pacifica: 'https://app.pacifica.fi',
  woofipro: 'https://pro.woofi.com',
  woofi: 'https://pro.woofi.com',
  edgex: 'https://pro.edgex.exchange',
  grvt: 'https://grvt.io/exchange',
  decibel: 'https://app.decibel.trade',
  ethereal: 'https://app.ethereal.trade',
  reya: 'https://app.reya.xyz',
  phoenix: 'https://phoenix.trade',
  cryptocom: 'https://crypto.com/exchange',
  coinbase: 'https://www.coinbase.com/advanced-trade',
  coinbaseus: 'https://www.coinbase.com/advanced-trade',
  polymarket: 'https://polymarket.com',
  kalshi: 'https://kalshi.com',
  qfex: 'https://www.qfex.com',
  ostium: 'https://app.ostium.com',
  ondo: 'https://ondo.finance',
  risex: 'https://trade.risex.net',
  paragon: 'https://paragon.trade',
  tradexyz: 'https://trade.xyz',
  entropyio: 'https://entropy.trade',
  felix: 'https://felix.trade',
  hyena: 'https://hyena.trade',
  kinetiq: 'https://kinetiq.xyz',
  ventuals: 'https://ventuals.com',
  dreamcash: 'https://dreamcash.xyz',
  aftermath: 'https://aftermath.finance/perpetuals',
  binance: 'https://www.binance.com/en/futures',
  bybit: 'https://www.bybit.com/trade/usdt',
  okx: 'https://www.okx.com/trade-swap',
  bitget: 'https://www.bitget.com/futures/usdt',
  bingx: 'https://bingx.com/en/perpetual',
  gate: 'https://www.gate.io/futures/USDT',
  gateio: 'https://www.gate.io/futures/USDT',
  kucoin: 'https://www.kucoin.com/futures',
  mexc: 'https://www.mexc.com/futures',
  hyperliquid: 'https://app.hyperliquid.xyz',
  htx: 'https://www.htx.com/futures',
  huobi: 'https://www.htx.com/futures',
  paradex: 'https://app.paradex.trade',
  lighter: 'https://app.lighter.xyz',
  rhlighter: 'https://robinhoodchain.lighter.xyz/trade',
  phemex: 'https://phemex.com/futures',
};

export function getExchangeLinkInfo(exchangeId, rawSymbol) {
  if (!exchangeId) return null;
  const cleanEx = String(exchangeId).replace('_1_perp', '').split('_')[0].toLowerCase();
  const cleanSym = rawSymbol ? String(rawSymbol).split(/[\/_:]/)[0].toUpperCase() : null;

  // 1. Direct instrument link if supported
  if (cleanSym && VERIFIED_EXCHANGE_INSTRUMENT_BUILDERS[cleanEx]) {
    try {
      const directUrl = VERIFIED_EXCHANGE_INSTRUMENT_BUILDERS[cleanEx](cleanSym);
      if (directUrl) {
        return {
          url: directUrl,
          isDirectInstrument: true,
        };
      }
    } catch (e) {
      // Fallback
    }
  }

  // 2. Exchange terminal/app link if instrument direct link is not supported
  const appUrl = EXCHANGE_APP_URLS[cleanEx];
  if (appUrl) {
    return {
      url: appUrl,
      isDirectInstrument: false,
    };
  }

  return null;
}

export function getExchangeInstrumentUrl(exchangeId, rawSymbol) {
  const info = getExchangeLinkInfo(exchangeId, rawSymbol);
  return info ? info.url : null;
}
