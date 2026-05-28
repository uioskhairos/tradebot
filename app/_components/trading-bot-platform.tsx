"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { IconBot, IconCheck, IconList, IconRocket, IconTrendUp, IconWallet } from "./icons";
import { botPlans, formatCurrency, getExchangeById, getTopPairsForExchange, supportedExchanges } from "@/lib/exchanges";
import { hasFirebaseBrowserConfig } from "@/lib/firebase/client";
import {
  connectExchangeAccount,
  createBotInstance,
  registerWithEmail,
  requestFeeWalletTopUp,
  signInWithEmail,
  signInWithGoogle,
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

const emptyCredentials: ExchangeCredentialDraft = {
  apiKey: "",
  apiSecret: "",
  passphrase: "",
  accountId: "",
};

type TradingView = "full" | "login" | "dashboard" | "settings";

/* â”€â”€â”€ Shared style helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const sectionStyle: React.CSSProperties = {
  maxWidth: "80rem",
  margin: "0 auto",
  padding: "2rem 1.25rem",
  width: "100%",
};

/* â”€â”€â”€ Main component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export default function TradingBotPlatform({ view = "full" }: { view?: TradingView }) {
  const firebaseConfigured = hasFirebaseBrowserConfig();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bots, setBots] = useState<BotInstance[]>([]);
  const [ledger, setLedger] = useState<TradeLedgerEntry[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedBotType, setSelectedBotType] = useState<BotType>("support-resistance");
  const [selectedExchangeId, setSelectedExchangeId] = useState<ExchangeId>("binance-usdm");
  const [selectedMarketSymbols, setSelectedMarketSymbols] = useState<string[]>(["BTCUSDT"]);
  const [positionSizeUsd, setPositionSizeUsd] = useState(250);
  const [topUpAmount, setTopUpAmount] = useState(100);
  const [credentials, setCredentials] = useState<ExchangeCredentialDraft>(emptyCredentials);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusTone, setStatusTone] = useState<"success" | "error" | "info">("info");
  const [isBusy, setIsBusy] = useState(false);

  const selectedPlan = useMemo(
    () => botPlans.find((plan) => plan.type === selectedBotType) ?? botPlans[0],
    [selectedBotType]
  );
  const availableMarketSymbols = useMemo(() => getTopPairsForExchange(selectedExchangeId), [selectedExchangeId]);

  function handleExchangeChange(exchangeId: ExchangeId) {
    setSelectedExchangeId(exchangeId);
    const nextAvailable = getTopPairsForExchange(exchangeId);
    setSelectedMarketSymbols((prev) => {
      const filtered = prev.filter((s) => nextAvailable.includes(s));
      return filtered.length > 0 ? filtered : nextAvailable[0] ? [nextAvailable[0]] : [];
    });
  }

  useEffect(() => subscribeToAuthState(setUser), []);

  useEffect(() => {
    if (!firebaseConfigured || !user) return;
    return subscribeToUserProfile(user.uid, setProfile);
  }, [firebaseConfigured, user]);

  useEffect(() => {
    if (!firebaseConfigured || !user) return;
    return subscribeToBotInstances(user.uid, setBots);
  }, [firebaseConfigured, user]);

  useEffect(() => {
    if (!firebaseConfigured || !user) return;
    return subscribeToTradeLedger(user.uid, setLedger);
  }, [firebaseConfigured, user]);

  const canUseFirebase = Boolean(firebaseConfigured && user);
  const projectedFee = positionSizeUsd * selectedPlan.feeRate;
  const activeProfile = canUseFirebase ? profile : null;
  const activeBots = canUseFirebase ? bots : [];
  const activeLedger = canUseFirebase ? ledger : [];

  async function runAction(action: () => Promise<unknown>, successMessage: string) {
    setIsBusy(true);
    setStatusMessage("");
    try {
      await action();
      setStatusMessage(successMessage);
      setStatusTone("success");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Something went wrong.");
      setStatusTone("error");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleEmailSubmit(mode: "login" | "register") {
    await runAction(
      async () => {
        if (mode === "register") await registerWithEmail(email, password);
        else await signInWithEmail(email, password);
      },
      mode === "register" ? "Account created successfully." : "Welcome back!"
    );
  }

  async function handleConnectExchange() {
    await runAction(async () => {
      if (!canUseFirebase) throw new Error("Sign in before storing exchange credentials.");
      await connectExchangeAccount(credentials);
    }, "Exchange credentials saved securely.");
  }

  async function handleCreateBot() {
    await runAction(async () => {
      if (selectedMarketSymbols.length === 0) throw new Error("Select at least one trading pair.");
      if (!canUseFirebase) throw new Error("Sign in with a real Firebase account first.");
      const draft: BotConfigurationDraft = {
        botType: selectedBotType,
        exchangeId: selectedExchangeId,
        marketSymbols: selectedMarketSymbols,
        positionSizeUsd,
      };
      await createBotInstance(draft);
    }, "Bot launched! Cloud Functions will start it after credential and wallet checks.");
  }

  async function handleTopUpRequest() {
    await runAction(async () => {
      if (!canUseFirebase || !user) throw new Error("Sign in before funding the wallet.");
      await requestFeeWalletTopUp(user.uid, topUpAmount);
    }, "Funding request recorded.");
  }

  const showLoginView = view === "full" || view === "login";
  const showDashboardView = view === "full" || view === "dashboard";
  const showSettingsView = view === "full" || view === "settings";

  return (
    <div className="app-shell">
      <div style={{ position: "relative", zIndex: 1 }}>

        {showLoginView && (
          <div style={sectionStyle}>
            <AuthSection
              email={email}
              password={password}
              isBusy={isBusy}
              firebaseConfigured={firebaseConfigured}
              statusMessage={statusMessage}
              statusTone={statusTone}
              onEmailChange={setEmail}
              onPasswordChange={setPassword}
              onGoogleSignIn={() => runAction(signInWithGoogle, "Signed in with Google.")}
              onEmailSubmit={handleEmailSubmit}
            />
          </div>
        )}

        {showDashboardView && (
          <div style={sectionStyle}>
            <DashboardSection
              bots={activeBots}
              ledger={activeLedger}
              walletBalance={activeProfile?.feeWalletBalance ?? 0}
            />
          </div>
        )}

        {showSettingsView && (
          <div style={sectionStyle}>
            <SettingsSection
              selectedBotType={selectedBotType}
              selectedExchangeId={selectedExchangeId}
              selectedMarketSymbols={selectedMarketSymbols}
              availableMarketSymbols={availableMarketSymbols}
              positionSizeUsd={positionSizeUsd}
              topUpAmount={topUpAmount}
              credentials={credentials}
              projectedFee={projectedFee}
              isBusy={isBusy}
              statusMessage={statusMessage}
              statusTone={statusTone}
              onBotTypeChange={setSelectedBotType}
              onExchangeChange={handleExchangeChange}
              onMarketSymbolsChange={setSelectedMarketSymbols}
              onPositionSizeChange={setPositionSizeUsd}
              onTopUpAmountChange={setTopUpAmount}
              onCredentialsChange={setCredentials}
              onConnectExchange={handleConnectExchange}
              onCreateBot={handleCreateBot}
              onTopUp={handleTopUpRequest}
            />
          </div>
        )}

        {/* Risk notice */}
        <div style={{ ...sectionStyle, paddingTop: 0 }}>
          <div
            style={{
              padding: "1rem 1.25rem",
              borderRadius: "var(--radius)",
              border: "1px solid var(--border)",
              background: "rgba(7,13,28,0.6)",
              fontSize: "0.8rem",
              lineHeight: 1.7,
              color: "var(--fg-3)",
            }}
          >
            <strong style={{ color: "var(--fg-2)" }}>Risk notice:</strong> This platform is a development scaffold,
            not financial advice. Futures trading and leverage can cause rapid losses. A production deployment
            requires exchange adapters, KMS-encrypted secrets, payment settlement, kill switches, and jurisdiction checks
            before any live trading.
          </div>
        </div>

      </div>
    </div>
  );
}

