# GridPilot Trading Bot Platform

Firebase + Next.js scaffold for a futures trading bot platform with per-trade fees.

## Core concept

- Users sign up with email/password or Google through Firebase Authentication.
- Users fund an internal fee wallet used to pay trading fees.
- Users choose one of two bot types:
	- Support/Resistance Pattern Bot
	- Hedged Grid Martingale Bot
- Users select a futures exchange, choose multiple trading pairs from the top 100, and submit API credentials.
- Firebase Cloud Functions own bot execution, exchange API access, trade-ledger writes, and fee deduction.
- Every completed trade charges a 2% platform fee based on position size.
- Bots stop automatically when the fee wallet balance reaches zero or cannot cover the next trade fee.

## Exchange catalog

The app includes a data-driven futures exchange catalog in `lib/exchanges.ts`:

- Binance USDⓈ-M Futures
- Bybit Unified Trading
- OKX Futures & Swap
- Bitget Futures
- KuCoin Futures
- Gate.io Futures
- MEXC Futures
- Kraken Futures
- Deribit
- Coinbase International Exchange

Always confirm regional eligibility, product availability, and API permissions before enabling live trading.

## Firebase setup

1. Create a Firebase project.
2. Enable Authentication providers:
	 - Email/password
	 - Google
3. Create a Firestore database.
4. Copy `.env.example` to `.env.local` and fill in the Firebase web app values.
5. Deploy or emulate Firestore rules from `firestore.rules`.
6. Install Cloud Functions dependencies inside `functions/` before deployment.

## Local development

Install dependencies and run the app:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

The UI requires Firebase environment variables and uses real Firebase accounts.

## Cloud Functions scaffold

Cloud Functions live in `functions/src/index.ts` and include:

- `connectExchangeAccount` — callable function for API credential intake. Production must encrypt secrets with Cloud KMS or Secret Manager.
- `createBotInstance` — callable function that creates a bot after wallet checks.
- `runTradingBots` — scheduled function placeholder for exchange adapters, strategy execution, fee deduction, and auto-stop logic.

Install and build functions:

```bash
cd functions
npm install
npm run build
```

## Security notes

- Never store raw exchange API secrets in client-readable Firestore paths.
- Exchange API keys must have trading-only permissions and withdrawals disabled.
- Use KMS/Secret Manager encryption before live trading.
- Add payment-provider webhooks before approving real fee wallet top-ups.
- Add exchange-specific risk limits, rate limits, audit logs, and emergency kill switches.

## Validation

Run:

```bash
npm run lint
npm run build
```
