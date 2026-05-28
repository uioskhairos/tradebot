import Link from "next/link";
import { IconBarChart, IconBot, IconCircleDot, IconCreditCard, IconLock, IconSmartphone, IconZap } from "./_components/icons";

const stats = [
  { value: "2%", label: "Fee per trade", desc: "No monthly subscription" },
  { value: "10+", label: "Exchanges", desc: "Top futures markets" },
  { value: "100", label: "Trading pairs", desc: "Top USDT perpetuals" },
  { value: "24/7", label: "Automated", desc: "Cloud Functions execution" },
];

const features = [
  {
    icon: <IconLock size={22} />,
    title: "Secure Authentication",
    desc: "Email/password and Google sign-in backed by Firebase Authentication. Your exchange API keys are routed through Cloud Functions—never stored client-side.",
    accent: "brand",
  },
  {
    icon: <IconBarChart size={22} />,
    title: "Live Dashboard",
    desc: "Real-time bot status, fee ledger, and wallet balance sourced from Firestore. See every trade, fee deduction, and outcome streamed to your screen.",
    accent: "green",
  },
  {
    icon: <IconZap size={22} />,
    title: "Multi-Pair Selection",
    desc: "Choose from the top 100 USDT perpetual pairs filtered by your exchange. Run support/resistance or hedged grid martingale strategies simultaneously.",
    accent: "amber",
  },
  {
    icon: <IconBot size={22} />,
    title: "Cloud Execution",
    desc: "Bots run inside Firebase Cloud Functions—isolated, serverless, always-on. Auto-stop safeguards protect your wallet when fee balance runs low.",
    accent: "purple",
  },
  {
    icon: <IconCreditCard size={22} />,
    title: "Pay-per-Trade",
    desc: "Fund a fee wallet once. Each completed trade deducts 2% of your position size. No recurring charges, no lock-in—top up only when you need to.",
    accent: "green",
  },
  {
    icon: <IconSmartphone size={22} />,
    title: "Mobile Ready",
    desc: "Fully responsive interface built for phones and tablets. Monitor bots, check your ledger, and adjust settings from any device.",
    accent: "brand",
  },
];

const steps = [
  { num: "01", title: "Create account", desc: "Sign up with email or Google in seconds." },
  { num: "02", title: "Connect exchange", desc: "Add your API key via our secure Cloud Functions endpoint." },
  { num: "03", title: "Configure bot", desc: "Pick pairs, strategy, and position size." },
  { num: "04", title: "Fund wallet", desc: "Deposit USDT to cover the 2% per-trade fee." },
  { num: "05", title: "Go live", desc: "Hit Start and let the bot trade around the clock." },
];

const accentColors: Record<string, { bg: string; text: string; border: string }> = {
  brand:  { bg: "var(--brand-dim)",  text: "var(--brand)",  border: "rgba(56,189,248,0.25)" },
  green:  { bg: "var(--green-dim)",  text: "var(--green)",  border: "rgba(52,211,153,0.25)" },
  amber:  { bg: "var(--amber-dim)",  text: "var(--amber)",  border: "rgba(251,191,36,0.25)"  },
  purple: { bg: "var(--purple-dim)", text: "var(--purple)", border: "rgba(167,139,250,0.25)" },
};

