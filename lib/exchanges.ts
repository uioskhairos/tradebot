import type { BotPlan, ExchangeDefinition, ExchangeId } from "./trading-types";

const apiKeySecretFields = [
  { key: "apiKey", label: "API key", secret: false, required: true },
  { key: "apiSecret", label: "API secret", secret: true, required: true },
] as const;

export const supportedExchanges: ExchangeDefinition[] = [
  {
    id: "binance-usdm",
    name: "Binance USDⓈ-M Futures",
    regionNote: "Availability depends on the user's country and Binance entity.",
    futuresProducts: ["USDT perpetual futures", "USDC perpetual futures"],
    credentialFields: [...apiKeySecretFields],
    websiteUrl: "https://www.binance.com/",
    apiDocsUrl: "https://developers.binance.com/docs/derivatives/usds-margined-futures/general-info",
    riskNotes: ["Use futures-only keys.", "Disable withdrawals on API keys."],
  },
  {
    id: "bybit",
    name: "Bybit Unified Trading",
    regionNote: "Availability depends on local restrictions and account type.",
    futuresProducts: ["USDT perpetuals", "USDC perpetuals", "inverse perpetuals"],
    credentialFields: [...apiKeySecretFields],
    websiteUrl: "https://www.bybit.com/",
    apiDocsUrl: "https://bybit-exchange.github.io/docs/v5/intro",
    riskNotes: ["Create restricted API keys.", "Do not enable withdrawal permission."],
  },
  {
    id: "okx",
    name: "OKX Futures & Swap",
    regionNote: "Requires API passphrase and may require sub-account selection.",
    futuresProducts: ["USDT swaps", "USDC swaps", "coin-margined futures"],
    credentialFields: [
      ...apiKeySecretFields,
      { key: "passphrase", label: "API passphrase", secret: true, required: true },
    ],
    websiteUrl: "https://www.okx.com/",
    apiDocsUrl: "https://www.okx.com/docs-v5/en/",
    riskNotes: ["Passphrase must match the API key.", "Keep IP restrictions enabled where possible."],
  },
  {
    id: "bitget",
    name: "Bitget Futures",
    regionNote: "Supports futures APIs subject to regional account eligibility.",
    futuresProducts: ["USDT-M futures", "USDC-M futures", "coin-M futures"],
    credentialFields: [
      ...apiKeySecretFields,
      { key: "passphrase", label: "API passphrase", secret: true, required: true },
    ],
    websiteUrl: "https://www.bitget.com/",
    apiDocsUrl: "https://www.bitget.com/api-doc/contract/intro",
    riskNotes: ["Use contract trading API permissions only.", "Disable withdrawals."],
  },
  {
    id: "kucoin-futures",
    name: "KuCoin Futures",
    regionNote: "Requires futures account permissions and API passphrase.",
    futuresProducts: ["USDT-margined contracts", "coin-margined contracts"],
    credentialFields: [
      ...apiKeySecretFields,
      { key: "passphrase", label: "API passphrase", secret: true, required: true },
    ],
    websiteUrl: "https://www.kucoin.com/futures",
    apiDocsUrl: "https://www.kucoin.com/docs-new/rest/futures-trading/introduction",
    riskNotes: ["Enable futures trading only.", "Restrict API access by IP when supported."],
  },
  {
    id: "gate-futures",
    name: "Gate.io Futures",
    regionNote: "Contract support varies by jurisdiction.",
    futuresProducts: ["USDT perpetual futures", "BTC-settled futures"],
    credentialFields: [...apiKeySecretFields],
    websiteUrl: "https://www.gate.io/futures",
    apiDocsUrl: "https://www.gate.io/docs/developers/apiv4/en/",
    riskNotes: ["Use API keys with minimal contract permissions.", "No withdrawal permission."],
  },
  {
    id: "mexc-futures",
    name: "MEXC Futures",
    regionNote: "Futures access and API availability vary by region.",
    futuresProducts: ["USDT perpetual futures"],
    credentialFields: [...apiKeySecretFields],
    websiteUrl: "https://www.mexc.com/futures",
    apiDocsUrl: "https://mexcdevelop.github.io/apidocs/contract_v1_en/",
    riskNotes: ["Keep futures API permissions scoped.", "Monitor exchange-side rate limits."],
  },
  {
    id: "kraken-futures",
    name: "Kraken Futures",
    regionNote: "Futures products require eligible Kraken Futures access.",
    futuresProducts: ["Crypto futures", "perpetual futures"],
    credentialFields: [...apiKeySecretFields],
    websiteUrl: "https://futures.kraken.com/",
    apiDocsUrl: "https://docs.kraken.com/api/docs/futures-api/trading/",
    riskNotes: ["Use futures-specific API credentials.", "Confirm margin mode before enabling a bot."],
  },
  {
    id: "deribit",
    name: "Deribit",
    regionNote: "Popular for BTC/ETH derivatives; access is jurisdiction-dependent.",
    futuresProducts: ["perpetual futures", "dated futures", "options"],
    credentialFields: [
      { key: "apiKey", label: "Client ID", secret: false, required: true },
      { key: "apiSecret", label: "Client secret", secret: true, required: true },
    ],
    websiteUrl: "https://www.deribit.com/",
    apiDocsUrl: "https://docs.deribit.com/",
    riskNotes: ["Use trade-only API scope.", "Options support is listed but bots should start with futures only."],
  },
  {
    id: "coinbase-international",
    name: "Coinbase International Exchange",
    regionNote: "Institutional/eligible non-US access only.",
    futuresProducts: ["perpetual futures"],
    credentialFields: [
      ...apiKeySecretFields,
      { key: "accountId", label: "Portfolio/account ID", secret: false, required: false },
    ],
    websiteUrl: "https://international.coinbase.com/",
    apiDocsUrl: "https://docs.cdp.coinbase.com/api-reference/international-exchange-api/rest-api/introduction",
    riskNotes: ["Confirm account eligibility.", "Use a dedicated API portfolio where possible."],
  },
];