/* â”€â”€â”€ Auth section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function AuthSection({
  email, password, isBusy, firebaseConfigured,
  statusMessage, statusTone,
  onEmailChange, onPasswordChange, onGoogleSignIn, onEmailSubmit,
}: {
  email: string; password: string; isBusy: boolean; firebaseConfigured: boolean;
  statusMessage: string; statusTone: "success" | "error" | "info";
  onEmailChange: (v: string) => void; onPasswordChange: (v: string) => void;
  onGoogleSignIn: () => void; onEmailSubmit: (mode: "login" | "register") => Promise<void>;
}) {
  return (
    <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", alignItems: "start" }}>

      {/* Left: hero copy */}
      <div className="card-glow" style={{ padding: "clamp(1.5rem, 4vw, 2.5rem)" }}>
        <span className="badge badge-brand" style={{ marginBottom: "1.25rem", display: "inline-flex" }}>
          Cloud Functions \u00b7 Firebase
        </span>
        <h1
          className="text-gradient"
          style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)", fontWeight: 900, lineHeight: 1.18, marginBottom: "1rem", letterSpacing: "-0.02em" }}
        >
          Trade smarter. Pay less. Automate everything.
        </h1>
        <p style={{ fontSize: "0.9375rem", lineHeight: 1.75, color: "var(--fg-2)", marginBottom: "1.5rem" }}>
          Connect a futures exchange, pick your pairs, and let GridPilot run support/resistance or
          grid martingale bots 24/7. Only pay 2% when a trade closes.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
          {["Email + Google auth", "Encrypted API keys", "2% fee ledger"].map((item) => (
            <div
              key={item}
              style={{
                padding: "0.75rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                background: "rgba(7,13,28,0.6)",
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "var(--fg-2)",
                textAlign: "center",
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* Right: auth form */}
      <div className="card" style={{ padding: "clamp(1.5rem, 4vw, 2rem)" }}>
        <h2 style={{ fontSize: "1.375rem", fontWeight: 900, color: "var(--fg)", marginBottom: "0.375rem" }}>
          Trader access
        </h2>
        <p style={{ fontSize: "0.85rem", color: "var(--fg-2)", marginBottom: "1.5rem", lineHeight: 1.6 }}>
          Sign in to manage bots, wallet, and exchange settings.
        </p>

        {/* Google */}
        <button
          className="btn btn-secondary btn-full"
          style={{ marginBottom: "1rem", gap: "0.625rem", justifyContent: "center" }}
          disabled={isBusy || !firebaseConfigured}
          type="button"
          onClick={onGoogleSignIn}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.616z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "0 0 1rem" }}>
          <div className="divider" style={{ flex: 1, margin: 0 }} />
          <span style={{ fontSize: "0.75rem", color: "var(--fg-3)", fontWeight: 600 }}>or email</span>
          <div className="divider" style={{ flex: 1, margin: 0 }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
          <div>
            <label className="input-label">Email address</label>
            <input
              className="input-field"
              placeholder="you@example.com"
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
            />
          </div>
          <div>
            <label className="input-label">Password</label>
            <input
              className="input-field"
              placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
              type="password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <button
            className="btn btn-primary"
            disabled={isBusy || !firebaseConfigured}
            type="button"
            onClick={() => onEmailSubmit("login")}
          >
            {isBusy ? "\u2026" : "Sign in"}
          </button>
          <button
            className="btn btn-secondary"
            disabled={isBusy || !firebaseConfigured}
            type="button"
            onClick={() => onEmailSubmit("register")}
          >
            Create account
          </button>
        </div>

        {!firebaseConfigured && (
          <div
            style={{
              marginTop: "1rem",
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-sm)",
              background: "var(--amber-dim)",
              border: "1px solid rgba(251,191,36,0.25)",
              fontSize: "0.8rem",
              color: "var(--amber)",
            }}
          >
            Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* env vars to enable authentication.
          </div>
        )}

        <StatusMessage message={statusMessage} tone={statusTone} />
      </div>

    </div>
  );
}