export default function Home() {
  return (
    <div className="app-shell">
      <div style={{ position: "relative", zIndex: 1 }}>

        {/* ─── Hero ─────────────────────────────────────────── */}
        <section
          style={{
            maxWidth: "80rem",
            margin: "0 auto",
            padding: "5rem 1.25rem 3rem",
          }}
        >
          <div style={{ maxWidth: "54rem" }}>
            <span
              className="badge badge-brand animate-fade-up"
              style={{ marginBottom: "1.5rem", display: "inline-flex" }}
            >
              <IconCircleDot size={10} style={{ color: "var(--green)", verticalAlign: "middle" }} />
              &nbsp;Cloud Functions · Firebase · Bybit &amp; 9 more exchanges
            </span>

            <h1
              className="text-gradient animate-fade-up animate-delay-1"
              style={{
                fontSize: "clamp(2.25rem, 6vw, 4.25rem)",
                fontWeight: 900,
                lineHeight: 1.12,
                letterSpacing: "-0.03em",
                marginBottom: "1.5rem",
              }}
            >
              The smarter way to run futures bots.
            </h1>

            <p
              className="animate-fade-up animate-delay-2"
              style={{
                fontSize: "clamp(1rem, 2.5vw, 1.2rem)",
                lineHeight: 1.75,
                color: "var(--fg-2)",
                maxWidth: "42rem",
                marginBottom: "2.5rem",
              }}
            >
              GridPilot automates support/resistance and hedged grid strategies across the top futures exchanges.
              Pay only&nbsp;<strong style={{ color: "var(--green)" }}>2% per completed trade</strong> — no subscription, no lock-in.
            </p>

            <div
              className="animate-fade-up animate-delay-3"
              style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}
            >
              <Link className="btn btn-primary btn-lg" href="/dashboard">
                Open Dashboard →
              </Link>
              <Link className="btn btn-secondary btn-lg" href="/login">
                Get started free
              </Link>
            </div>
          </div>
        </section>

        {/* ─── Stats bar ──────────────────────────────────────── */}
        <section
          style={{
            maxWidth: "80rem",
            margin: "0 auto 3.5rem",
            padding: "0 1.25rem",
          }}
        >
          <div
            className="card"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "0",
              overflow: "hidden",
            }}
          >
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                style={{
                  padding: "1.5rem",
                  borderRight: i < stats.length - 1 ? "1px solid var(--border)" : "none",
                  textAlign: "center",
                }}
              >
                <p
                  className="text-gradient"
                  style={{ fontSize: "2rem", fontWeight: 900, lineHeight: 1 }}
                >
                  {stat.value}
                </p>
                <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--fg)", marginTop: "0.5rem" }}>
                  {stat.label}
                </p>
                <p style={{ fontSize: "0.75rem", color: "var(--fg-3)", marginTop: "0.25rem" }}>
                  {stat.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Features grid ──────────────────────────────────── */}
        <section
          style={{
            maxWidth: "80rem",
            margin: "0 auto 4rem",
            padding: "0 1.25rem",
          }}
        >
          <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--brand)", marginBottom: "0.75rem" }}>
            Platform capabilities
          </p>
          <h2
            style={{ fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)", fontWeight: 900, color: "var(--fg)", marginBottom: "2rem", maxWidth: "34rem", lineHeight: 1.25 }}
          >
            Everything you need to trade smarter
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "1rem",
            }}
          >
            {features.map((f) => {
              const colors = accentColors[f.accent];
              return (
                <div
                  key={f.title}
                  className="card"
                  style={{ padding: "1.5rem" }}
                >
                  <div
                    className="feature-icon"
                    style={{
                      background: colors.bg,
                      border: `1px solid ${colors.border}`,
                      marginBottom: "1rem",
                    }}
                  >
                    {f.icon}
                  </div>
                  <h3
                    style={{ fontSize: "1rem", fontWeight: 800, color: "var(--fg)", marginBottom: "0.5rem" }}
                  >
                    {f.title}
                  </h3>
                  <p style={{ fontSize: "0.875rem", lineHeight: 1.7, color: "var(--fg-2)" }}>
                    {f.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ─── How it works ───────────────────────────────────── */}
        <section
          style={{
            maxWidth: "80rem",
            margin: "0 auto 4rem",
            padding: "0 1.25rem",
          }}
        >
          <div
            className="card-glow"
            style={{ padding: "clamp(1.5rem, 4vw, 3rem)" }}
          >
            <p style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--brand)", marginBottom: "0.75rem" }}>
              Get started in minutes
            </p>
            <h2
              style={{ fontSize: "clamp(1.5rem, 3.5vw, 2rem)", fontWeight: 900, color: "var(--fg)", marginBottom: "2.5rem" }}
            >
              From zero to live bot in 5 steps
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: "1.5rem",
              }}
            >
              {steps.map((step, i) => (
                <div key={step.num} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span
                      style={{
                        width: "2rem",
                        height: "2rem",
                        borderRadius: "0.625rem",
                        background: i === 0
                          ? "linear-gradient(135deg, #0ea5e9, #34d399)"
                          : "var(--surface-hi)",
                        border: i === 0 ? "none" : "1px solid var(--border-hi)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.7rem",
                        fontWeight: 900,
                        color: i === 0 ? "#01080f" : "var(--fg-2)",
                        flexShrink: 0,
                      }}
                    >
                      {step.num}
                    </span>
                    {i < steps.length - 1 && (
                      <div
                        style={{
                          flex: 1,
                          height: "1px",
                          background: "var(--border)",
                        }}
                      />
                    )}
                  </div>
                  <p style={{ fontWeight: 800, fontSize: "0.9375rem", color: "var(--fg)" }}>{step.title}</p>
                  <p style={{ fontSize: "0.8rem", color: "var(--fg-2)", lineHeight: 1.6 }}>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA ────────────────────────────────────────────── */}
        <section
          style={{
            maxWidth: "80rem",
            margin: "0 auto 5rem",
            padding: "0 1.25rem",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, rgba(14,165,233,0.12), rgba(52,211,153,0.06))",
              border: "1px solid rgba(14,165,233,0.2)",
              borderRadius: "var(--radius-xl)",
              backdropFilter: "blur(20px)",
              padding: "clamp(2rem, 5vw, 3.5rem)",
              textAlign: "center",
            }}
          >
            <h2
              className="text-gradient"
              style={{
                fontSize: "clamp(1.75rem, 4vw, 2.75rem)",
                fontWeight: 900,
                marginBottom: "1rem",
              }}
            >
              Ready to automate your trading?
            </h2>
            <p style={{ color: "var(--fg-2)", fontSize: "1.0625rem", marginBottom: "2rem", maxWidth: "36rem", margin: "0 auto 2rem" }}>
              No monthly fees. No setup cost. Connect your exchange, configure your strategy, and let GridPilot handle the rest.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", justifyContent: "center" }}>
              <Link className="btn btn-primary btn-lg" href="/login">
                Create free account
              </Link>
              <Link className="btn btn-secondary btn-lg" href="/settings">
                View settings
              </Link>
            </div>
          </div>
        </section>

        {/* ─── Footer note ────────────────────────────────────── */}
        <footer
          style={{
            maxWidth: "80rem",
            margin: "0 auto",
            padding: "0 1.25rem 2.5rem",
            borderTop: "1px solid var(--border)",
            paddingTop: "1.5rem",
          }}
        >
          <p style={{ fontSize: "0.78rem", color: "var(--fg-3)", lineHeight: 1.7, maxWidth: "56rem" }}>
            <strong style={{ color: "var(--fg-2)" }}>Risk notice:</strong> Futures trading, leverage, and automated strategies can result in rapid losses exceeding your deposit.
            This platform is a scaffold for development purposes. Do not use real funds without proper exchange adapters, encrypted secret storage, kill switches, audit logs, and jurisdictional checks in place.
          </p>
        </footer>

      </div>
    </div>
  );
}
