import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/https";
import { onSchedule } from "firebase-functions/scheduler";

initializeApp();

const db = getFirestore();
const tradeFeeRate = 0.02;

interface CreateBotRequest {
  botType: "support-resistance" | "grid-martingale";
  exchangeId: string;
  marketSymbols: string[];
  positionSizeUsd: number;
}

interface ExchangeCredentialRequest {
  apiKey?: string;
  apiSecret?: string;
  passphrase?: string;
  accountId?: string;
}

export const connectExchangeAccount = onCall<ExchangeCredentialRequest>(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const apiKey = requireString(request.data.apiKey, "apiKey");
  const apiSecret = requireString(request.data.apiSecret, "apiSecret");

  // Production requirement: encrypt apiKey/apiSecret/passphrase with Cloud KMS or Secret Manager.
  // This scaffold stores only metadata and a masked key marker to avoid client-readable raw secrets.
  await db.collection("users").doc(uid).collection("exchangeAccounts").doc("primary").set(
    {
      keyPreview: maskSecret(apiKey),
      hasSecret: Boolean(apiSecret),
      hasPassphrase: Boolean(request.data.passphrase),
      accountId: request.data.accountId ?? null,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { ok: true };
});

export const createBotInstance = onCall<CreateBotRequest>(async (request) => {
  const uid = requireUid(request.auth?.uid);
  const marketSymbols = requireStringArray(request.data.marketSymbols, "marketSymbols");
  const positionSizeUsd = Number(request.data.positionSizeUsd);

  if (!Number.isFinite(positionSizeUsd) || positionSizeUsd < 10) {
    throw new HttpsError("invalid-argument", "positionSizeUsd must be at least 10.");
  }

  const userRef = db.collection("users").doc(uid);
  const botRef = userRef.collection("botInstances").doc();

  await db.runTransaction(async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    const feeWalletBalance = Number(userSnapshot.get("feeWalletBalance") ?? 0);
    const status = feeWalletBalance > 0 ? "pending_credentials" : "stopped_insufficient_balance";

    transaction.set(botRef, {
      uid,
      type: request.data.botType,
      exchangeId: requireString(request.data.exchangeId, "exchangeId"),
      marketSymbols,
      marketSymbol: marketSymbols[0],
      status,
      positionSizeUsd,
      feeRate: tradeFeeRate,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return { botId: botRef.id };
});

export const runTradingBots = onSchedule("every 1 minutes", async () => {
  // Production adapter responsibilities:
  // 1. Load active bot configs and encrypted exchange credentials.
  // 2. Call exchange futures APIs with rate-limit and retry controls.
  // 3. Apply support/resistance or grid martingale strategy rules.
  // 4. Record every completed trade and deduct 2% of position size from fee wallet.
  // 5. Stop a bot when wallet balance is zero or below.
  const activeBots = await db.collectionGroup("botInstances").where("status", "==", "active").limit(50).get();

  for (const botSnapshot of activeBots.docs) {
    const bot = botSnapshot.data();
    const uid = String(bot.uid);
    const positionSizeUsd = Number(bot.positionSizeUsd ?? 0);
    const feeCharged = roundMoney(positionSizeUsd * tradeFeeRate);
    const userRef = db.collection("users").doc(uid);

    await db.runTransaction(async (transaction) => {
      const userSnapshot = await transaction.get(userRef);
      const balance = Number(userSnapshot.get("feeWalletBalance") ?? 0);

      if (balance <= 0 || balance < feeCharged) {
        transaction.update(botSnapshot.ref, {
          status: "stopped_insufficient_balance",
          updatedAt: FieldValue.serverTimestamp(),
        });
        return;
      }

      // Placeholder: deduct only after a real exchange adapter confirms a completed trade.
      const walletBalanceAfter = roundMoney(balance - feeCharged);
      transaction.update(userRef, {
        feeWalletBalance: walletBalanceAfter,
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.create(userRef.collection("tradeLedger").doc(), {
        botId: botSnapshot.id,
        uid,
        exchangeId: bot.exchangeId,
        marketSymbol: bot.marketSymbol,
        side: "long",
        outcome: "breakeven",
        positionSizeUsd,
        feeCharged,
        walletBalanceAfter,
        executedAt: FieldValue.serverTimestamp(),
      });
    });
  }
});

function requireUid(uid: string | undefined) {
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }

  return uid;
}

function requireString(value: unknown, fieldName: string) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpsError("invalid-argument", `${fieldName} is required.`);
  }

  return value.trim();
}

function maskSecret(value: string) {
  return value.length <= 8 ? "********" : `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function requireStringArray(value: unknown, fieldName: string) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new HttpsError("invalid-argument", `${fieldName} must include at least one value.`);
  }

  const normalized = value
    .map((item) => (typeof item === "string" ? item.trim().toUpperCase() : ""))
    .filter((item) => item.length > 0);

  if (normalized.length === 0) {
    throw new HttpsError("invalid-argument", `${fieldName} must include at least one valid symbol.`);
  }

  return Array.from(new Set(normalized));
}