"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { botPlans, formatCurrency, getExchangeById, supportedExchanges } from "@/lib/exchanges";
import { hasFirebaseBrowserConfig } from "@/lib/firebase/client";
import {
  connectExchangeAccount,
  createBotInstance,
  registerWithEmail,
  requestFeeWalletTopUp,
  signInWithEmail,
  signInWithGoogle,
  signOutCurrentUser,
  subscribeToAuthState,
  subscribeToBotInstances,
  subscribeToTradeLedger,
  subscribeToUserProfile,
} from "@/lib/firebase/trading-service";
import type {
  BotConfigurationDraft,
  BotInstance,
  BotType,
  ExchangeCredentialDraft,
  ExchangeId,
  TradeLedgerEntry,
  UserProfile,
} from "@/lib/trading-types";

const demoProfile: UserProfile = {
  uid: "demo-user",
  email: "demo@gridpilot.local",
  displayName: "Demo Trader",
  feeWalletBalance: 248.7,
  currency: "USD",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const demoBots: BotInstance[] = [
  {
    id: "bot_sr_btc",
    uid: "demo-user",
    type: "support-resistance",
    exchangeId: "bybit",
    marketSymbol: "BTCUSDT",
    status: "active",
    positionSizeUsd: 500,
    feeRate: 0.02,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "bot_grid_eth",
    uid: "demo-user",
    type: "grid-martingale",
    exchangeId: "okx",
    marketSymbol: "ETH-USDT-SWAP",
    status: "paused",
    positionSizeUsd: 300,
    feeRate: 0.02,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const demoLedger: TradeLedgerEntry[] = [
  {
    id: "ledger_1",
    botId: "bot_sr_btc",
    uid: "demo-user",
    exchangeId: "bybit",
    marketSymbol: "BTCUSDT",
    side: "long",
    outcome: "win",
    positionSizeUsd: 500,
    feeCharged: 10,
    walletBalanceAfter: 248.7,
    executedAt: new Date().toISOString(),
  },
  {
    id: "ledger_2",
    botId: "bot_grid_eth",
    uid: "demo-user",
    exchangeId: "okx",
    marketSymbol: "ETH-USDT-SWAP",
    side: "short",
    outcome: "loss",
    positionSizeUsd: 300,
    feeCharged: 6,
    walletBalanceAfter: 258.7,
    executedAt: new Date(Date.now() - 1000 * 60 * 52).toISOString(),
  },
];

const emptyCredentials: ExchangeCredentialDraft = {
  apiKey: "",
  apiSecret: "",
  passphrase: "",
  accountId: "",
};

export default function TradingBotPlatform() {
  const firebaseConfigured = hasFirebaseBrowserConfig();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(firebaseConfigured ? null : demoProfile);
  const [bots, setBots] = useState<BotInstance[]>(firebaseConfigured ? [] : demoBots);
  const [ledger, setLedger] = useState<TradeLedgerEntry[]>(firebaseConfigured ? [] : demoLedger);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedBotType, setSelectedBotType] = useState<BotType>("support-resistance");
  const [selectedExchangeId, setSelectedExchangeId] = useState<ExchangeId>("binance-usdm");
  const [marketSymbol, setMarketSymbol] = useState("BTCUSDT");
  const [positionSizeUsd, setPositionSizeUsd] = useState(250);
  const [topUpAmount, setTopUpAmount] = useState(100);
  const [credentials, setCredentials] = useState<ExchangeCredentialDraft>(emptyCredentials);
  const [statusMessage, setStatusMessage] = useState("Demo mode is active until Firebase env vars are configured.");
  const [isBusy, setIsBusy] = useState(false);

  const selectedPlan = useMemo(
    () => botPlans.find((plan) => plan.type === selectedBotType) ?? botPlans[0],
    [selectedBotType],
  );

  useEffect(() => subscribeToAuthState(setUser), []);

  useEffect(() => {
    if (!firebaseConfigured || !user) {
      return undefined;
    }

    return subscribeToUserProfile(user.uid, setProfile);
  }, [firebaseConfigured, user]);

  useEffect(() => {
    if (!firebaseConfigured || !user) {
      return undefined;
    }

    return subscribeToBotInstances(user.uid, setBots);
  }, [firebaseConfigured, user]);

  useEffect(() => {
    if (!firebaseConfigured || !user) {
      return undefined;
    }

    return subscribeToTradeLedger(user.uid, setLedger);
  }, [firebaseConfigured, user]);

  const canUseFirebase = firebaseConfigured && user;
  const projectedFee = positionSizeUsd * selectedPlan.feeRate;

  async function runAction(action: () => Promise<unknown>, successMessage: string) {
    setIsBusy(true);
    setStatusMessage("");

    try {
      await action();
      setStatusMessage(successMessage);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setIsBusy(false);
    }
  }

  function handleDemoLogin() {
    setProfile(demoProfile);
    setBots(demoBots);
    setLedger(demoLedger);
    setStatusMessage("Demo dashboard loaded. Configure Firebase to enable real auth and Cloud Functions.");
  }

  async function handleEmailSubmit(mode: "login" | "register") {
    await runAction(
      async () => {
        if (mode === "register") {
          await registerWithEmail(email, password);
        } else {
          await signInWithEmail(email, password);
        }
      },
      mode === "register" ? "Account created." : "Signed in.",
    );
  }

  async function handleConnectExchange() {
    await runAction(
      async () => {
        if (!canUseFirebase) {
          throw new Error("Sign in with Firebase before storing exchange credentials.");
        }

        await connectExchangeAccount(credentials);
      },
      "Exchange credentials submitted securely to Cloud Functions.",
    );
  }

  async function handleCreateBot() {
    await runAction(
      async () => {
        const draft: BotConfigurationDraft = {
          botType: selectedBotType,
          exchangeId: selectedExchangeId,
          marketSymbol,
          positionSizeUsd,
        };

        if (!canUseFirebase) {
          const mockBot: BotInstance = {
            id: `demo_${Date.now()}`,
            uid: "demo-user",
            type: draft.botType,
            exchangeId: draft.exchangeId,
            marketSymbol: draft.marketSymbol,
            status: profile && profile.feeWalletBalance > 0 ? "pending_credentials" : "stopped_insufficient_balance",
            positionSizeUsd: draft.positionSizeUsd,
            feeRate: selectedPlan.feeRate,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          setBots((currentBots) => [mockBot, ...currentBots]);
          return;
        }

        await createBotInstance(draft);
      },
      "Bot subscription created. Cloud Functions will start it after credentials and balance checks pass.",
    );
  }

  async function handleTopUpRequest() {
    await runAction(
      async () => {
        if (!canUseFirebase) {
          setProfile((currentProfile) =>
            currentProfile
              ? {
                  ...currentProfile,
                  feeWalletBalance: currentProfile.feeWalletBalance + topUpAmount,
                  updatedAt: new Date().toISOString(),
                }
              : demoProfile,
          );
          return;
        }

        await requestFeeWalletTopUp(user.uid, topUpAmount);
      },
      "Funding request recorded. Connect your payment provider before approving real balances.",
    );
  }

  return (
    <main className="app-shell min-h-screen overflow-hidden px-5 py-6 text-slate-100 sm:px-8 lg:px-12">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <Header
          firebaseConfigured={firebaseConfigured}
          userEmail={user?.email ?? profile?.email ?? null}
          onGoogleSignIn={() => runAction(signInWithGoogle, "Signed in with Google.")}
          onSignOut={() => runAction(signOutCurrentUser, "Signed out.")}
        />

        <section className="grid gap-6 lg:grid-cols-[1.04fr_0.96fr]">
          <HeroPanel />
          <AuthPanel
            email={email}
            password={password}
            isBusy={isBusy}
            firebaseConfigured={firebaseConfigured}
            statusMessage={statusMessage}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onDemoLogin={handleDemoLogin}
            onGoogleSignIn={() => runAction(signInWithGoogle, "Signed in with Google.")}
            onEmailSubmit={handleEmailSubmit}
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <MetricCard label="Fee wallet" value={formatCurrency(profile?.feeWalletBalance ?? 0)} tone="green" />
          <MetricCard label="Active / pending bots" value={String(bots.length)} tone="blue" />
          <MetricCard label="Fee per completed trade" value="2% of position size" tone="amber" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <ConfigurationPanel
            selectedBotType={selectedBotType}
            selectedExchangeId={selectedExchangeId}
            marketSymbol={marketSymbol}
            positionSizeUsd={positionSizeUsd}
            topUpAmount={topUpAmount}
            credentials={credentials}
            projectedFee={projectedFee}
            isBusy={isBusy}
            onBotTypeChange={setSelectedBotType}
            onExchangeChange={setSelectedExchangeId}
            onMarketSymbolChange={setMarketSymbol}
            onPositionSizeChange={setPositionSizeUsd}
            onTopUpAmountChange={setTopUpAmount}
            onCredentialsChange={setCredentials}
            onConnectExchange={handleConnectExchange}
            onCreateBot={handleCreateBot}
            onTopUp={handleTopUpRequest}
          />

          <DashboardPanel bots={bots} ledger={ledger} />
        </section>

        <ExchangePanel />

        <section className="glass-panel rounded-[2rem] p-6 text-sm leading-6 text-slate-300">
          <strong className="text-slate-100">Risk notice:</strong> This application is a platform scaffold, not financial advice.
          Futures trading, leverage, hedged grids, and martingale sizing can cause rapid losses. Production deployment must add
          exchange-specific adapters, encryption/KMS for API secrets, payment settlement, rate-limit handling, audit logs, kill
          switches, and jurisdiction checks before allowing live trading.
        </section>
      </section>
    </main>
  );
}

function Header({
  firebaseConfigured,
  userEmail,
  onGoogleSignIn,
  onSignOut,
}: {
  firebaseConfigured: boolean;
  userEmail: string | null;
  onGoogleSignIn: () => void;
  onSignOut: () => void;
}) {
  return (
    <header className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.35em] text-sky-300">GridPilot</p>
        <h1 className="text-2xl font-black tracking-tight text-white">Firebase Trading Bot Platform</h1>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <span className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300">
          {firebaseConfigured ? "Firebase ready" : "Demo mode"}
        </span>
        {userEmail ? (
          <button className="secondary-button" onClick={onSignOut} type="button">
            Sign out {userEmail}
          </button>
        ) : (
          <button className="secondary-button" onClick={onGoogleSignIn} type="button" disabled={!firebaseConfigured}>
            Continue with Google
          </button>
        )}
      </div>
    </header>
  );
}

function HeroPanel() {
  return (
    <article className="glass-panel-strong rounded-[2.5rem] p-8 sm:p-10">
      <p className="mb-4 inline-flex rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-sm font-bold text-sky-200">
        Cloud Functions managed execution
      </p>
      <h2 className="text-gradient max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">
        Subscribe to trading bots. Connect a futures exchange. Pay per completed trade.
      </h2>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
        Users sign in with email or Google, fund a fee wallet, choose an exchange, and activate either a support/resistance bot or
        a hedged grid martingale bot. Cloud Functions own execution, fee deduction, and auto-stop safeguards.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {["Email + Google auth", "Encrypted API key flow", "2% fee ledger"].map((item) => (
          <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm font-bold text-slate-200">
            {item}
          </div>
        ))}
      </div>
    </article>
  );
}

function AuthPanel({
  email,
  password,
  isBusy,
  firebaseConfigured,
  statusMessage,
  onEmailChange,
  onPasswordChange,
  onDemoLogin,
  onGoogleSignIn,
  onEmailSubmit,
}: {
  email: string;
  password: string;
  isBusy: boolean;
  firebaseConfigured: boolean;
  statusMessage: string;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
  onDemoLogin: () => void;
  onGoogleSignIn: () => void;
  onEmailSubmit: (mode: "login" | "register") => Promise<void>;
}) {
  return (
    <section className="glass-panel rounded-[2.5rem] p-6 sm:p-8">
      <h2 className="text-2xl font-black text-white">Trader access</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        Configure Firebase Authentication to enable real email/password and Google sign-in.
      </p>
      <div className="mt-6 space-y-3">
        <input className="input-field" placeholder="Email address" value={email} onChange={(event) => onEmailChange(event.target.value)} />
        <input
          className="input-field"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
        />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button className="primary-button" disabled={isBusy || !firebaseConfigured} onClick={() => onEmailSubmit("login")} type="button">
          Sign in
        </button>
        <button className="secondary-button" disabled={isBusy || !firebaseConfigured} onClick={() => onEmailSubmit("register")} type="button">
          Create account
        </button>
      </div>
      <button className="mt-3 w-full secondary-button" disabled={isBusy || !firebaseConfigured} onClick={onGoogleSignIn} type="button">
        Continue with Google
      </button>
      <button className="mt-3 w-full secondary-button" disabled={isBusy} onClick={onDemoLogin} type="button">
        Load demo dashboard
      </button>
      {statusMessage ? <p className="mt-5 rounded-2xl bg-slate-950/70 p-4 text-sm text-slate-300">{statusMessage}</p> : null}
    </section>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: "green" | "blue" | "amber" }) {
  const toneClass = {
    green: "text-emerald-300",
    blue: "text-sky-300",
    amber: "text-amber-300",
  }[tone];

  return (
    <article className="glass-panel rounded-[2rem] p-6">
      <p className="text-sm font-bold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className={`mt-3 text-3xl font-black ${toneClass}`}>{value}</p>
    </article>
  );
}

function ConfigurationPanel({
  selectedBotType,
  selectedExchangeId,
  marketSymbol,
  positionSizeUsd,
  topUpAmount,
  credentials,
  projectedFee,
  isBusy,
  onBotTypeChange,
  onExchangeChange,
  onMarketSymbolChange,
  onPositionSizeChange,
  onTopUpAmountChange,
  onCredentialsChange,
  onConnectExchange,
  onCreateBot,
  onTopUp,
}: {
  selectedBotType: BotType;
  selectedExchangeId: ExchangeId;
  marketSymbol: string;
  positionSizeUsd: number;
  topUpAmount: number;
  credentials: ExchangeCredentialDraft;
  projectedFee: number;
  isBusy: boolean;
  onBotTypeChange: (type: BotType) => void;
  onExchangeChange: (exchangeId: ExchangeId) => void;
  onMarketSymbolChange: (symbol: string) => void;
  onPositionSizeChange: (size: number) => void;
  onTopUpAmountChange: (amount: number) => void;
  onCredentialsChange: (credentials: ExchangeCredentialDraft) => void;
  onConnectExchange: () => Promise<void>;
  onCreateBot: () => Promise<void>;
  onTopUp: () => Promise<void>;
}) {
  const selectedExchange = getExchangeById(selectedExchangeId) ?? supportedExchanges[0];
  const selectedPlan = botPlans.find((plan) => plan.type === selectedBotType) ?? botPlans[0];

  return (
    <section className="glass-panel rounded-[2.5rem] p-6 sm:p-8">
      <h2 className="text-2xl font-black text-white">Subscribe and configure</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {botPlans.map((plan) => (
          <button
            key={plan.type}
            className={`rounded-3xl border p-5 text-left transition ${
              selectedBotType === plan.type ? "border-sky-400 bg-sky-400/10" : "border-slate-700 bg-slate-950/35 hover:border-sky-700"
            }`}
            onClick={() => onBotTypeChange(plan.type)}
            type="button"
          >
            <p className="text-lg font-black text-white">{plan.name}</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">{plan.summary}</p>
            <p className="mt-4 text-sm font-bold text-emerald-300">{formatCurrency(plan.monthlyPrice)} / month + 2% trade fee</p>
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-bold text-slate-300">
          Futures exchange
          <select className="input-field" value={selectedExchangeId} onChange={(event) => onExchangeChange(event.target.value as ExchangeId)}>
            {supportedExchanges.map((exchange) => (
              <option key={exchange.id} value={exchange.id}>
                {exchange.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm font-bold text-slate-300">
          Market symbol
          <input className="input-field" value={marketSymbol} onChange={(event) => onMarketSymbolChange(event.target.value.toUpperCase())} />
        </label>
        <label className="space-y-2 text-sm font-bold text-slate-300">
          Position size
          <input
            className="input-field"
            min={10}
            type="number"
            value={positionSizeUsd}
            onChange={(event) => onPositionSizeChange(Number(event.target.value))}
          />
        </label>
        <label className="space-y-2 text-sm font-bold text-slate-300">
          Fee wallet top-up
          <input
            className="input-field"
            min={1}
            type="number"
            value={topUpAmount}
            onChange={(event) => onTopUpAmountChange(Number(event.target.value))}
          />
        </label>
      </div>

      <div className="mt-5 rounded-3xl border border-slate-700 bg-slate-950/45 p-5 text-sm leading-6 text-slate-300">
        <p className="font-bold text-white">Selected exchange: {selectedExchange.name}</p>
        <p className="mt-1">{selectedExchange.regionNote}</p>
        <p className="mt-3 font-bold text-amber-300">Projected fee per completed trade: {formatCurrency(projectedFee)}</p>
        <p className="mt-3 text-slate-400">{selectedPlan.riskWarning}</p>
      </div>

      <div className="mt-6 space-y-3">
        <h3 className="font-black text-white">API credentials</h3>
        {selectedExchange.credentialFields.map((field) => (
          <input
            key={field.key}
            className="input-field"
            placeholder={`${field.label}${field.required ? " *" : ""}`}
            type={field.secret ? "password" : "text"}
            value={credentials[field.key]}
            onChange={(event) => onCredentialsChange({ ...credentials, [field.key]: event.target.value })}
          />
        ))}
        <p className="text-xs leading-5 text-slate-500">
          Production flow must send credentials only to Cloud Functions and store encrypted secrets server-side. Never write raw API keys to client-readable Firestore docs.
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <button className="secondary-button" disabled={isBusy} onClick={onTopUp} type="button">
          Fund wallet
        </button>
        <button className="secondary-button" disabled={isBusy} onClick={onConnectExchange} type="button">
          Save API key
        </button>
        <button className="primary-button" disabled={isBusy} onClick={onCreateBot} type="button">
          Start bot
        </button>
      </div>
    </section>
  );
}

function DashboardPanel({ bots, ledger }: { bots: BotInstance[]; ledger: TradeLedgerEntry[] }) {
  return (
    <section className="glass-panel rounded-[2.5rem] p-6 sm:p-8">
      <h2 className="text-2xl font-black text-white">Dashboard</h2>
      <div className="mt-6 space-y-4">
        {bots.map((bot) => {
          const exchange = getExchangeById(bot.exchangeId);
          const plan = botPlans.find((item) => item.type === bot.type);

          return (
            <article key={bot.id} className="rounded-3xl border border-slate-700 bg-slate-950/45 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-lg font-black text-white">{plan?.name ?? bot.type}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {exchange?.name ?? bot.exchangeId} • {bot.marketSymbol} • {formatCurrency(bot.positionSizeUsd)} position
                  </p>
                </div>
                <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-sky-200">
                  {bot.status.replaceAll("_", " ")}
                </span>
              </div>
            </article>
          );
        })}
      </div>

      <h3 className="mt-8 text-xl font-black text-white">Fee ledger</h3>
      <div className="mt-4 overflow-hidden rounded-3xl border border-slate-700">
        {ledger.map((entry) => (
          <div key={entry.id} className="grid gap-2 border-b border-slate-800 bg-slate-950/35 p-4 text-sm last:border-b-0 sm:grid-cols-4">
            <span className="font-bold text-white">{entry.marketSymbol}</span>
            <span className="capitalize text-slate-300">{entry.side} • {entry.outcome}</span>
            <span className="text-amber-300">Fee {formatCurrency(entry.feeCharged)}</span>
            <span className="text-slate-400">Balance {formatCurrency(entry.walletBalanceAfter)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ExchangePanel() {
  return (
    <section className="glass-panel rounded-[2.5rem] p-6 sm:p-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">Supported futures exchanges</h2>
          <p className="mt-2 text-sm text-slate-400">Initial exchange catalog with futures API support. Confirm regional eligibility during onboarding.</p>
        </div>
        <span className="text-sm font-bold text-sky-300">{supportedExchanges.length} integrations planned</span>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {supportedExchanges.map((exchange) => (
          <article key={exchange.id} className="rounded-3xl border border-slate-700 bg-slate-950/35 p-5">
            <h3 className="text-lg font-black text-white">{exchange.name}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">{exchange.futuresProducts.join(", ")}</p>
            <a className="mt-4 inline-flex text-sm font-bold text-sky-300 hover:text-sky-200" href={exchange.apiDocsUrl} target="_blank" rel="noreferrer">
              API docs →
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}