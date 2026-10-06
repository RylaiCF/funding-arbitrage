/**
 * Utility to generate exchange URLs:
 * 1. Verified direct instrument links (with external link icon)
 * 2. Exchange trading app / terminal links (without external link icon)
 */

const VERIFIED_EXCHANGE_INSTRUMENT_BUILDERS = {
  binance: (sym) => `https://www.binance.com/en/futures/${sym}USDT`,
  bybit: (sym) => `https://www.bybit.com/trade/usdt/${sym}USDT`,
  okx: (sym) => `https://www.okx.com/trade-swap/${sym.toLowerCase()}-usdt-swap`,
  bitget: (sym) => `https://www.bitget.com/futures/usdt/${sym}USDT`,
  bingx: (sym) => `https://bingx.com/en/perpetual/${sym}-USDT`,
  gate: (sym) => `https://www.gate.io/futures/USDT/${sym}_USDT`,
  gateio: (sym) => `https://www.gate.io/futures/USDT/${sym}_USDT`,
  kucoin: (sym) => `https://www.kucoin.com/futures/trade/${sym}USDTM`,
  mexc: (sym) => `https://www.mexc.com/futures/${sym}_USDT`,
  hyperliquid: (sym) => `https://app.hyperliquid.xyz/trade/${sym}`,
  htx: (sym) => `https://www.htx.com/futures/linear_swap/exchange/#contract_code=${sym}-USDT`,
  huobi: (sym) => `https://www.htx.com/futures/linear_swap/exchange/#contract_code=${sym}-USDT`,
  paradex: (sym) => `https://app.paradex.trade/trade/${sym}-USD-PERP`,
  lighter: (sym) => `https://app.lighter.xyz/trade/${sym}`,
  phemex: (sym) => `https://phemex.com/futures/${sym}-USDT`,
};

// Direct links to the trading terminal / web app (not marketing landing pages)
const EXCHANGE_APP_URLS = {
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
  paragon: 'https://app.hyperliquid.xyz',
  tradexyz: 'https://app.hyperliquid.xyz',
  entropyio: 'https://app.hyperliquid.xyz',
  felix: 'https://app.hyperliquid.xyz',
  hyena: 'https://app.hyperliquid.xyz',
  kinetiq: 'https://app.hyperliquid.xyz',
  ventuals: 'https://app.hyperliquid.xyz',
  dreamcash: 'https://app.hyperliquid.xyz',
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