/* â”€â”€â”€ Dashboard section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function DashboardSection({
  bots, ledger, walletBalance,
}: {
  bots: BotInstance[];
  ledger: TradeLedgerEntry[];
  walletBalance: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* Page header */}
      <div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 900, color: "var(--fg)", marginBottom: "0.25rem" }}>Dashboard</h1>
        <p style={{ fontSize: "0.875rem", color: "var(--fg-2)" }}>Monitor bots, track fees, and review trade history.</p>
      </div>

      {/* Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "1rem" }}>
        <MetricCard
          icon={<IconWallet size={20} />}
          label="Fee wallet"
          value={formatCurrency(walletBalance)}
          sub="Available balance"
          tone="green"
        />
        <MetricCard
          icon={<IconBot size={20} />}
          label="Active bots"
          value={String(bots.length)}
          sub="Running / pending"
          tone="brand"
        />
        <MetricCard
          icon={<IconTrendUp size={20} />}
          label="Trade fee"
          value="2%"
          sub="Per completed trade"
          tone="amber"
        />
        <MetricCard
          icon={<IconList size={20} />}
          label="Ledger entries"
          value={String(ledger.length)}
          sub="Total recorded trades"
          tone="purple"
        />
      </div>

      {/* Bot list */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontWeight: 900, fontSize: "1rem", color: "var(--fg)" }}>Active bots</h2>
          <span className="badge badge-brand">{bots.length} total</span>
        </div>

        {bots.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.75rem", color: "var(--fg-3)" }}><IconBot size={40} /></div>
            <p style={{ fontWeight: 700, color: "var(--fg)", marginBottom: "0.375rem" }}>No bots yet</p>
            <p style={{ fontSize: "0.85rem", color: "var(--fg-2)" }}>
              Head to <strong>Settings</strong> to configure and launch your first bot.
            </p>
          </div>
        ) : (
          <div>
            {bots.map((bot) => {
              const exchange = getExchangeById(bot.exchangeId);
              const plan = botPlans.find((p) => p.type === bot.type);
              const status = bot.status.replaceAll("_", " ");
              const isActive = bot.status === "active";
              const isPending = bot.status === "pending_credentials" || bot.status === "draft";

              return (
                <div
                  key={bot.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    alignItems: "center",
                    padding: "1rem 1.5rem",
                    borderBottom: "1px solid var(--border)",
                    gap: "1rem",
                    transition: "background 120ms",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.25rem" }}>
                      <span
                        className={`status-dot ${isActive ? "active" : isPending ? "pending" : "stopped"}`}
                      />
                      <p style={{ fontWeight: 800, fontSize: "0.9375rem", color: "var(--fg)" }}>
                        {plan?.name ?? bot.type}
                      </p>
                    </div>
                    <p style={{ fontSize: "0.8rem", color: "var(--fg-2)" }}>
                      {exchange?.name ?? bot.exchangeId}
                      {"\u00b7"}&nbsp;
                      {(bot.marketSymbols ?? []).slice(0, 4).join(", ")}
                      {(bot.marketSymbols?.length ?? 0) > 4 && ` +${(bot.marketSymbols?.length ?? 0) - 4} more`}
                      &nbsp;{"\u00b7"}&nbsp;
                      {formatCurrency(bot.positionSizeUsd)} position
                    </p>
                  </div>
                  <span
                    className={`badge ${isActive ? "badge-green" : isPending ? "badge-amber" : "badge-brand"}`}
                  >
                    {status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Fee ledger */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontWeight: 900, fontSize: "1rem", color: "var(--fg)" }}>Fee ledger</h2>
          <span className="badge badge-amber">{ledger.length} entries</span>
        </div>

        {ledger.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.75rem", color: "var(--fg-3)" }}><IconList size={40} /></div>
            <p style={{ fontWeight: 700, color: "var(--fg)", marginBottom: "0.375rem" }}>No trades yet</p>
            <p style={{ fontSize: "0.85rem", color: "var(--fg-2)" }}>Completed trades will appear here with fee breakdowns.</p>
          </div>
        ) : (
          <div>
            {/* Table header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1.2fr 0.8fr 0.8fr",
                padding: "0.625rem 1.5rem",
                borderBottom: "1px solid var(--border)",
                fontSize: "0.7rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--fg-3)",
              }}
            >
              <span>Pair</span>
              <span>Side / Outcome</span>
              <span>Fee</span>
              <span>Balance after</span>
            </div>
            {ledger.map((entry) => (
              <div
                key={entry.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1.2fr 0.8fr 0.8fr",
                  padding: "0.875rem 1.5rem",
                  borderBottom: "1px solid var(--border)",
                  fontSize: "0.875rem",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <span style={{ fontWeight: 700, color: "var(--fg)" }}>{entry.marketSymbol}</span>
                <span style={{ color: "var(--fg-2)", textTransform: "capitalize" }}>{entry.side} {"\u00b7"} {entry.outcome}</span>
                <span style={{ color: "var(--amber)", fontWeight: 700 }}>{formatCurrency(entry.feeCharged)}</span>
                <span style={{ color: "var(--fg-2)" }}>{formatCurrency(entry.walletBalanceAfter)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

/* â”€â”€â”€ Settings section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function SettingsSection({
  selectedBotType, selectedExchangeId, selectedMarketSymbols, availableMarketSymbols,
  positionSizeUsd, topUpAmount, credentials, projectedFee, isBusy,
  statusMessage, statusTone,
  onBotTypeChange, onExchangeChange, onMarketSymbolsChange,
  onPositionSizeChange, onTopUpAmountChange, onCredentialsChange,
  onConnectExchange, onCreateBot, onTopUp,
}: {
  selectedBotType: BotType; selectedExchangeId: ExchangeId;
  selectedMarketSymbols: string[]; availableMarketSymbols: string[];
  positionSizeUsd: number; topUpAmount: number;
  credentials: ExchangeCredentialDraft; projectedFee: number; isBusy: boolean;
  statusMessage: string; statusTone: "success" | "error" | "info";
  onBotTypeChange: (t: BotType) => void; onExchangeChange: (id: ExchangeId) => void;
  onMarketSymbolsChange: (s: string[]) => void; onPositionSizeChange: (n: number) => void;
  onTopUpAmountChange: (n: number) => void; onCredentialsChange: (c: ExchangeCredentialDraft) => void;
  onConnectExchange: () => Promise<void>; onCreateBot: () => Promise<void>; onTopUp: () => Promise<void>;
}) {
  const selectedExchange = getExchangeById(selectedExchangeId) ?? supportedExchanges[0];
  const selectedPlan = botPlans.find((p) => p.type === selectedBotType) ?? botPlans[0];

  function toggleSymbol(symbol: string) {
    if (selectedMarketSymbols.includes(symbol)) {
      onMarketSymbolsChange(selectedMarketSymbols.filter((s) => s !== symbol));
    } else {
      onMarketSymbolsChange([...selectedMarketSymbols, symbol]);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

      {/* Page header */}
      <div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 900, color: "var(--fg)", marginBottom: "0.25rem" }}>Settings</h1>
        <p style={{ fontSize: "0.875rem", color: "var(--fg-2)" }}>Configure your strategy, exchange, pairs, and launch bots.</p>
      </div>

      {/* Step 1 â€” Strategy */}
      <SettingsBlock
        step="01"
        title="Choose strategy"
        desc="Select the trading algorithm your bot will use."
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "0.875rem" }}>
          {botPlans.map((plan) => (
            <button
              key={plan.type}
              type="button"
              onClick={() => onBotTypeChange(plan.type)}
              style={{
                padding: "1.25rem",
                borderRadius: "var(--radius)",
                border: `1px solid ${selectedBotType === plan.type ? "rgba(56,189,248,0.5)" : "var(--border)"}`,
                background: selectedBotType === plan.type ? "var(--brand-dim)" : "rgba(7,13,28,0.6)",
                textAlign: "left",
                cursor: "pointer",
                transition: "all 160ms",
              }}
            >
              <p style={{ fontWeight: 800, fontSize: "0.9375rem", color: selectedBotType === plan.type ? "var(--brand)" : "var(--fg)", marginBottom: "0.375rem" }}>
                {plan.name}
              </p>
              <p style={{ fontSize: "0.8rem", color: "var(--fg-2)", lineHeight: 1.6, marginBottom: "0.75rem" }}>
                {plan.summary}
              </p>
              <span className="badge badge-green" style={{ fontSize: "0.68rem" }}>
                2% fee only · no subscription
              </span>
            </button>
          ))}
        </div>
      </SettingsBlock>

      {/* Step 2 â€” Exchange + sizing */}
      <SettingsBlock
        step="02"
        title="Exchange & sizing"
        desc="Choose your futures exchange and position size."
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.875rem" }}>
          <div>
            <label className="input-label">Futures exchange</label>
            <select
              className="input-field"
              value={selectedExchangeId}
              onChange={(e) => onExchangeChange(e.target.value as ExchangeId)}
            >
              {supportedExchanges.map((ex) => (
                <option key={ex.id} value={ex.id}>{ex.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label">Position size (USD)</label>
            <input
              className="input-field"
              type="number"
              min={10}
              value={positionSizeUsd}
              onChange={(e) => onPositionSizeChange(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="input-label">Wallet top-up (USD)</label>
            <input
              className="input-field"
              type="number"
              min={1}
              value={topUpAmount}
              onChange={(e) => onTopUpAmountChange(Number(e.target.value))}
            />
          </div>
        </div>

        {/* Exchange info strip */}
        <div
          style={{
            marginTop: "0.875rem",
            padding: "0.875rem 1rem",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            background: "rgba(7,13,28,0.5)",
            fontSize: "0.8rem",
            color: "var(--fg-2)",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            alignItems: "center",
          }}
        >
          <span style={{ fontWeight: 700, color: "var(--fg)" }}>{selectedExchange.name}</span>
          <span>{"\u00b7"}</span>
          <span>{selectedExchange.regionNote}</span>
          <span>{"\u00b7"}</span>
          <span style={{ color: "var(--amber)", fontWeight: 700 }}>
            Projected fee: {formatCurrency(projectedFee)} per trade
          </span>
        </div>
        <p style={{ marginTop: "0.5rem", fontSize: "0.78rem", color: "var(--fg-3)", lineHeight: 1.6 }}>
          {selectedPlan.riskWarning}
        </p>
      </SettingsBlock>

      {/* Step 3 â€” Trading pairs */}
      <SettingsBlock
        step="03"
        title="Trading pairs"
        desc={`Top 100 USDT perps filtered for ${selectedExchange.name}. ${selectedMarketSymbols.length} selected.`}
      >
        <div
          style={{
            maxHeight: "16rem",
            overflowY: "auto",
            padding: "0.75rem",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            background: "rgba(4,6,15,0.5)",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.45rem",
          }}
        >
          {availableMarketSymbols.map((symbol) => {
            const on = selectedMarketSymbols.includes(symbol);
            return (
              <button
                key={symbol}
                type="button"
                className={`pair-chip${on ? " selected" : ""}`}
                onClick={() => toggleSymbol(symbol)}
              >
                {on && <IconCheck size={12} style={{ color: "var(--brand)", flexShrink: 0 }} />}
                {symbol.replace("USDT", "")}
                <span style={{ opacity: 0.5, fontSize: "0.65rem" }}>USDT</span>
              </button>
            );
          })}
        </div>
        <p style={{ marginTop: "0.5rem", fontSize: "0.78rem", color: "var(--fg-3)" }}>
          {selectedMarketSymbols.length === 0
            ? "No pairs selected \u2014 you must pick at least one."
            : `Selected: ${selectedMarketSymbols.join(", ")}`}
        </p>
      </SettingsBlock>

      {/* Step 4 â€” API credentials */}
      <SettingsBlock
        step="04"
        title="API credentials"
        desc={`Enter your ${selectedExchange.name} API key. Keys are routed through Cloud Functions \u2014 never stored client-side.`}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {selectedExchange.credentialFields.map((field) => (
            <div key={field.key}>
              <label className="input-label">
                {field.label}
                {field.required && <span style={{ color: "var(--red)", marginLeft: "0.25rem" }}>*</span>}
              </label>
              <input
                className="input-field"
                placeholder={field.label}
                type={field.secret ? "password" : "text"}
                value={credentials[field.key]}
                onChange={(e) => onCredentialsChange({ ...credentials, [field.key]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <div style={{ marginTop: "1rem" }}>
          <button
            className="btn btn-secondary"
            disabled={isBusy}
            type="button"
            onClick={onConnectExchange}
          >
            {isBusy ? "Saving\u2026" : "Save API key"}
          </button>
        </div>
      </SettingsBlock>

      {/* Step 5 â€” Launch */}
      <SettingsBlock
        step="05"
        title="Fund & launch"
        desc="Top up your fee wallet and start the bot."
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          <button className="btn btn-secondary" disabled={isBusy} type="button" onClick={onTopUp}>
            {isBusy ? "…" : "Fund wallet"}
          </button>
          <button className="btn btn-primary" disabled={isBusy} type="button" onClick={onCreateBot}>
            {isBusy ? "Launching…" : <><IconRocket size={15} style={{ verticalAlign: "middle", marginRight: "0.375rem" }} />Start bot</>}
          </button>
        </div>
        <StatusMessage message={statusMessage} tone={statusTone} />
      </SettingsBlock>

      {/* Exchange catalog */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <h2 style={{ fontWeight: 900, fontSize: "1rem", color: "var(--fg)" }}>Supported exchanges</h2>
            <p style={{ fontSize: "0.8rem", color: "var(--fg-2)", marginTop: "0.2rem" }}>Futures API integrations planned.</p>
          </div>
          <span className="badge badge-brand">{supportedExchanges.length} planned</span>
        </div>
        <div style={{ padding: "1rem", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.875rem" }}>
          {supportedExchanges.map((ex) => (
            <div
              key={ex.id}
              style={{
                padding: "1rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                background: "rgba(7,13,28,0.5)",
                transition: "border-color 160ms",
              }}
            >
              <p style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--fg)", marginBottom: "0.375rem" }}>{ex.name}</p>
              <p style={{ fontSize: "0.75rem", color: "var(--fg-2)", lineHeight: 1.6, marginBottom: "0.625rem" }}>
                {ex.futuresProducts.join(", ")}
              </p>
              <a
                href={ex.apiDocsUrl}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--brand)", textDecoration: "none" }}
              >
                API docs â†’
              </a>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

/* â”€â”€â”€ SettingsBlock wrapper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function SettingsBlock({
  step, title, desc, children,
}: {
  step: string; title: string; desc: string; children: React.ReactNode;
}) {
  return (
    <div className="card" style={{ padding: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        <span
          style={{
            width: "2rem",
            height: "2rem",
            borderRadius: "0.625rem",
            background: "linear-gradient(135deg, #0ea5e9, #34d399)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.7rem",
            fontWeight: 900,
            color: "#01080f",
            flexShrink: 0,
          }}
        >
          {step}
        </span>
        <div>
          <h2 style={{ fontWeight: 900, fontSize: "1.0625rem", color: "var(--fg)", lineHeight: 1.2 }}>{title}</h2>
          <p style={{ fontSize: "0.825rem", color: "var(--fg-2)", marginTop: "0.25rem", lineHeight: 1.5 }}>{desc}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

/* â”€â”€â”€ MetricCard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function MetricCard({
  icon, label, value, sub, tone,
}: {
  icon: React.ReactNode; label: string; value: string; sub: string;
  tone: "brand" | "green" | "amber" | "purple";
}) {
  const toneMap = {
    brand:  { text: "var(--brand)",  bg: "var(--brand-dim)",  border: "rgba(56,189,248,0.2)" },
    green:  { text: "var(--green)",  bg: "var(--green-dim)",  border: "rgba(52,211,153,0.2)" },
    amber:  { text: "var(--amber)",  bg: "var(--amber-dim)",  border: "rgba(251,191,36,0.2)" },
    purple: { text: "var(--purple)", bg: "var(--purple-dim)", border: "rgba(167,139,250,0.2)" },
  }[tone];

  return (
    <div
      className="stat-card"
      style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}
    >
      <div
        className="feature-icon"
        style={{ background: toneMap.bg, border: `1px solid ${toneMap.border}`, flexShrink: 0 }}
      >
        {icon}
      </div>
      <div>
        <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-3)", marginBottom: "0.25rem" }}>
          {label}
        </p>
        <p style={{ fontSize: "1.625rem", fontWeight: 900, color: toneMap.text, lineHeight: 1 }}>{value}</p>
        <p style={{ fontSize: "0.75rem", color: "var(--fg-2)", marginTop: "0.25rem" }}>{sub}</p>
      </div>
    </div>
  );
}

/* â”€â”€â”€ StatusMessage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function StatusMessage({ message, tone }: { message: string; tone: "success" | "error" | "info" }) {
  if (!message) return null;

  const styles = {
    success: { bg: "var(--green-dim)",  border: "rgba(52,211,153,0.25)",  text: "var(--green)" },
    error:   { bg: "var(--red-dim)",    border: "rgba(248,113,113,0.25)", text: "var(--red)"   },
    info:    { bg: "var(--brand-dim)",  border: "rgba(56,189,248,0.25)",  text: "var(--brand)" },
  }[tone];

  return (
    <div
      style={{
        marginTop: "1rem",
        padding: "0.75rem 1rem",
        borderRadius: "var(--radius-sm)",
        background: styles.bg,
        border: `1px solid ${styles.border}`,
        fontSize: "0.85rem",
        color: styles.text,
        fontWeight: 600,
      }}
    >
      {tone === "success" && "OK: "}
      {tone === "error" && "Error: "}
      {message}
    </div>
  );
}
