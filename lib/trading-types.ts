export type ExchangeId =
  | "binance-usdm"
  | "bybit"
  | "okx"
  | "bitget"
  | "kucoin-futures"
  | "gate-futures"
  | "mexc-futures"
  | "kraken-futures"
  | "deribit"
  | "coinbase-international";

export type BotType = "support-resistance" | "grid-martingale";

export type BotStatus =
  | "draft"
  | "pending_credentials"
  | "active"
  | "paused"
  | "stopped_insufficient_balance"
  | "stopped_error";

export type TradeSide = "long" | "short";

export type TradeOutcome = "win" | "loss" | "breakeven";

export interface ExchangeDefinition {
  id: ExchangeId;
  name: string;
  regionNote: string;
  futuresProducts: string[];
  credentialFields: ExchangeCredentialField[];
  websiteUrl: string;
  apiDocsUrl: string;
  riskNotes: string[];
}

export interface ExchangeCredentialField {
  key: "apiKey" | "apiSecret" | "passphrase" | "accountId";
  label: string;
  secret: boolean;
  required: boolean;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  feeWalletBalance: number;
  currency: "USD" | "USDT";
  createdAt: string;
  updatedAt: string;
}

export interface BotPlan {
  type: BotType;
  name: string;
  summary: string;
  monthlyPrice: number;
  feeRate: number;
  features: string[];
  riskWarning: string;
}

export interface BotInstance {
  id: string;
  uid: string;
  type: BotType;
  exchangeId: ExchangeId;
  marketSymbol: string;
  status: BotStatus;
  positionSizeUsd: number;
  feeRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface TradeLedgerEntry {
  id: string;
  botId: string;
  uid: string;
  exchangeId: ExchangeId;
  marketSymbol: string;
  side: TradeSide;
  outcome: TradeOutcome;
  positionSizeUsd: number;
  feeCharged: number;
  walletBalanceAfter: number;
  executedAt: string;
}

export interface BotConfigurationDraft {
  botType: BotType;
  exchangeId: ExchangeId;
  marketSymbol: string;
  positionSizeUsd: number;
}

export interface ExchangeCredentialDraft {
  apiKey: string;
  apiSecret: string;
  passphrase: string;
  accountId: string;
}