export const botPlans: BotPlan[] = [
  {
    type: "support-resistance",
    name: "Support/Resistance Pattern Bot",
    summary:
      "Looks for reaction zones, breakout retests, and risk-defined entries around support and resistance patterns.",
    feeRate: 0.02,
    features: [
      "Pattern-based entries",
      "Multi-pair selection from top exchange markets",
      "Cloud Function managed execution",
      "2% fee per completed trade based on position size",
    ],
    riskWarning: "Pattern recognition can fail in choppy or news-driven markets.",
  },
  {
    type: "grid-martingale",
    name: "Hedged Grid Martingale Bot",
    summary:
      "Opens long and short exposure, places pending grid orders, and increases grid size using a double martingale model.",
    feeRate: 0.02,
    features: [
      "Long and short hedge mode concept",
      "Multi-pair pending grid order ladder",
      "Martingaled position sizing",
      "Auto-stop when fee wallet reaches zero",
    ],
    riskWarning: "Martingale strategies can compound losses quickly and require strict risk limits.",
  },
];

export const top100UsdtPairs = [
  "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT", "ADAUSDT", "AVAXUSDT", "DOTUSDT", "LINKUSDT",
  "TRXUSDT", "LTCUSDT", "BCHUSDT", "XLMUSDT", "ATOMUSDT", "NEARUSDT", "FILUSDT", "APTUSDT", "ARBUSDT", "OPUSDT",
  "SUIUSDT", "SEIUSDT", "INJUSDT", "TIAUSDT", "RUNEUSDT", "AAVEUSDT", "MKRUSDT", "UNIUSDT", "SUSHIUSDT", "SNXUSDT",
  "CRVUSDT", "DYDXUSDT", "GMXUSDT", "PENDLEUSDT", "LDOUSDT", "ENSUSDT", "GRTUSDT", "ALGOUSDT", "HBARUSDT", "VETUSDT",
  "ICPUSDT", "ETCUSDT", "THETAUSDT", "FLOWUSDT", "EGLDUSDT", "KASUSDT", "MATICUSDT", "WLDUSDT", "PEPEUSDT", "SHIBUSDT",
  "FLOKIUSDT", "BONKUSDT", "JUPUSDT", "PYTHUSDT", "JTOUSDT", "WIFUSDT", "NOTUSDT", "TONUSDT", "ONDOUSDT", "ORDIUSDT",
  "1000SATSUSDT", "ARKMUSDT", "BLURUSDT", "BOMEUSDT", "MEMEUSDT", "CELOUSDT", "CHZUSDT", "ENJUSDT", "MANAUSDT", "SANDUSDT",
  "AXSUSDT", "GALAUSDT", "IMXUSDT", "APEUSDT", "COMPUSDT", "ZRXUSDT", "YFIUSDT", "KSMUSDT", "ROSEUSDT", "ZILUSDT",
  "MINAUSDT", "KAVAUSDT", "QTUMUSDT", "NEOUSDT", "IOTAUSDT", "DASHUSDT", "ZECUSDT", "RVNUSDT", "ANKRUSDT", "ONEUSDT",
  "CFXUSDT", "STXUSDT", "FETUSDT", "AGIXUSDT", "OCEANUSDT", "IDUSDT", "AEVOUSDT", "STRKUSDT", "ALTUSDT", "PIXELUSDT",
];

const exchangePairBlockList: Partial<Record<ExchangeId, string[]>> = {
  deribit: [
    "XRPUSDT", "DOGEUSDT", "ADAUSDT", "DOTUSDT", "TONUSDT", "ONDOUSDT", "PEPEUSDT", "SHIBUSDT", "FLOKIUSDT", "BONKUSDT",
    "WIFUSDT", "NOTUSDT", "BOMEUSDT", "MEMEUSDT", "AEVOUSDT", "STRKUSDT", "ALTUSDT", "PIXELUSDT",
  ],
  "coinbase-international": [
    "1000SATSUSDT", "PEPEUSDT", "SHIBUSDT", "FLOKIUSDT", "BONKUSDT", "WIFUSDT", "NOTUSDT", "BOMEUSDT", "MEMEUSDT", "ARKMUSDT",
  ],
  "kraken-futures": ["1000SATSUSDT", "NOTUSDT", "BOMEUSDT", "MEMEUSDT", "AEVOUSDT", "ALTUSDT", "PIXELUSDT"],
};

export function getTopPairsForExchange(exchangeId: ExchangeId) {
  const blocked = new Set(exchangePairBlockList[exchangeId] ?? []);
  return top100UsdtPairs.filter((pair) => !blocked.has(pair));
}

export function getExchangeById(exchangeId: string) {
  return supportedExchanges.find((exchange) => exchange.id === exchangeId);
}

export function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}